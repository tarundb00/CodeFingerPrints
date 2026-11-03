import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import { FaGithub, FaCodeBranch, FaCheckCircle, FaExclamationTriangle, FaCopy, FaArrowRight, FaGitAlt, FaLock, FaSpinner, FaTimes, FaPaperPlane, FaPlus, FaMinus, FaFile, FaBug, FaEdit } from 'react-icons/fa';
import { fetchStudentDashboard, getMyBranch, getBranchCommits, compareBranch, createPullRequest, fetchGithubConfigs, fetchBugsByProject, createBug, updateBug, getBranchDetail } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { buildGitHubCloneUrl, buildGitHubRepoUrl } from '../utils/githubRepo';

const C = { text: '#1d2433', muted: '#64748b', border: '#dde3f0' };

/* ── Design tokens for the dark workflow board ── */
const DARK = {
  bg:       '#0f172a',
  card:     '#1e293b',
  cardAlt:  '#162032',
  border:   'rgba(255,255,255,0.08)',
  text:     '#f1f5f9',
  muted:    '#94a3b8',
  accent:   '#6675ff',
  green:    '#2ecc71',
  red:      '#e05c5c',
  yellow:   '#f39c12',
  purple:   '#8c4fff',
};

const STATUS_CFG = {
  active:   { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)',  label: 'Active',   icon: <FaCheckCircle /> },
  pr_open:  { color: '#6675ff', bg: 'rgba(102,117,255,0.12)', label: 'PR Open',  icon: <FaGitAlt /> },
  merged:   { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)',  label: 'Merged',   icon: <FaCheckCircle /> },
  rejected: { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)',   label: 'Rejected', icon: <FaExclamationTriangle /> },
  conflict: { color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  label: 'Conflict', icon: <FaExclamationTriangle /> },
};

function CopyBtn({ text, dark = false }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: dark ? 'rgba(255,255,255,0.07)' : 'none',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
        cursor: 'pointer',
        color: copied ? '#2ecc71' : dark ? '#94a3b8' : C.muted,
        fontSize: 13, padding: '6px 8px', borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
      {copied ? <FaCheckCircle /> : <FaCopy />}
    </button>
  );
}

