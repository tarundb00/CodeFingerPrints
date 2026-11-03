import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaGithub, FaCodeBranch, FaPlus, FaSync, FaCheckCircle,
  FaTimes, FaExclamationTriangle, FaEye, FaShieldAlt,
  FaArrowRight, FaSpinner, FaLock, FaUnlock, FaSearch,
  FaChevronDown, FaChevronUp, FaGitAlt,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import {
  fetchProjects, listBranches, getBranchAssignments,
  setupBranches, listPullRequests, mergePullRequest,
  rejectPullRequest, protectMainBranch, compareBranch,
  getBranchCommits,
} from '../services/api';
import './GitHubWorkflow.css';
import { buildGitHubRepoUrl, buildGitHubCloneUrl } from '../utils/githubRepo';

const STATUS_CFG = {
  active:    { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)',   label: 'Active'     },
  pr_open:   { color: '#6675ff', bg: 'rgba(102,117,255,0.12)', label: 'PR Open'    },
  merged:    { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)',  label: 'Merged'     },
  rejected:  { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)',   label: 'Rejected'   },
  conflict:  { color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  label: 'Conflict'   },
};

const PR_STATE_CFG = {
  open:   { color: '#2ecc71', label: 'Open'   },
  closed: { color: '#e05c5c', label: 'Closed' },
  merged: { color: '#8c4fff', label: 'Merged' },
};

