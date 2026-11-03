import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import {
  FaGithub, FaCodeBranch, FaPlus, FaMinus, FaCalendarAlt,
  FaChartBar, FaExclamationTriangle, FaCheckCircle, FaClock, FaFire, FaInfoCircle, FaBug, FaEdit, FaAward, FaLock,
} from 'react-icons/fa';
import { fetchStudentDashboard, analyzeContributions, fetchBugsByProject, createBug, updateBug } from '../services/api';
import ContributionCharts from '../components/ContributionCharts';

const STATUS_CFG = {
  ACTIVE:           { label: 'Active',          color: '#2ecc71', bg: 'rgba(46,204,113,0.12)',  icon: <FaCheckCircle /> },
  AT_RISK:          { label: 'At Risk',          color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  icon: <FaExclamationTriangle /> },
  INACTIVE:         { label: 'Inactive',         color: '#e05c5c', bg: 'rgba(224,92,92,0.12)',   icon: <FaClock /> },
  NOT_CONTRIBUTING: { label: 'Not Contributing', color: '#95a5a6', bg: 'rgba(149,165,166,0.12)', icon: <FaClock /> },
};
const C = { text: 'var(--text-primary)', muted: 'var(--text-muted)', border: 'var(--border-color)' };

function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? '#2ecc71' : score >= 40 ? '#f39c12' : '#e05c5c';
  return (
    <div className="s-score-ring" style={{ width: 130, height: 130 }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#d1d9e6" strokeWidth="12" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="s-score-ring-val">
        <span style={{ color, fontSize: 28 }}>{Math.round(score)}</span>
        <span>/100</span>
      </div>
    </div>
  );
}