export default function StudentGitHub() {
  const [data, setData]           = useState(null);
  const [branch, setBranch]       = useState(null);
  const [commits, setCommits]     = useState([]);
  const [compare, setCompare]     = useState(null);
  const [branchDetail, setBranchDetail] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [prLoading, setPrLoading] = useState(false);
  const [prMsg, setPrMsg]         = useState('');
  const [githubOrg, setGithubOrg] = useState('');
  const [bugs, setBugs]           = useState([]);
  const [bugModal, setBugModal]   = useState(false);
  const [editBug, setEditBug]     = useState(null);
  const [bugForm, setBugForm]     = useState({ title: '', description: '', severity: 'MEDIUM', type: 'BUG' });
  const [bSaving, setBSaving]     = useState(false);
  const { toasts, removeToast, toast } = useToast();
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  useEffect(() => {
    fetchGithubConfigs()
      .then(configs => {
        const active = (configs || []).find(c => c.status === 'active');
        if (active?.organizationName) setGithubOrg(active.organizationName);
      })
      .catch(() => {});
  }, []);

  const loadAll = async () => {
    try {
      const dash = await fetchStudentDashboard(student.usn);
      setData(dash);
      if (dash?.project?.id) {
        const b = await getMyBranch(dash.project.id, student.usn).catch(() => null);
        setBranch(b);
        const [c, cmp, brDetail, bugList] = await Promise.all([
          b?.branchName ? getBranchCommits(dash.project.id, b.branchName).catch(() => []) : Promise.resolve([]),
          b?.branchName ? compareBranch(dash.project.id, b.branchName).catch(() => null) : Promise.resolve(null),
          b?.branchName ? getBranchDetail(dash.project.id, b.branchName).catch(() => null) : Promise.resolve(null),
          fetchBugsByProject(dash.project.id).catch(() => []),
        ]);
        setCommits(c || []);
        setCompare(cmp || null);
        setBranchDetail(brDetail || null);
        setBugs(bugList || []);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load GitHub info');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (student.usn) loadAll(); else setLoading(false); }, []);

  const handleSubmitPR = async () => {
    if (!data?.project?.id || !branch?.branchName) return;
    setPrLoading(true);
    try {
      const result = await createPullRequest(data.project.id, {
        branch: branch.branchName,
        title: `[${student.name || student.usn}] ${branch.branchName} → main`,
        description: `Pull request submitted by ${student.name || student.usn} (${student.usn}) for review.`,
      });
      toast.success(result?.message || 'Pull request submitted!');
      setPrMsg(result.prUrl || '');
      const b = await getMyBranch(data.project.id, student.usn).catch(() => null);
      setBranch(b);
    } catch (e) { toast.error(e.message || 'Failed to submit pull request'); }
    finally { setPrLoading(false); }
  };

  const SEV_G = { LOW: { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' }, MEDIUM: { color: '#f39c12', bg: 'rgba(243,156,18,0.12)' }, HIGH: { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' }, CRITICAL: { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)' } };
  const BSTAT_G = { OPEN: '#e05c5c', IN_PROGRESS: '#f39c12', RESOLVED: '#2ecc71', CLOSED: '#888' };

  const handleSaveBug = async () => {
    if (!bugForm.title.trim()) return;
    setBSaving(true);
    try {
      if (editBug) { await updateBug(editBug.id, bugForm); }
      else { await createBug({ ...bugForm, projectId: data.project.id, teamId: data.team?.id, reportedByUsn: student.usn, reportedByName: student.name || student.usn }); }
      setBugModal(false);
      const b = await fetchBugsByProject(data.project.id).catch(() => []); setBugs(b || []);
    } catch (e) { toast.error(e.message || 'Failed'); } finally { setBSaving(false); }
  };

  const project     = data?.project || null;
  const repoPath    = project?.githubRepoName || '';
  // Use project's githubOwner, or fallback to GitHub config's organization name
  const effectiveOwner = project?.githubOwner || githubOrg || '';
  const cloneUrl    = buildGitHubCloneUrl(repoPath, effectiveOwner) || '<clone-url>';
  const repoFolder  = repoPath.split('/').pop() || '<repo-name>';
  const branchName  = branch?.branchName || `student-${(student.githubUsername || student.usn || 'you').toLowerCase()}`;
  const st          = STATUS_CFG[branch?.status] || STATUS_CFG.active;
  const canSubmitPR = branch && branch.status === 'active' && commits.length > 0;
  const canResubmit = branch && branch.status === 'rejected';

  const steps = [
    { n: 1, title: 'Clone Repository',      cmd: `git clone ${cloneUrl}` },
    { n: 2, title: 'Enter Project Folder',  cmd: `cd ${repoFolder}` },
    { n: 3, title: 'Switch to Your Branch', cmd: `git checkout ${branchName}` },
    { n: 4, title: 'Write Your Code',       cmd: '# Edit files in your code editor' },
    { n: 5, title: 'Stage & Commit',        cmd: 'git add .\ngit commit -m "Implemented feature"' },
    { n: 6, title: 'Push to Your Branch',   cmd: `git push origin ${branchName}` },
  ];

  return (
    <StudentLayout title="GitHub" subtitle="Your branch, workflow and commit history">
      <Toast toasts={toasts} removeToast={removeToast} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}><FaSpinner style={{ fontSize: 28, color: '#6675ff' }} /><p style={{ marginTop: 12 }}>Loading GitHub info...</p></div>
      ) : !project ? (
        <div className="s-empty" style={{ marginTop: 60 }}><div className="s-empty-icon"><FaGithub /></div><p>No project assigned yet</p><span>Your teacher will assign you to a project soon</span></div>
      ) : (
        <>
          {/* BRANCH CARD */}
          <div className="s-card">
            <div className="s-card-head"><FaCodeBranch /> Your Assigned Branch</div>
            {!branch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: C.muted, fontSize: 14 }}>
                <FaExclamationTriangle style={{ color: '#f39c12' }} /> Branch not assigned yet — your teacher will set it up soon.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(102,117,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#6675ff', boxShadow: '4px 4px 10px #d1d9e6,-4px -4px 10px #ffffff' }}>
                      <FaCodeBranch />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#6675ff' }}>{branch.branchName}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                        {project.name} · <a href={buildGitHubRepoUrl(repoPath, effectiveOwner) || '#'} target="_blank" rel="noreferrer" style={{ color: '#6675ff', textDecoration: 'none' }}>{repoPath}</a>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="s-badge-pill" style={{ color: st.color, background: st.bg }}>{st.icon}&nbsp;{st.label}</span>
                    {branch.prUrl && <a href={branch.prUrl} target="_blank" rel="noreferrer" className="s-btn-ghost" style={{ textDecoration: 'none', fontSize: 12 }}><FaGitAlt /> View PR</a>}
                    <a href={buildGitHubRepoUrl(repoPath, effectiveOwner) || '#'} target="_blank" rel="noreferrer" className="s-btn-ghost" style={{ textDecoration: 'none', fontSize: 12 }}><FaGithub /> Open Repo</a>
                  </div>
                </div>

                {/* BRANCH COMPARISON STATS */}
                {compare && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                    {[
                      { icon: <FaCodeBranch />, label: 'Ahead of main', value: compare.ahead_by ?? 0, color: '#6675ff', bg: 'rgba(102,117,255,0.12)', border: 'rgba(102,117,255,0.25)' },
                      { icon: <FaCodeBranch />, label: 'Behind main',   value: compare.behind_by ?? 0, color: '#f39c12', bg: 'rgba(243,156,18,0.12)', border: 'rgba(243,156,18,0.25)' },
                      { icon: <FaPlus />,       label: 'Lines added',   value: compare.files?.reduce((s, f) => s + (f.additions || 0), 0) ?? 0, color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', border: 'rgba(46,204,113,0.25)' },
                      { icon: <FaMinus />,      label: 'Lines removed', value: compare.files?.reduce((s, f) => s + (f.deletions || 0), 0) ?? 0, color: '#e05c5c', bg: 'rgba(224,92,92,0.12)', border: 'rgba(224,92,92,0.25)' },
                      { icon: <FaFile />,       label: 'Files changed', value: compare.files?.length ?? 0, color: '#8c4fff', bg: 'rgba(140,79,255,0.12)', border: 'rgba(140,79,255,0.25)' },
                    ].map(s => (
                      <div key={s.label} style={{
                        flex: '1 1 90px', padding: '12px 14px', borderRadius: 14,
                        background: s.bg, border: `1px solid ${s.border}`,
                        textAlign: 'center', boxShadow: `0 2px 8px ${s.border}`,
                      }}>
                        <div style={{ color: s.color, fontSize: 16, marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                      </div>
                    ))}
                    {branchDetail && (
                      <div style={{
                        flex: '1 1 150px', padding: '12px 14px', borderRadius: 14,
                        background: 'rgba(102,117,255,0.05)', border: '1px solid rgba(102,117,255,0.15)', textAlign: 'left',
                      }}>
                        <div style={{ color: '#6675ff', fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Commit</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#6675ff' }}>
                          {branchDetail.commit?.sha ? branchDetail.commit.sha.slice(0,7) : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
                          {branchDetail.commit?.commit?.message ? branchDetail.commit.commit.message.split('\n')[0] : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(canSubmitPR || canResubmit) && (
                  <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(102,117,255,0.06)', border: '1px solid rgba(102,117,255,0.2)', boxShadow: 'inset 3px 3px 8px #d1d9e6,inset -3px -3px 8px #ffffff' }}>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                      {canResubmit ? 'Your PR was rejected. Fix the issues, push again, then resubmit.' : `You have ${commits.length} commit(s) ready. Submit a Pull Request for teacher review.`}
                    </div>
                    <button onClick={handleSubmitPR} disabled={prLoading} className="s-btn-primary">
                      {prLoading ? <FaSpinner /> : <FaPaperPlane />}
                      {prLoading ? 'Submitting...' : canResubmit ? 'Resubmit Pull Request' : 'Submit Pull Request for Review'}
                    </button>
                    {prMsg && <a href={prMsg} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, color: '#6675ff', fontSize: 12, textDecoration: 'none' }}><FaGitAlt /> View PR on GitHub</a>}
                  </div>
                )}

                {branch.status === 'conflict' && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.3)', fontSize: 13, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 8 }}><FaExclamationTriangle /><span><strong>Merge Conflict Detected</strong> — Your teacher has been notified and will resolve it manually.</span></div>}
                {branch.status === 'rejected' && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.3)', fontSize: 13, color: '#e05c5c', display: 'flex', alignItems: 'center', gap: 8 }}><FaTimes /><span><strong>PR Rejected</strong> — Fix the issues, push your changes, then resubmit above.</span></div>}
                {branch.status === 'merged' && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.3)', fontSize: 13, color: '#2ecc71', display: 'flex', alignItems: 'center', gap: 8 }}><FaCheckCircle /><span><strong>Merged!</strong> — Your code has been merged into main. Great work!</span></div>}
                {branch.status === 'pr_open' && <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(102,117,255,0.08)', border: '1px solid rgba(102,117,255,0.3)', fontSize: 13, color: '#6675ff', display: 'flex', alignItems: 'center', gap: 8 }}><FaGitAlt /><span><strong>PR Under Review</strong> — Your pull request is waiting for teacher approval.</span></div>}
              </>
            )}
          </div>

          {/* RULE BANNER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 16, background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', marginBottom: 20, fontSize: 13, boxShadow: '4px 4px 10px #d1d9e6,-4px -4px 10px #ffffff' }}>
            <FaLock style={{ color: '#e05c5c', fontSize: 18, flexShrink: 0 }} />
            <span style={{ color: C.text }}>
              <strong style={{ color: '#e05c5c' }}>Rule:</strong> Never push to <code style={{ background: 'rgba(102,117,255,0.1)', color: '#6675ff', padding: '1px 6px', borderRadius: 4 }}>main</code>. Always push to <code style={{ background: 'rgba(102,117,255,0.1)', color: '#6675ff', padding: '1px 6px', borderRadius: 4 }}>{branchName}</code> only.
            </span>
          </div>

          {/* WORKFLOW STEPS – dark terminal board */}
          <div style={{
            borderRadius: 20,
            background: DARK.bg,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            marginBottom: 20,
            border: `1px solid ${DARK.border}`,
          }}>
            {/* Board Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #162032)',
              padding: '20px 24px',
              borderBottom: `1px solid ${DARK.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaGitAlt style={{ color: DARK.accent, fontSize: 16 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: DARK.text }}>Git Workflow</span>
                  <span style={{ fontSize: 11, color: DARK.muted, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace' }}>
                    branch: <span style={{ color: DARK.green }}>{branchName}</span>
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: DARK.muted, fontFamily: 'monospace' }}>
                {project.name}
              </div>
            </div>

            {/* Steps */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, idx) => {
                const isLast = idx === steps.length - 1;
                const stepColors = ['#6675ff','#8c4fff','#2ecc71','#f39c12','#e05c5c','#1abc9c'];
                const col = stepColors[idx % stepColors.length];
                return (
                  <div key={s.n} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                    {/* Step number + connector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${col}cc, ${col})`,
                        boxShadow: `0 0 0 3px ${col}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0, zIndex: 1,
                      }}>{s.n}</div>
                      {!isLast && (
                        <div style={{ width: 2, flex: 1, minHeight: 12, background: `linear-gradient(to bottom, ${col}55, transparent)`, margin: '3px 0' }} />
                      )}
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, marginLeft: 10, marginBottom: isLast ? 0 : 4,
                      background: DARK.card,
                      border: `1px solid ${DARK.border}`,
                      borderRadius: 12,
                      padding: '12px 14px',
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: DARK.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: col, fontSize: 10, fontWeight: 800, fontFamily: 'monospace', background: `${col}20`, padding: '1px 6px', borderRadius: 4 }}>
                          step {s.n}
                        </span>
                        {s.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {/* Terminal prompt */}
                        <div style={{ flex: 1, background: '#0a0f1a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: DARK.muted, fontFamily: 'monospace' }}>$ terminal</span>
                          </div>
                          <pre style={{
                            margin: 0, padding: '10px 14px',
                            fontSize: 13, fontFamily: '"Fira Code","Cascadia Code",Consolas,monospace',
                            color: '#a5f3a5',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            lineHeight: 1.6,
                          }}>
                            {s.cmd.split('\n').map((line, li) => (
                              <span key={li} style={{ display: 'block' }}>
                                <span style={{ color: DARK.muted, userSelect: 'none' }}>{'→ '}</span>
                                <span style={{ color: line.startsWith('#') ? DARK.muted : '#a5f3a5' }}>{line}</span>
                              </span>
                            ))}
                          </pre>
                        </div>
                        <CopyBtn text={s.cmd} dark={true} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Board Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: `1px solid ${DARK.border}`,
              background: 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: DARK.green, boxShadow: `0 0 6px ${DARK.green}` }} />
              <span style={{ fontSize: 11, color: DARK.muted, fontFamily: 'monospace' }}>
                Always push to <code style={{ color: DARK.green }}>{branchName}</code> · Never push to <code style={{ color: DARK.red }}>main</code>
              </span>
            </div>
          </div>

          {/* COMMIT HISTORY */}
          <div className="s-card">
            <div className="s-card-head"><FaGithub /> Your Commit History ({commits.length})</div>
            {commits.length === 0 ? (
              <div className="s-empty"><div className="s-empty-icon"><FaCodeBranch /></div><p>No commits yet on your branch</p><span>Follow the workflow above to push your first commit</span></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {commits.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 12px', borderBottom: i < commits.length - 1 ? `1px solid ${C.border}` : 'none',
                    borderRadius: i === 0 ? '10px 10px 0 0' : i === commits.length - 1 ? '0 0 10px 10px' : 0,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      background: `linear-gradient(135deg, #6675ff, #8c4fff)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: '#fff', fontWeight: 700,
                    }}>
                      {(c.commit?.author?.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {c.commit?.message?.split('\n')[0] || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{c.commit?.author?.name}</span>
                        <span>·</span>
                        <span>{c.commit?.author?.date?.slice(0, 10)}</span>
                        {c.sha && (
                          <code style={{
                            background: 'rgba(102,117,255,0.1)', color: '#6675ff',
                            padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                          }}>{c.sha.slice(0, 7)}</code>
                        )}
                      </div>
                    </div>
                    {c.html_url && (
                      <a href={c.html_url} target="_blank" rel="noreferrer"
                        style={{
                          color: '#6675ff', fontSize: 11, textDecoration: 'none', flexShrink: 0,
                          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                          borderRadius: 8, background: 'rgba(102,117,255,0.08)',
                          border: '1px solid rgba(102,117,255,0.2)', fontWeight: 600,
                        }}>
                        View <FaArrowRight style={{ fontSize: 9 }} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* BUG TRACKER */}
      {project && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaBug style={{ color: '#6675ff' }} /> Bug Reports ({bugs.length})
            </div>
            <button onClick={() => { setBugForm({ title: '', description: '', severity: 'MEDIUM', type: 'BUG' }); setEditBug(null); setBugModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <FaPlus /> Report Bug
            </button>
          </div>
          {bugs.length === 0 ? (
            <div className="s-empty"><div className="s-empty-icon"><FaBug /></div><p>No bugs reported yet</p><span>Click "Report Bug" to log an issue</span></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bugs.map(b => {
                const sev = SEV_G[b.severity] || SEV_G.MEDIUM;
                const stColor = BSTAT_G[b.status] || '#888';
                return (
                  <div key={b.id} className="s-card" style={{ padding: '14px 18px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: sev.color, background: sev.bg }}>{b.severity}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>{b.type}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: stColor }}>● {b.status?.replace('_', ' ')}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{b.title}</div>
                        {b.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{b.description}</div>}
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Reported by {b.reportedByName || b.reportedByUsn} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {b.status === 'OPEN' && <button onClick={() => updateBug(b.id, { status: 'IN_PROGRESS' }).then(() => fetchBugsByProject(data.project.id).then(d => setBugs(d || [])))} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #f39c12', background: 'transparent', color: '#f39c12', cursor: 'pointer' }}>Start</button>}
                        {(b.status === 'OPEN' || b.status === 'IN_PROGRESS') && <button onClick={() => updateBug(b.id, { status: 'RESOLVED' }).then(() => fetchBugsByProject(data.project.id).then(d => setBugs(d || [])))} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', cursor: 'pointer' }}>Resolve</button>}
                        {b.reportedByUsn === student.usn && <button onClick={() => { setBugForm({ title: b.title, description: b.description || '', severity: b.severity, type: b.type, status: b.status }); setEditBug(b); setBugModal(true); }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(102,117,255,0.4)', background: 'transparent', color: '#6675ff', cursor: 'pointer' }}><FaEdit /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BUG MODAL */}
      {bugModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{editBug ? 'Edit Bug' : 'Report a Bug'}</div>
              <button onClick={() => setBugModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 20 }}><FaTimes /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>Title *</label>
              <input value={bugForm.title} onChange={e => setBugForm(p => ({ ...p, title: e.target.value }))} placeholder="Short description" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', color: C.text }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
              <textarea rows={3} value={bugForm.description} onChange={e => setBugForm(p => ({ ...p, description: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', color: C.text, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ key: 'severity', opts: ['LOW','MEDIUM','HIGH','CRITICAL'] }, { key: 'type', opts: ['BUG','ERROR','FEATURE','IMPROVEMENT'] }].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'capitalize' }}>{f.key}</label>
                  <select value={bugForm[f.key]} onChange={e => setBugForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setBugModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveBug} disabled={bSaving} style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: bSaving ? 0.7 : 1 }}>
                {bSaving ? 'Saving...' : editBug ? 'Update' : 'Report Bug'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