export default function GitHubWorkflow() {
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [projects, setProjects]         = useState([]);
  const [selectedProject, setSelected] = useState(null);
  const [branches, setBranches]         = useState([]);
  const [assignments, setAssignments]   = useState([]);
  const [prs, setPrs]                   = useState([]);
  const [prTab, setPrTab]               = useState('open');
  const [loading, setLoading]           = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [expandedBranch, setExpanded]   = useState(null);
  const [branchCommits, setBranchCommits] = useState({});
  const [branchDiff, setBranchDiff]     = useState({});
  const [search, setSearch]             = useState('');
  const [merging, setMerging]           = useState(null);
  const [rejecting, setRejecting]       = useState(null);
  const [githubError, setGithubError]   = useState(null);

  useEffect(() => {
    fetchProjects()
      .then(d => { setProjects(d || []); if (d?.length) setSelected(d[0]); })
      .catch(() => toast.error('Failed to load projects'));
  }, []);

  const loadData = useCallback(async (project) => {
    if (!project) return;
    setLoading(true);
    setGithubError(null);
    try {
      const [b, a, p] = await Promise.all([
        listBranches(project.id).catch(e => { throw e; }),
        getBranchAssignments(project.id).catch(() => []),
        listPullRequests(project.id, prTab).catch(() => []),
      ]);
      setBranches(b || []);
      setAssignments(a || []);
      setPrs(p || []);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('No active GitHub config') || msg.includes('GitHub config')) {
        setGithubError('no_config');
      } else if (msg.includes('not found on GitHub') || msg.includes('repo not found') || msg.includes('Project or repo') || msg.includes('404')) {
        setGithubError('no_repo');
      } else if (msg.includes('authentication failed') || msg.includes('401') || msg.includes('403')) {
        setGithubError('bad_token');
      } else {
        setGithubError(msg || 'GitHub error');
      }
    } finally {
      setLoading(false);
    }
  }, [prTab]);

  useEffect(() => { loadData(selectedProject); }, [selectedProject, loadData]);

  const handleSetupBranches = async () => {
    if (!selectedProject) return;
    setSetupLoading(true);
    setGithubError(null);
    try {
      const result = await setupBranches(selectedProject.id);
      const createdCount = result?.created?.length || 0;
      const skippedCount = result?.skipped?.length || 0;
      const grantedCount = result?.permissionsGranted?.length || 0;
      const alreadyCount = result?.permissionsAlreadyGranted?.length || 0;

      if (grantedCount > 0) {
        toast.success(`Sent GitHub write/push collaborator invitations to ${grantedCount} student(s)!`);
      }
      if (createdCount > 0) {
        toast.success(result?.message || `Created ${createdCount} student branch${createdCount > 1 ? 'es' : ''}.`);
      } else if (skippedCount > 0 && grantedCount === 0) {
        toast.info(`Branches are up to date. ${alreadyCount} student(s) already have collaborator push permissions.`);
      } else if (grantedCount === 0) {
        toast.info(result?.message || 'Branch setup completed.');
      }
      loadData(selectedProject);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('No active GitHub config') || msg.includes('GitHub config')) {
        setGithubError('no_config');
      } else {
        toast.error(msg || 'Failed to setup branches');
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleProtectMain = async () => {
    try {
      const r = await protectMainBranch(selectedProject.id);
      toast.success(r.message || 'Main branch protected');
    } catch (e) {
      toast.error(e.message || 'Failed to protect branch');
    }
  };

  const handleMerge = async (pr) => {
    setMerging(pr.number);
    try {
      const r = await mergePullRequest(selectedProject.id, pr.number, {
        commitMessage: `Merged PR #${pr.number}: ${pr.title}`,
      });
      toast.success(r.message || 'Merged successfully');
      loadData(selectedProject);
    } catch (e) {
      if (e.message?.includes('conflict') || e.message?.includes('409')) {
        toast.error('Merge conflict detected — manual resolution required');
      } else {
        toast.error(e.message || 'Merge failed');
      }
    } finally {
      setMerging(null);
    }
  };

  const handleReject = async (pr) => {
    setRejecting(pr.number);
    try {
      await rejectPullRequest(selectedProject.id, pr.number);
      toast.success(`PR #${pr.number} rejected`);
      loadData(selectedProject);
    } catch (e) {
      toast.error(e.message || 'Reject failed');
    } finally {
      setRejecting(null);
    }
  };

  const toggleBranch = async (branchName) => {
    if (expandedBranch === branchName) { setExpanded(null); return; }
    setExpanded(branchName);
    if (!branchCommits[branchName]) {
      try {
        const [commits, diff] = await Promise.all([
          getBranchCommits(selectedProject.id, branchName).catch(() => []),
          compareBranch(selectedProject.id, branchName).catch(() => null),
        ]);
        setBranchCommits(p => ({ ...p, [branchName]: commits || [] }));
        setBranchDiff(p => ({ ...p, [branchName]: diff }));
      } catch (e) { /* silent */ }
    }
  };

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const studentBranches = filteredBranches.filter(b => b.isStudentBranch);
  const otherBranches   = filteredBranches.filter(b => !b.isStudentBranch);

  const getAssignment = (branchName) =>
    assignments.find(a => a.branchName === branchName);

  const stats = [
    { label: 'Total Branches',   value: branches.length,                                    color: '#6675ff' },
    { label: 'Student Branches', value: branches.filter(b => b.isStudentBranch).length,     color: '#8c4fff' },
    { label: 'Open PRs',         value: prs.filter(p => p.state === 'open').length,          color: '#2ecc71' },
    { label: 'Conflicts',        value: assignments.filter(a => a.status === 'conflict').length, color: '#e05c5c' },
  ];

  return (
    <TeacherLayout title="GitHub Workflow" subtitle="Branch management, pull requests & merging">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* PROJECT SELECTOR */}
      <div className="gw-toolbar">
        <div className="gw-project-select">
          <FaGithub />
          <select value={selectedProject?.id || ''} onChange={e => {
            const p = projects.find(x => x.id === +e.target.value);
            setSelected(p); setBranches([]); setAssignments([]); setPrs([]);
          }}>
            <option value="">— Select Project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="gw-actions">
          <button className="gw-btn-ghost" onClick={() => loadData(selectedProject)} disabled={loading}>
            <FaSync className={loading ? 'gw-spin' : ''} /> Refresh
          </button>
          <button className="gw-btn-ghost" onClick={handleProtectMain} disabled={!selectedProject}>
            <FaLock /> Protect Main
          </button>
          <button className="gw-btn-primary" onClick={handleSetupBranches} disabled={!selectedProject || setupLoading}>
            {setupLoading ? <FaSpinner className="gw-spin" /> : <FaCodeBranch />}
            {setupLoading ? 'Setting up...' : 'Setup Student Branches'}
          </button>
        </div>
      </div>

      {!selectedProject ? (
        <div className="gw-empty">
          <FaGithub />
          <p>Select a project to manage GitHub workflow</p>
        </div>
      ) : (
        <>
          {/* GITHUB NOT CONFIGURED BANNER */}
          {githubError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 22px', borderRadius: 14, background: 'rgba(224,92,92,0.08)', border: '1.5px solid rgba(224,92,92,0.35)', marginBottom: 24 }}>
              <FaExclamationTriangle style={{ color: '#e05c5c', fontSize: 22, flexShrink: 0, marginTop: 2 }} />
              <div>
                {githubError === 'no_config' ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#e05c5c', marginBottom: 6 }}>GitHub Not Configured</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
                      No active GitHub Personal Access Token (PAT) is set up. You need to configure GitHub settings before managing branches or pull requests.
                    </div>
                    <button
                      onClick={() => navigate('/admin/github-settings')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      <FaGithub /> Go to GitHub Settings
                    </button>
                  </>
                ) : githubError === 'no_repo' ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f39c12', marginBottom: 6 }}>Repository Not Found on GitHub</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>
                      The repo <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>{selectedProject?.githubRepoName || '—'}</code> does not exist under your GitHub org.
                      Check the org name in GitHub Settings and the repo name on the project.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a href={buildGitHubRepoUrl(selectedProject?.githubRepoName, selectedProject?.githubOwner || '') || '#'} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(243,156,18,0.15)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.3)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <FaGithub /> Check on GitHub
                      </a>
                      <button onClick={() => navigate('/teacher/projects/edit/' + selectedProject?.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(102,117,255,0.15)', color: '#6675ff', border: '1px solid rgba(102,117,255,0.3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Fix Repo Name
                      </button>
                    </div>
                  </>
                ) : githubError === 'bad_token' ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#e05c5c', marginBottom: 6 }}>GitHub Token Invalid</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 10 }}>Your Personal Access Token is expired or missing the <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>repo</code> scope.</div>
                    <button onClick={() => navigate('/admin/github-settings')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      <FaGithub /> Update Token
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#e05c5c', marginBottom: 6 }}>GitHub Error</div>
                    <div style={{ fontSize: 13, opacity: 0.75 }}>{githubError}</div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* STATS */}
          <div className="gw-stats">
            {stats.map(s => (
              <div className="gw-stat" key={s.label}>
                <div className="gw-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="gw-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* REPO INFO BANNER */}
          {selectedProject.githubRepoName && (
            <div className="gw-repo-banner">
              <FaGithub />
              <span>Repository:</span>
              <strong>{selectedProject.githubRepoName}</strong>
              <span className="gw-branch-pill"><FaCodeBranch /> {selectedProject.githubBranch || 'main'}</span>
              <a
                href={buildGitHubRepoUrl(selectedProject.githubRepoName, selectedProject?.githubOwner || '') || '#'}
                target="_blank" rel="noreferrer"
                className="gw-repo-link"
              >
                Open on GitHub <FaArrowRight />
              </a>
            </div>
          )}

          <div className="gw-grid">

            {/* LEFT: BRANCHES */}
            <div className="gw-panel">
              <div className="gw-panel-head">
                <span><FaCodeBranch /> Branches</span>
                <div className="gw-search">
                  <FaSearch />
                  <input placeholder="Search branches..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              {loading ? (
                <div className="gw-loading"><FaSpinner className="gw-spin" /> Loading...</div>
              ) : (
                <>
                  {/* STUDENT BRANCHES */}
                  {studentBranches.length > 0 && (
                    <div className="gw-branch-group">
                      <div className="gw-branch-group-label">Student Branches ({studentBranches.length})</div>
                      {studentBranches.map(b => {
                        const assign = getAssignment(b.name);
                        const st = STATUS_CFG[assign?.status] || STATUS_CFG.active;
                        const isOpen = expandedBranch === b.name;
                        const commits = branchCommits[b.name] || [];
                        const diff = branchDiff[b.name];
                        return (
                          <div className="gw-branch-card" key={b.name}>
                            <div className="gw-branch-row" onClick={() => toggleBranch(b.name)}>
                              <div className="gw-branch-left">
                                <FaCodeBranch style={{ color: '#6675ff' }} />
                                <div>
                                  <div className="gw-branch-name">{b.name}</div>
                                  {assign && (
                                    <div className="gw-branch-meta">
                                      {assign.studentName} · {assign.studentUsn}
                                      {assign.githubUsername && <> · <FaGithub /> {assign.githubUsername}</>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="gw-branch-right">
                                <span className="gw-status-pill" style={{ color: st.color, background: st.bg }}>
                                  {st.label}
                                </span>
                                {diff && (
                                  <span className="gw-diff-pill">
                                    +{diff.ahead_by || 0} / -{diff.behind_by || 0}
                                  </span>
                                )}
                                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                              </div>
                            </div>

                            {isOpen && (
                              <div className="gw-branch-detail">
                                {/* DIFF SUMMARY */}
                                {diff && (
                                  <div className="gw-diff-summary">
                                    <span><FaGitAlt /> {diff.ahead_by || 0} commits ahead of main</span>
                                    <span>{diff.files?.length || 0} files changed</span>
                                    <span style={{ color: '#2ecc71' }}>+{diff.files?.reduce((s, f) => s + (f.additions || 0), 0) || 0}</span>
                                    <span style={{ color: '#e05c5c' }}>-{diff.files?.reduce((s, f) => s + (f.deletions || 0), 0) || 0}</span>
                                  </div>
                                )}

                                {/* COMMITS */}
                                <div className="gw-commits-head">Recent Commits</div>
                                {commits.length === 0 ? (
                                  <div className="gw-no-commits">No commits yet on this branch</div>
                                ) : (
                                  commits.slice(0, 5).map((c, i) => (
                                    <div className="gw-commit-row" key={i}>
                                      <div className="gw-commit-dot" />
                                      <div>
                                        <div className="gw-commit-msg">
                                          {c.commit?.message?.split('\n')[0] || '—'}
                                        </div>
                                        <div className="gw-commit-meta">
                                          {c.commit?.author?.name} · {c.commit?.author?.date?.slice(0, 10)}
                                          {c.sha && <> · <code>{c.sha.slice(0, 7)}</code></>}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}

                                {/* CHANGED FILES */}
                                {diff?.files?.length > 0 && (
                                  <>
                                    <div className="gw-commits-head" style={{ marginTop: 12 }}>Changed Files</div>
                                    {diff.files.slice(0, 8).map((f, i) => (
                                      <div className="gw-file-row" key={i}>
                                        <span className={`gw-file-status gw-file-${f.status}`}>{f.status}</span>
                                        <span className="gw-file-name">{f.filename}</span>
                                        <span style={{ color: '#2ecc71', fontSize: 11 }}>+{f.additions}</span>
                                        <span style={{ color: '#e05c5c', fontSize: 11 }}>-{f.deletions}</span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* OTHER BRANCHES (main etc) */}
                  {otherBranches.length > 0 && (
                    <div className="gw-branch-group">
                      <div className="gw-branch-group-label">Other Branches</div>
                      {otherBranches.map(b => (
                        <div className="gw-branch-card gw-branch-main" key={b.name}>
                          <div className="gw-branch-row">
                            <div className="gw-branch-left">
                              <FaShieldAlt style={{ color: '#f39c12' }} />
                              <div>
                                <div className="gw-branch-name">{b.name}</div>
                                <div className="gw-branch-meta">Protected default branch</div>
                              </div>
                            </div>
                            <span className="gw-status-pill" style={{ color: '#f39c12', background: 'rgba(243,156,18,0.12)' }}>
                              <FaLock /> Protected
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {branches.length === 0 && !loading && (
                    <div className="gw-empty-branches">
                      <FaCodeBranch />
                      <p>No branches found</p>
                      <span>Click "Setup Student Branches" to auto-create branches for all team members</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RIGHT: PULL REQUESTS */}
            <div className="gw-panel">
              <div className="gw-panel-head">
                <span><FaGitAlt /> Pull Requests</span>
                <div className="gw-pr-tabs">
                  {['open', 'closed'].map(t => (
                    <button
                      key={t}
                      className={`gw-pr-tab ${prTab === t ? 'active' : ''}`}
                      onClick={() => { setPrTab(t); loadData(selectedProject); }}
                    >
                      {t === 'open' ? 'Open' : 'Closed'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="gw-loading"><FaSpinner className="gw-spin" /> Loading...</div>
              ) : prs.length === 0 ? (
                <div className="gw-empty-branches">
                  <FaGitAlt />
                  <p>No {prTab} pull requests</p>
                  <span>Pull requests appear here when students submit their work for review</span>
                </div>
              ) : (
                prs.map(pr => {
                  const stCfg = PR_STATE_CFG[pr.state] || PR_STATE_CFG.open;
                  const isMerging  = merging  === pr.number;
                  const isRejecting = rejecting === pr.number;
                  return (
                    <div className="gw-pr-card" key={pr.number}>
                      <div className="gw-pr-top">
                        <div className="gw-pr-info">
                          <div className="gw-pr-title">
                            <span className="gw-pr-num">#{pr.number}</span>
                            {pr.title}
                          </div>
                          <div className="gw-pr-meta">
                            <FaCodeBranch /> {pr.head?.ref}
                            <FaArrowRight style={{ fontSize: 10 }} />
                            {pr.base?.ref}
                            {pr.user?.login && <> · by <strong>{pr.user.login}</strong></>}
                          </div>
                        </div>
                        <span className="gw-status-pill" style={{ color: stCfg.color, background: stCfg.color + '20' }}>
                          {stCfg.label}
                        </span>
                      </div>

                      {pr.body && (
                        <div className="gw-pr-body">{pr.body}</div>
                      )}

                      {pr.state === 'open' && (
                        <div className="gw-pr-actions">
                          <a href={pr.html_url} target="_blank" rel="noreferrer" className="gw-btn-ghost">
                            <FaEye /> View on GitHub
                          </a>
                          <button
                            className="gw-btn-reject"
                            onClick={() => handleReject(pr)}
                            disabled={isRejecting}
                          >
                            {isRejecting ? <FaSpinner className="gw-spin" /> : <FaTimes />}
                            Reject
                          </button>
                          <button
                            className="gw-btn-merge"
                            onClick={() => handleMerge(pr)}
                            disabled={isMerging}
                          >
                            {isMerging ? <FaSpinner className="gw-spin" /> : <FaCheckCircle />}
                            {isMerging ? 'Merging...' : 'Approve & Merge'}
                          </button>
                        </div>
                      )}

                      {pr.state === 'closed' && pr.merged_at && (
                        <div className="gw-pr-merged-tag">
                          <FaCheckCircle /> Merged on {pr.merged_at?.slice(0, 10)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* STUDENT WORKFLOW GUIDE */}
          <div className="gw-guide">
            <div className="gw-guide-head"><FaGitAlt /> Student Git Workflow Guide</div>
            <div className="gw-guide-steps">
              {[
                { n: 1, title: 'Clone Repository',    cmd: `git clone ${buildGitHubCloneUrl(selectedProject.githubRepoName, selectedProject?.githubOwner || '') || 'https://github.com/<repo>'}` },
                { n: 2, title: 'Enter Project Folder', cmd: `cd ${selectedProject.githubRepoName?.split('/').pop() || '<repo-name>'}` },
                { n: 3, title: 'Switch to Your Branch', cmd: 'git checkout student-<your-github-username>' },
                { n: 4, title: 'Write Your Code',      cmd: '# Edit files in your editor' },
                { n: 5, title: 'Stage & Commit',       cmd: 'git add .\ngit commit -m "Implemented feature"' },
                { n: 6, title: 'Push to Your Branch',  cmd: 'git push origin student-<your-github-username>' },
              ].map(s => (
                <div className="gw-guide-step" key={s.n}>
                  <div className="gw-guide-num">{s.n}</div>
                  <div>
                    <div className="gw-guide-title">{s.title}</div>
                    <div className="gw-guide-cmd-wrap">
                      <div className="gw-guide-cmd-bar">
                        <span className="gw-guide-cmd-dot" />
                        <span className="gw-guide-cmd-dot" />
                        <span className="gw-guide-cmd-dot" />
                        <span className="gw-guide-cmd-label">bash</span>
                      </div>
                      <pre className="gw-guide-cmd">
                        {s.cmd.split('\n').map((line, i) => (
                          <span key={i} style={{ display: 'block' }}>
                            {line.startsWith('#')
                              ? <span style={{ color: '#666', fontStyle: 'italic' }}>{line}</span>
                              : <><span className="gw-guide-cmd-prompt">$</span>{line}</>
                            }
                          </span>
                        ))}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="gw-guide-rule">
              <FaExclamationTriangle style={{ color: '#f39c12' }} />
              <strong>Rule:</strong> Never push directly to <code>main</code>. Always push to your assigned branch and submit a Pull Request.
            </div>
          </div>
        </>
      )}
    </TeacherLayout>
  );
}
