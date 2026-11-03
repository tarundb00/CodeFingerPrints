import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaProjectDiagram, FaGithub, FaCog,
  FaCalendarAlt, FaSave, FaTimes, FaCheckCircle,
  FaSpinner, FaArrowRight, FaCodeBranch, FaLock,
  FaGlobe, FaExclamationTriangle, FaShieldAlt, FaBuilding,
  FaFolder, FaShoppingCart, FaRobot, FaChartBar,
  FaMobileAlt, FaFlask, FaGraduationCap, FaRocket, FaDatabase, FaLayerGroup,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { fetchTeams, fetchGithubConfigs, createProject, updateProject, fetchProject, createGithubRepo, setupBranches, analyzeContributions } from '../services/api';
import { normalizeGitHubRepoPath } from '../utils/githubRepo';
import './Projects.css';

const Toggle = ({ checked, onChange, label, sub }) => (
  <div className="cp-toggle-row" onClick={onChange}>
    <div className={`cp-toggle ${checked ? 'on' : ''}`}><div className="cp-toggle-knob" /></div>
    <div><p>{label}</p>{sub && <span>{sub}</span>}</div>
  </div>
);

const ICONS = [
  { key: 'folder',   Icon: FaFolder,        label: 'General'    },
  { key: 'cart',     Icon: FaShoppingCart,  label: 'E-Commerce' },
  { key: 'robot',    Icon: FaRobot,         label: 'AI / ML'    },
  { key: 'chart',    Icon: FaChartBar,      label: 'Analytics'  },
  { key: 'mobile',   Icon: FaMobileAlt,     label: 'Mobile'     },
  { key: 'flask',    Icon: FaFlask,         label: 'Research'   },
  { key: 'grad',     Icon: FaGraduationCap, label: 'Education'  },
  { key: 'rocket',   Icon: FaRocket,        label: 'Startup'    },
  { key: 'database', Icon: FaDatabase,      label: 'Database'   },
  { key: 'layers',   Icon: FaLayerGroup,    label: 'Fullstack'  },
];

const STEPS = ['Project Details', 'GitHub Setup'];