export default function StudentContribution() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]      = useState(true);
  const [analyzing, setAnalyzing]  = useState(false);
  const [bugs, setBugs]            = useState([]);
  const [bugModal, setBugModal]    = useState(false);
  const [editBug, setEditBug]      = useState(null);
  const [bugForm, setBugForm]      = useState({ title: '', description: '', severity: 'MEDIUM', type: 'BUG' });
  const [bSaving, setBSaving]      = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  const load = () => {
    if (!student.usn) { setLoading(false); return; }
    fetchStudentDashboard(student.usn)
      .then(d => {
        setData(d);
        if (d?.project?.id) {
          fetchBugsByProject(d.project.id).then(b => setBugs(b || [])).catch(() => {});
          if (!d.contribution || d.contribution.score === 0 || !d.contribution.totalCommits) {
            setAnalyzing(true);
            analyzeContributions(d.project.id)
              .then(() => fetchStudentDashboard(student.usn))
              .then(refreshed => setData(refreshed))
              .catch(() => {})
              .finally(() => setAnalyzing(false));
          }
        }
      }).catch(() => setData(null)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    if (!data?.project?.id) return;
    setAnalyzing(true);
    setRefreshMessage('Refreshing contribution data...');
    try {
      const refreshed = await fetchStudentDashboard(student.usn);
      setData(refreshed);
      const refreshedBugs = await fetchBugsByProject(refreshed?.project?.id || data.project.id).catch(() => []);
      setBugs(refreshedBugs || []);
      setRefreshMessage('Contribution data refreshed.');
    } catch (error) {
      setRefreshMessage(error.message || 'Unable to refresh contribution data.');
    } finally { setAnalyzing(false); }
  };

  const SEV = { LOW: { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' }, MEDIUM: { color: '#f39c12', bg: 'rgba(243,156,18,0.12)' }, HIGH: { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' }, CRITICAL: { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)' } };
  const BSTAT = { OPEN: '#e05c5c', IN_PROGRESS: '#f39c12', RESOLVED: '#2ecc71', CLOSED: '#888' };

  const handleSaveBug = async () => {
    if (!bugForm.title.trim()) return;
    setBSaving(true);
    try {
      if (editBug) { await updateBug(editBug.id, bugForm); }
      else { await createBug({ ...bugForm, projectId: data.project.id, teamId: data.team?.id, reportedByUsn: student.usn, reportedByName: student.name || student.usn }); }
      setBugModal(false);
      const b = await fetchBugsByProject(data.project.id).catch(() => []); setBugs(b || []);
    } catch {} finally { setBSaving(false); }
  };

  const contribution = data?.contribution || null;
  const project      = data?.project || null;
  const rawScore     = contribution?.score || 0;
  const totalCommits = contribution?.totalCommits || 0;
  const linesAdded   = contribution?.linesAdded || 0;
  const linesDeleted = contribution?.linesDeleted || 0;
  const activeDays   = contribution?.activeDays || 1;

  // UNIFIED ABSOLUTE SCORE — matches Python WeightedContributionScorer
  // Targets: 5 commits (30pts), 500 lines (20pts), 3 active days (20pts), 5 functions est (15pts)
  function calcAbsoluteScore(commits, additions, activeDays) {
    const commitScore      = Math.min(1, commits / 5) * 30;
    const linesScore       = Math.min(1, additions / 500) * 20;
    const consistencyScore = Math.min(1, activeDays / 3) * 20;
    const estFunctions     = Math.max(1, additions / 30);
    const qualityScore     = Math.min(1, estFunctions / 5) * 15;
    return Math.min(100, Math.round(commitScore + linesScore + consistencyScore + qualityScore));
  }

  const gitScore = rawScore > 0 ? rawScore : (totalCommits > 0 ? calcAbsoluteScore(totalCommits, linesAdded, activeDays) : 0);
  
  const pres = contribution?.presentationScore;
  const rep = contribution?.reportScore;
  const doc = contribution?.documentationScore;
  const hasManual = pres != null || rep != null || doc != null;
  
  // Calculate scaled manual marks (out of 50)
  // Max possible input is 25+25+25 = 75
  const manualTotalEntered = Number(pres || 0) + Number(rep || 0) + Number(doc || 0);
  const manualScaledTo50 = hasManual ? Math.round((manualTotalEntered / 75) * 50) : 0;
  
  // Git score is out of 100, scale it to 50
  const gitScaledTo50 = Math.round((gitScore / 100) * 50);

  let score = hasManual ? (gitScaledTo50 + manualScaledTo50) : gitScore;

  if (contribution?.teacherAiPenalty) {
    const penaltyRatio = Math.max(0, Math.min(100, contribution.teacherAiPenalty)) / 100.0;
    score = Math.max(0, Math.round(score * (1 - penaltyRatio)));
  }

  const marksPublished = project?.marksPublished === true || contribution?.marksPublished === true;

  const isActuallyActive = totalCommits > 0 || score > 0;
  const st = isActuallyActive
    ? STATUS_CFG.ACTIVE
    : (STATUS_CFG[contribution?.status] || STATUS_CFG.NOT_CONTRIBUTING);

  const statCards = contribution ? [
    { icon: <FaGithub />,     label: 'Total Commits',  value: totalCommits, color: '#6675ff' },
    { icon: <FaPlus />,       label: 'Lines Added',    value: linesAdded, color: '#2ecc71' },
    { icon: <FaMinus />,      label: 'Lines Deleted',  value: linesDeleted, color: '#e05c5c' },
    { icon: <FaCalendarAlt />,label: 'Active Days',    value: activeDays, color: '#f39c12' },
    { icon: <FaCodeBranch />, label: 'Pull Requests',  value: contribution.pullRequests  || 0, color: '#8c4fff' },
    { icon: <FaCheckCircle />,label: 'Issues Closed',  value: contribution.issuesClosed  || 0, color: '#1abc9c' },
  ] : [];

  return (
    <StudentLayout title="My Contribution" subtitle="Your GitHub activity and contribution score">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading contributions...</div>
      ) : !contribution ? (
        <div className="s-empty" style={{ marginTop: 60 }}>
          <div className="s-empty-icon"><FaGithub /></div>
          <p>No contribution data yet</p>
          <span>Your teacher will run the GitHub analysis soon.</span>
          {data?.project?.id && (
            <button onClick={handleRefresh} disabled={analyzing}
              style={{ marginTop: 16, padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: analyzing ? 0.7 : 1 }}>
              {analyzing ? 'Analyzing...' : 'Run Analysis Now'}
            </button>
          )}
        </div>
      ) : (
        <>
          {!isActuallyActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 16, background: `${st.color}18`, border: `1px solid ${st.color}44`, marginBottom: 20, fontSize: 14 }}>
              <span style={{ color: st.color, fontSize: 18 }}>{st.icon}</span>
              <div>
                <strong style={{ color: st.color }}>Status: {st.label}</strong>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
                  {contribution.status === 'AT_RISK' && 'You have not committed in 7+ days. Please push your work to avoid being marked inactive.'}
                  {contribution.status === 'INACTIVE' && 'You have not committed in 14+ days. Your teacher has been notified.'}
                  {contribution.status === 'NOT_CONTRIBUTING' && 'No commits found. Make sure your GitHub username is correct in your profile.'}
                </p>
              </div>
            </div>
          )}          <div className="s-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
              <ScoreRing score={gitScore} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Semester Target Progress</h3>
                  <span className="s-badge-pill" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted }}>
                  Project: <strong style={{ color: C.text }}>{project?.name || '—'}</strong>
                  {contribution.lastCommitDate && <> &nbsp;•&nbsp; Last commit: <strong style={{ color: C.text }}>{new Date(contribution.lastCommitDate).toLocaleDateString()}</strong></>}
                </p>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: C.muted, fontWeight: 600 }}>Raw Git Score</span>
                    <strong style={{ color: gitScore >= 70 ? '#2ecc71' : gitScore >= 40 ? '#f39c12' : '#e05c5c' }}>{Math.round(gitScore)}%</strong>
                  </div>
                  <div className="s-bar-bg" style={{ height: 10 }}>
                    <div className="s-bar-fill" style={{ width: `${gitScore}%`, background: gitScore >= 70 ? 'linear-gradient(90deg,#2ecc71,#1abc9c)' : gitScore >= 40 ? 'linear-gradient(90deg,#f39c12,#e67e22)' : 'linear-gradient(90deg,#e05c5c,#c0392b)' }} />
                  </div>
                </div>
                <button onClick={handleRefresh} disabled={analyzing}
                  style={{ marginTop: 14, padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, opacity: analyzing ? 0.7 : 1 }}>
                  {analyzing ? 'Refreshing...' : '🔄 Refresh Analysis'}
                </button>
                {refreshMessage && <div role="status" style={{ marginTop: 8, fontSize: 12, color: refreshMessage.includes('Unable') ? '#e05c5c' : '#2ecc71' }}>{refreshMessage}</div>}
              </div>
            </div>

            <div style={{ marginTop: 24, padding: '20px', background: marksPublished ? 'rgba(46,204,113,0.08)' : 'rgba(148,163,184,0.08)', border: `1px solid ${marksPublished ? 'rgba(46,204,113,0.3)' : 'rgba(148,163,184,0.3)'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, color: marksPublished ? '#2ecc71' : '#64748b' }}>
                  {marksPublished ? <><FaAward style={{marginRight: 6}} /> Final Teacher Grade</> : <><FaLock style={{marginRight: 6}} /> Final Grade Pending</>}
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
                  {marksPublished ? 'Combined from Git contributions, manual grading, and AI detection penalties.' : 'Your teacher has not published the final marks yet.'}
                </p>
                {marksPublished && hasManual && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 12, color: '#64748b', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <strong style={{ color: '#475569' }}>Calculation Formula:</strong> 
                    <br/>Git Contribution (Out of 50): <strong>{gitScaledTo50}</strong> <span style={{fontSize: 10}}>(was {Math.round(gitScore)}/100)</span>
                    <br/>Teacher Manual (Out of 50): <strong>{manualScaledTo50}</strong> <span style={{fontSize: 10}}>(was {manualTotalEntered}/75)</span>
                    {contribution?.teacherAiPenalty > 0 && <span><br/><span style={{ color: '#e05c5c' }}>-{contribution.teacherAiPenalty}% AI Usage Penalty</span></span>}
                  </div>
                )}
              </div>
              <div style={{ fontSize: marksPublished ? 36 : 20, fontWeight: 800, color: marksPublished ? '#2ecc71' : '#94a3b8' }}>
                {marksPublished ? `${score} / 100` : <><FaLock /> Hidden</>}
              </div>
            </div>
          </div>

          <div className="s-stats">
            {statCards.map(s => (
              <div className="s-stat" key={s.label}>
                <div className="s-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                <div className="s-stat-val" style={{ color: s.color }}>{s.value}</div>
                <div className="s-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="s-grid-2">
            <div className="s-card">
              <div className="s-card-head"><FaChartBar /> Score Breakdown</div>
              {[
                { label: 'Commit Consistency',  value: Math.min(30, Math.min(1, totalCommits / 5) * 30), color: '#6675ff' },
                { label: 'Lines Added Volume',  value: Math.min(20, Math.min(1, linesAdded / 500) * 20), color: '#2ecc71' },
                { label: 'Active Days',         value: Math.min(20, Math.min(1, activeDays / 3) * 20), color: '#f39c12' },
                { label: 'Code Quality (Est.)', value: Math.min(15, Math.min(1, Math.max(1, linesAdded / 30) / 5) * 15), color: '#8c4fff' },
                { label: 'Bug Fixes',           value: Math.min(15, Math.min(1, (contribution.issuesClosed || 0) / 1) * 15), color: '#1abc9c' },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.text }}>
                    <span style={{ color: C.muted }}>{r.label}</span>
                    <strong style={{ color: r.color }}>{Math.round(r.value)} / {r.label === 'Commit Consistency' ? 30 : r.label === 'Active Days' || r.label === 'Lines Added Volume' ? 20 : 15}</strong>
                  </div>
                  <div className="s-bar-bg"><div className="s-bar-fill" style={{ width: `${(r.value / (r.label === 'Commit Consistency' ? 30 : r.label === 'Active Days' || r.label === 'Lines Added Volume' ? 20 : 15)) * 100}%`, background: r.color }} /></div>
                </div>
              ))}
              
              {contribution.aiRisk > 0 && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', fontSize: 13, color: C.text }}>
                  <strong style={{ color: '#e05c5c' }}>⚠️ AI Generation Risk:</strong>
                  <span style={{ color: C.muted, marginLeft: 8 }}>{contribution.aiRisk}% detected code similarity.</span>
                </div>
              )}
              
              {(contribution.presentationScore != null || contribution.reportScore != null || contribution.manualFeedback) && marksPublished && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', fontSize: 13, color: C.text }}>
                  <strong style={{ color: '#2ecc71', display: 'block', marginBottom: 8 }}><FaAward /> Teacher Manual Grades:</strong>
                  {contribution.presentationScore != null && <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:C.muted}}>Presentation</span><strong>{contribution.presentationScore}/100</strong></div>}
                  {contribution.reportScore != null && <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}><span style={{color:C.muted}}>Report</span><strong>{contribution.reportScore}/100</strong></div>}
                  {contribution.manualFeedback && <div style={{marginTop:8,fontStyle:'italic',color:C.muted}}>"{contribution.manualFeedback}"</div>}
                </div>
              )}
            </div>

            <div className="s-card">
              <div className="s-card-head"><FaFire /> Activity Summary</div>
              {[
                { label: 'Contribution Status', value: st.label, color: st.color },
                { label: 'Last Commit',         value: contribution.lastCommitDate ? new Date(contribution.lastCommitDate).toLocaleDateString() : 'Never', color: C.text },
                { label: 'Last Analyzed',       value: contribution.lastAnalyzedAt ? new Date(contribution.lastAnalyzedAt).toLocaleDateString() : '—', color: C.text },
                { label: 'GitHub Username',     value: student.githubUsername || 'Not set', color: student.githubUsername ? '#6675ff' : '#e05c5c' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{r.label}</span>
                  <strong style={{ color: r.color }}>{r.value}</strong>
                </div>
              ))}
              {!student.githubUsername && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', fontSize: 12, color: '#e05c5c' }}>
                  <FaExclamationTriangle style={{ marginRight: 6 }} />Set your GitHub username in Profile so your commits can be tracked.
                </div>
              )}
              {student.githubUsername && contribution.totalCommits === 0 && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.25)', fontSize: 12, color: '#f39c12', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <FaInfoCircle style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>No commits matched to your GitHub username <strong>{student.githubUsername}</strong>. Make sure your git config name or email matches your GitHub account, then ask your teacher to re-run analysis.</span>
                </div>
              )}
            </div>
          </div>

          {/* Visual Analytics */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: C.text }}>📊 Contribution Analytics</h3>
            <ContributionCharts scores={[{
              studentName: student.name || 'You',
              studentUsn: student.usn,
              score: contribution.score || 0,
              totalCommits: contribution.totalCommits || 0,
              linesAdded: contribution.linesAdded || 0,
              linesDeleted: contribution.linesDeleted || 0,
              activeDays: contribution.activeDays || 1,
            }]} />
          </div>
        </>
      )}

      {/* ── BUG TRACKER SECTION ── */}
      {data?.project?.id && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}><FaBug style={{ color: '#6675ff' }} /> Bug Reports ({bugs.length})</div>
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
                const sev = SEV[b.severity] || SEV.MEDIUM;
                const stColor = BSTAT[b.status] || '#888';
                return (
                  <div key={b.id} className="s-card" style={{ padding: '14px 18px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: sev.color, background: sev.bg }}>{b.severity}</span>
                          <span style={{ fontSize: 11, color: C.muted }}>{b.type}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: stColor }}>● {b.status?.replace('_',' ')}</span>
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
              <button onClick={() => setBugModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>
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