export default function CreateProject() {
  const navigate = useNavigate();
  const { projectId } = useParams();          // defined only on edit route
  const isEdit = Boolean(projectId);
  const { toasts, removeToast, toast } = useToast();

  const [step, setStep]               = useState(1);
  const [teams, setTeams]             = useState([]);
  const [githubConfig, setGithubConfig] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [saving, setSaving]           = useState(false);
  const [loadingProject, setLoadingProject] = useState(isEdit);

  const [form, setForm] = useState({
    icon: 'folder', desc: '', semester: 'Spring 2026', year: '2025-2026',
    marks: '100', start: '', end: '',
    aiDetect: true, reviewImpact: true, bugTracking: true,
  });

  const [gh, setGh] = useState({ repoName: '', branch: 'main', visibility: 'private' });
  const [testStatus, setTestStatus] = useState(null);

  // Load teams + github config
  useEffect(() => {
    fetchTeams().then(data => setTeams(data || [])).catch(() => {});
    fetchGithubConfigs().then(data => {
      const active = (data || []).find(c => c.status === 'active');
      setGithubConfig(active || null);
      if (active) {
        setGh(g => ({
          ...g,
          branch: active.defaultBranch || 'main',
          visibility: active.repoVisibility || 'private',
        }));
      }
    }).catch(() => {});
  }, []);

  // If edit mode, load existing project and pre-fill
  useEffect(() => {
    if (!isEdit) return;
    fetchProject(projectId)
      .then(p => {
        setForm({
          icon:         p.icon         || 'folder',
          desc:         p.description  || '',
          semester:     p.semester     || 'Spring 2026',
          year:         p.academicYear || '2025-2026',
          marks:        String(p.totalMarks || '100'),
          start:        p.startDate    || '',
          end:          p.endDate      || '',
          aiDetect:     p.aiDetect     ?? true,
          reviewImpact: p.reviewImpact ?? true,
          bugTracking:  p.bugTracking  ?? true,
        });
        setGh({
          repoName:   p.githubRepoName   || '',
          branch:     p.githubBranch     || 'main',
          visibility: p.githubVisibility || 'private',
        });
        if (p.teamId) setSelectedTeamId(String(p.teamId));
      })
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoadingProject(false));
  }, [projectId, isEdit]);

  const selectedTeam = teams.find(t => t.id === +selectedTeamId) || null;

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setG   = (k, v) => setGh(p => ({ ...p, [k]: v }));
  const toggle = k => setForm(p => ({ ...p, [k]: !p[k] }));

  const autoRepoName = selectedTeam
    ? `${selectedTeam.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-team${selectedTeam.teamNumber || selectedTeam.id}`
    : '';
  const repoName = gh.repoName || autoRepoName;
  const fullRepoPath = githubConfig
    ? `${githubConfig.organizationName || 'your-org'}/${repoName || '<repo-name>'}`
    : repoName || '<repo-name>';

  const canStep1  = selectedTeamId && form.desc.trim() && form.start && form.end && form.marks;
  const canFinish = repoName;

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const configs = await fetchGithubConfigs();
      const active = (configs || []).find(c => c.status === 'active');
      setTestStatus(active ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  };

  const normalizeRepoPath = (value) => normalizeGitHubRepoPath(value, githubConfig?.organizationName || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name:            selectedTeam ? selectedTeam.projectName : repoName,
        icon:            form.icon,
        description:     form.desc,
        semester:        form.semester,
        academicYear:    form.year,
        totalMarks:      form.marks,
        startDate:       form.start,
        endDate:         form.end,
        status:          'active',
        githubRepoName:  repoName,
        githubOwner:     githubConfig?.organizationName || '',
        githubBranch:    gh.branch,
        githubVisibility: gh.visibility,
        aiDetect:        form.aiDetect,
        reviewImpact:    form.reviewImpact,
        bugTracking:     form.bugTracking,
        teamId:          selectedTeamId ? +selectedTeamId : null,
      };

      if (isEdit) {
        await updateProject(projectId, payload);
        toast.success('Project updated successfully!');
      } else {
        if (githubConfig) {
          const missing = (selectedTeam?.members || []).filter(m => !m.githubUsername);
          if (missing.length > 0) {
            toast.info(`${missing.length} team member(s) are missing GitHub usernames — they won't be added as collaborators. Ask them to add their username to the team.`);
          }
          toast.info('Creating GitHub repository...');
          try {
            const result = await createGithubRepo({
              repoName,
              description: form.desc,
              visibility: gh.visibility,
              collaborators: selectedTeam?.members?.map(m => m.githubUsername).filter(Boolean) || [],
            });
            if (result?.success) {
              const repoUrlStr = result.repoUrl || result.cloneUrl || '';
              const normalizedPath = normalizeGitHubRepoPath(repoUrlStr);
              if (normalizedPath.includes('/')) {
                const parts = normalizedPath.split('/');
                payload.githubOwner = parts[0];
                payload.githubRepoName = parts.slice(1).join('/');
              } else {
                payload.githubRepoName = normalizedPath;
                payload.githubOwner = githubConfig?.organizationName || '';
              }
              toast.success(`GitHub repository ready: ${payload.githubRepoName}`);
            } else {
              const details = result?.message || 'Unable to create GitHub repository.';
              toast.info(`GitHub repository setup could not be completed, so the project will still be saved without it: ${details}`);
            }
          } catch (githubErr) {
            toast.info(`GitHub repository setup could not be completed, so the project will still be saved without it: ${githubErr.message}`);
          }
        } else {
          toast.info('No GitHub config is active, so the project was saved without creating a repository.');
        }

        const createdProject = await createProject(payload);
        toast.success('Project created successfully!');

        if (githubConfig && createdProject?.id && payload.githubRepoName) {
          try {
            const branchResult = await setupBranches(createdProject.id);
            const createdCount = branchResult?.created?.length || 0;
            toast.success(branchResult?.message || `Branch setup completed for ${createdCount} student${createdCount === 1 ? '' : 's'}.`);
          } catch (branchErr) {
            toast.info(`Repository saved, but branch setup could not be completed: ${branchErr.message}`);
          }

          try {
            await analyzeContributions(createdProject.id);
            toast.success('Contribution analysis has started.');
          } catch (analysisErr) {
            toast.info('Contribution analysis could not be started yet.');
          }
        }
      }
      setTimeout(() => navigate('/teacher/projects'), 1000);
    } catch (err) {
      toast.error(err.message || (isEdit ? 'Failed to update project' : 'Failed to create project'));
    } finally {
      setSaving(false);
    }
  };

  if (loadingProject) {
    return (
      <TeacherLayout title="Edit Project" subtitle="Loading...">
        <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>
          <FaSpinner style={{ animation: 'spin 0.8s linear infinite', fontSize: 28 }} />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout
      title={isEdit ? 'Edit Project' : 'Create New Project'}
      subtitle={`Step ${step} of 2 — ${STEPS[step - 1]}`}
    >
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="cp-wizard-wrap">

        {/* STEP INDICATOR */}
        <div className="cp-steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`cp-step ${i+1===step?'active':i+1<step?'done':''}`}>
              <div className="cp-step-dot">{i+1 < step ? '✓' : i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="cp-form">
            <div className="cp-section t-card">
              <div className="cp-section-head"><FaProjectDiagram /> Project Details</div>
              <div className="t-grid-2">

                {/* Icon picker */}
                <div className="t-field cp-full">
                  <label>Project Icon</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ICONS.map(({ key, Icon, label }) => (
                      <button key={key} type="button" title={label}
                        onClick={() => set('icon', key)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 14px', borderRadius: 12, cursor: 'pointer', border: 'none',
                          background: form.icon === key ? '#6675ff' : '#eef1f8',
                          color: form.icon === key ? '#fff' : '#6675ff',
                          boxShadow: form.icon === key
                            ? '3px 3px 8px rgba(102,117,255,0.4)'
                            : '4px 4px 10px #d1d9e6, -4px -4px 10px #ffffff',
                          fontSize: 18, transition: 'all 0.2s',
                        }}>
                        <Icon />
                        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="t-field cp-full">
                  <label>Select Team *</label>
                  <div className="t-input-wrap">
                    <select value={selectedTeamId} onChange={e => { setSelectedTeamId(e.target.value); setGh(g => ({ ...g, repoName: '' })); }}>
                      <option value="">— Choose a team —</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.teamName} — {t.projectName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedTeam && (
                  <div className="cp-team-info cp-full">
                    <div className="cp-team-pill"><span className="cp-team-pill-label">Team</span><span className="cp-team-pill-val">{selectedTeam.teamName}</span></div>
                    <div className="cp-team-pill"><span className="cp-team-pill-label">Project</span><span className="cp-team-pill-val">{selectedTeam.projectName}</span></div>
                    <div className="cp-team-pill"><span className="cp-team-pill-label">Type</span><span className="cp-team-pill-val">{selectedTeam.projectType}</span></div>
                    <div className="cp-team-pill"><span className="cp-team-pill-label">Members</span><span className="cp-team-pill-val">{selectedTeam.members?.length || 0}</span></div>
                  </div>
                )}

                <div className="t-field cp-full">
                  <label>Project Description *</label>
                  <div className="t-input-wrap">
                    <textarea rows={3} placeholder="Brief description..." value={form.desc} onChange={e => set('desc', e.target.value)} />
                  </div>
                </div>
                <div className="t-field">
                  <label>Semester *</label>
                  <div className="t-input-wrap">
                    <select value={form.semester} onChange={e => set('semester', e.target.value)}>
                      {['Spring 2026','Fall 2026','Spring 2027'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="t-field">
                  <label>Academic Year *</label>
                  <div className="t-input-wrap">
                    <select value={form.year} onChange={e => set('year', e.target.value)}>
                      {['2025-2026','2026-2027'].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="t-field">
                  <label>Total Marks *</label>
                  <div className="t-input-wrap">
                    <input type="number" placeholder="100" value={form.marks} onChange={e => set('marks', e.target.value)} />
                  </div>
                </div>
                <div className="t-field" />
                <div className="t-field">
                  <label><FaCalendarAlt /> Start Date *</label>
                  <div className="t-input-wrap">
                    <input type="date" value={form.start} onChange={e => set('start', e.target.value)} />
                  </div>
                </div>
                <div className="t-field">
                  <label><FaCalendarAlt /> End Date *</label>
                  <div className="t-input-wrap">
                    <input type="date" value={form.end} onChange={e => set('end', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="cp-section t-card">
              <div className="cp-section-head"><FaCog /> Advanced Settings</div>
              <div className="cp-toggles">
                <Toggle checked={form.aiDetect}     onChange={() => toggle('aiDetect')}     label="Enable AI Code Detection"      sub="Flags AI-generated code using GraphCodeBERT" />
                <Toggle checked={form.reviewImpact} onChange={() => toggle('reviewImpact')} label="Enable Review Impact Analysis" sub="Credits reviewers whose suggestions were merged" />
                <Toggle checked={form.bugTracking}  onChange={() => toggle('bugTracking')}  label="Enable Bug Lifecycle Tracking" sub="Tracks bug introducers and fixers via SZZ Algorithm" />
              </div>
            </div>

            <div className="cp-actions">
              <button type="button" className="t-btn-ghost" onClick={() => navigate('/teacher/projects')}>
                <FaTimes /> Cancel
              </button>
              <button type="button" className={`t-btn-primary ${!canStep1 ? 'cp-disabled' : ''}`} disabled={!canStep1} onClick={() => setStep(2)}>
                Continue to GitHub Setup <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="cp-form">

            <div className={`cp-admin-config-card ${githubConfig ? 'active' : 'inactive'}`}>
              <div className="cp-admin-config-icon">
                {githubConfig ? <FaCheckCircle /> : <FaExclamationTriangle />}
              </div>
              <div className="cp-admin-config-body">
                <h4>{githubConfig ? 'GitHub is configured by Admin' : 'GitHub not configured — contact Admin'}</h4>
                <p>{githubConfig
                  ? 'Organization, PAT, and webhook are managed by your admin.'
                  : 'Ask admin to configure GitHub in Admin → GitHub Settings. You can still save the project without a repo.'}</p>
              </div>
              {githubConfig && (
                <div className="cp-admin-config-pills">
                  <span><FaBuilding /> {githubConfig.organizationName}</span>
                  <span><FaShieldAlt /> {githubConfig.repoVisibility}</span>
                  <span><FaCodeBranch /> {githubConfig.defaultBranch}</span>
                </div>
              )}
            </div>

            <div className="cp-section t-card">
              <div className="cp-section-head"><FaGithub /> Repository Configuration</div>
              <div className="t-grid-2">
                <div className="t-field cp-full">
                  <label>Repository Name <span style={{ opacity: 0.5, fontSize: 12 }}>(auto-filled from team)</span></label>
                  <div className="t-input-wrap">
                    <input placeholder={autoRepoName || 'e.g. team-alpha'} value={gh.repoName} onChange={e => setG('repoName', e.target.value)} />
                  </div>
                  <div className="cp-repo-path"><FaGithub /><code>{fullRepoPath}</code></div>
                </div>
                <div className="t-field">
                  <label><FaCodeBranch /> Default Branch</label>
                  <div className="t-input-wrap">
                    <select value={gh.branch} onChange={e => setG('branch', e.target.value)}>
                      <option value="main">main</option>
                      <option value="master">master</option>
                      <option value="develop">develop</option>
                    </select>
                  </div>
                </div>
                <div className="t-field">
                  <label>{gh.visibility === 'private' ? <FaLock /> : <FaGlobe />} Visibility</label>
                  <div className="t-input-wrap">
                    <select value={gh.visibility} onChange={e => setG('visibility', e.target.value)}>
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="cp-gh-test" style={{ marginTop: 20 }}>
                <button type="button" className="t-btn-ghost" onClick={testConnection} disabled={testStatus === 'testing'}>
                  {testStatus === 'testing' ? <><FaSpinner className="cp-spin" /> Checking...</> : <><FaGithub /> Check GitHub Status</>}
                </button>
                {testStatus === 'ok'   && <span className="cp-gh-ok"><FaCheckCircle /> Connected — ready</span>}
                {testStatus === 'fail' && <span className="cp-gh-fail"><FaExclamationTriangle /> No active GitHub config found</span>}
              </div>
            </div>

            <div className="cp-actions">
              <button type="button" className="t-btn-ghost" onClick={() => setStep(1)}>
                <FaArrowRight style={{ transform: 'rotate(180deg)' }} /> Back
              </button>
              <button
                type="button"
                className={`t-btn-primary ${(!canFinish || saving) ? 'cp-disabled' : ''}`}
                disabled={!canFinish || saving}
                onClick={handleSave}
              >
                {saving
                  ? <><FaSpinner className="cp-spin" /> {isEdit ? 'Saving...' : 'Creating...'}</>
                  : <><FaSave /> {isEdit ? 'Save Changes' : 'Create Project'}</>
                }
              </button>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </TeacherLayout>
  );
}
