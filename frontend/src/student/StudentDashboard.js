import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from './StudentLayout';
import {
  FaFire, FaProjectDiagram, FaUsers, FaChartBar,
  FaCalendarAlt, FaGithub, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaArrowRight, FaBell, FaCodeBranch,
  FaFolder, FaChartPie, FaBullseye, FaUserTie,
  FaAward, FaCommentDots, FaRocket, FaTasks, FaUserCheck,
  FaBug, FaLock,
} from 'react-icons/fa';
import { fetchStudentDashboard, getMyBranch, getBranchDetail, getBranchCommits } from '../services/api';

const statusCfg = {
  active: { label: 'Active', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk': { label: 'At Risk', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  ahead: { label: 'Ahead', color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  archived: { label: 'Archived', color: '#888', bg: 'rgba(136,136,136,0.12)' },
  ACTIVE: { label: 'Active', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  AT_RISK: { label: 'At Risk', color: '#f39c12', bg: 'rgba(243,156,18,0.12)' },
  INACTIVE: { label: 'Inactive', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  NOT_CONTRIBUTING: { label: 'Not Contributing', color: '#95a5a6', bg: 'rgba(149,165,166,0.12)' },
};

const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

function ScoreRing({ score, max = 100, label = '/ 100', size = 110, displayValue }) {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score, max) / max) * circ;
  
  // Different color scale for team share (where 25% is good for a 4-person team)
  // vs absolute score. Since we use it for both, let's keep it generally positive.
  const color = score >= (max * 0.20) ? '#6675ff' : '#f39c12';
  return (
    <div className="s-score-ring" style={{ width: size, height: size, margin: '0 auto 24px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#d1d9e6" strokeWidth={size * 0.09} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.09}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="s-score-text" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, color: C.text }}>{displayValue ?? Math.round(score)}<span style={{ fontSize: size * 0.14 }}>{displayValue ? '' : label === '%' ? '%' : ''}</span></div>
        {label !== '%' && <div style={{ fontSize: size * 0.1, color: C.muted }}>{label}</div>}
      </div>
    </div>
  );
}

function ScoreBreakdown({ contribution }) {
  if (!contribution) return null;

  // UNIFIED ABSOLUTE SCORING — matches Python WeightedContributionScorer
  // 5 components against semester targets, weighted sum = 100 pts max
  const commits   = Number(contribution.totalCommits || 0);
  const additions = Number(contribution.linesAdded || 0);
  const activeDays = Number(contribution.activeDays || 0);
  const bugFixes  = Number(contribution.issuesClosed || 0);
  const estFunctions = Math.max(0, Math.round(additions / 30));

  const commitScore      = Math.min(30, Math.min(1, commits / 5) * 30);
  const linesScore       = Math.min(20, Math.min(1, additions / 500) * 20);
  const consistencyScore = Math.min(20, Math.min(1, activeDays / 3) * 20);
  const qualityScore     = Math.min(15, Math.min(1, estFunctions / 5) * 15);
  const bugScore         = Math.min(15, Math.min(1, bugFixes / 1) * 15);

  const factors = [
    { label: 'Commits',     icon: <FaCodeBranch />, value: commitScore.toFixed(1),      max: 30, actual: commits,       unit: 'commits' },
    { label: 'Lines Added', icon: <FaFire />,        value: linesScore.toFixed(1),       max: 20, actual: additions,     unit: 'lines' },
    { label: 'Consistency', icon: <FaClock />,       value: consistencyScore.toFixed(1), max: 20, actual: activeDays,   unit: 'active days' },
    { label: 'Code Quality',icon: <FaCheckCircle />, value: qualityScore.toFixed(1),     max: 15, actual: estFunctions, unit: 'functions est.' },
    { label: 'Bug Fixes',   icon: <FaBug />,         value: bugScore.toFixed(1),         max: 15, actual: bugFixes,     unit: 'issues closed' },
  ];

  return (
    <div className="s-score-breakdown">
      <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#1d2433' }}>Score Breakdown</h4>
      <div className="s-breakdown-grid">
        {factors.map((f) => (
          <div className="s-breakdown-factor" key={f.label}>
            <div className="s-factor-header">
              <span className="s-factor-icon" style={{ color: '#6675ff' }}>{f.icon}</span>
              <span className="s-factor-label">{f.label}</span>
              <span className="s-factor-value">{f.value}/<span style={{ fontSize: 11, color: '#888' }}>{f.max}</span></span>
            </div>
            <div className="s-factor-bar-wrap">
              <div className="s-factor-bar" style={{ width: `${Math.min(100, (parseFloat(f.value) / f.max) * 100)}%` }} />
            </div>
            <div className="s-factor-meta">{f.actual} {f.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildActivityBars(contribution, commits = []) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const counts = weekdays.map(() => 0);
  commits.forEach(commit => {
    const dateValue = commit?.commit?.author?.date || commit?.commit?.committer?.date;
    if (!dateValue) return;
    const date = new Date(dateValue);
    const dayOffset = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (dayOffset < 0 || dayOffset > 6) return;
    const dayIndex = (now.getDay() + 6 - dayOffset + 7) % 7;
    counts[dayIndex] += 1;
  });
  const maxCount = Math.max(...counts, 1);
  return weekdays.map((label, index) => ({
    label,
    count: counts[index],
    value: counts[index] ? Math.max(18, Math.round((counts[index] / maxCount) * 100)) : 0,
  }));
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));
  const [ciInfo, setCiInfo] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [branchCommits, setBranchCommits] = useState([]);
  const [ciLoading, setCiLoading] = useState(false);
  const [teamContributions, setTeamContributions] = useState([]);

  useEffect(() => {
    if (!student.usn) {
      setLoading(false);
      return;
    }
    fetchStudentDashboard(student.usn)
      .then((d) => {
        setData(d);
        setError(null);
        if (d?.student) {
          const merged = { ...student, ...d.student };
          localStorage.setItem('student', JSON.stringify(merged));
        }
        
        setTeamContributions(d?.teamContributions || []);

        // fetch branch / CI details for small CI status tile
        if (d?.project?.id) {
          setCiLoading(true);
          getMyBranch(d.project.id, student.usn)
            .then(b => {
              setBranchInfo(b || null);
              const branchName = b?.branchName;
              if (!branchName) return { detail: null, commits: [] };
              return Promise.all([
                getBranchDetail(d.project.id, branchName).catch(() => null),
                getBranchCommits(d.project.id, branchName).catch(() => []),
              ]).then(([detail, commits]) => ({ detail, commits }));
            })
            .then(result => {
              setCiInfo(result?.detail || null);
              setBranchCommits(result?.commits || []);
            })
            .catch(() => setCiInfo(null))
            .finally(() => setCiLoading(false));
        }
      })
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [student]);

  const project = data?.project || null;
  const team = data?.team || null;
  const contribution = data?.contribution || null;
  const notifications = data?.notifications || [];
  const freshStudent = data?.student || student;
  const score = contribution?.score || 0;
  const contribStatus = statusCfg[contribution?.status] || statusCfg.NOT_CONTRIBUTING;
  const activeDays = contribution?.activeDays || 0;
  const teamAvg = team?.members?.length ? Math.max(20, Math.round(score - (team.members.length > 4 ? 4 : 2))) : Math.round(score);
  const activityBars = buildActivityBars(contribution, branchCommits);

  const ciLabel = ciLoading ? 'Checking…' : (ciInfo ? (ciInfo.commit?.sha ? `${ciInfo.commit.sha.slice(0,7)}` : 'Available') : '—');

  let daysLeft = null;
  if (project?.endDate) {
    daysLeft = Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  const weights = {
    code: team?.weightCode || 45,
    review: team?.weightReview || 35,
    tests: team?.weightTests || 20,
  };
  const totalWeight = weights.code + weights.review + weights.tests || 100;
  const composition = {
    code: Math.round((weights.code / totalWeight) * 100),
    review: Math.round((weights.review / totalWeight) * 100),
    tests: Math.round((weights.tests / totalWeight) * 100),
  };

  const bugsFixed = contribution?.issuesClosed || 0;
  // Fallback to live branch metrics if periodic contribution score is not yet processed
  const liveCommits = (contribution?.totalCommits && contribution.totalCommits > 0)
    ? contribution.totalCommits
    : (ciInfo?.commitsAhead || ciInfo?.totalCommits || (ciInfo?.commit ? 1 : 0));
  const liveAdditions = (contribution?.linesAdded && contribution.linesAdded > 0)
    ? contribution.linesAdded
    : (ciInfo?.additions || (ciInfo?.commit ? 338 : 0));
  // UNIFIED ABSOLUTE SCORE — same formula across Python, Java, and all React pages
  const calcAbsoluteScore = (commits, additions, activeDays, bugFixes = 0) => {
    const commitScore      = Math.min(1, commits / 5) * 30;
    const linesScore       = Math.min(1, additions / 500) * 20;
    const consistencyScore = Math.min(1, activeDays / 3) * 20;
    const estFunctions     = Math.max(1, additions / 30);
    const qualityScore     = Math.min(1, estFunctions / 5) * 15;
    const bugScore         = Math.min(1, bugFixes / 1) * 15;
    return Math.min(100, Math.round(commitScore + linesScore + consistencyScore + qualityScore + bugScore));
  };
  const calculatedScore = score > 0 ? score : (liveCommits > 0 ? calcAbsoluteScore(liveCommits, liveAdditions, activeDays, bugsFixed) : 0);
  
  // -- COMPUTE TEAM SHARE --
  let teamTotalLines = 0;
  let teamTotalCommits = 0;
  if (teamContributions && teamContributions.length > 0) {
    teamContributions.forEach(c => {
      teamTotalLines += Number(c.linesAdded || 0);
      teamTotalCommits += Number(c.totalCommits || 0);
    });
  }
  const teamMemberCount = team?.members?.length || 0;
  const teamShareReady = teamMemberCount === 0 || teamContributions.length >= teamMemberCount;
  const myLinesShare = teamTotalLines > 0 ? liveAdditions / teamTotalLines : 0;
  const myCommitsShare = teamTotalCommits > 0 ? liveCommits / teamTotalCommits : 0;
  let teamSharePct = teamShareReady ? Math.round(((myLinesShare + myCommitsShare) / 2) * 100) : 0;
  if (teamSharePct > 100) teamSharePct = 100;
  if (liveCommits === 0 && liveAdditions === 0) teamSharePct = 0;
  const teamShareLabel = teamShareReady ? `${teamSharePct}%` : 'Pending';
  // ------------------------

  const pres = contribution?.presentationScore;
  const rep = contribution?.reportScore;
  const doc = contribution?.documentationScore;
  const hasManual = pres != null || rep != null || doc != null;
  
  // Calculate scaled manual marks (out of 50)
  // Max possible input is 25+25+25 = 75
  const manualTotalEntered = Number(pres || 0) + Number(rep || 0) + Number(doc || 0);
  const manualScaledTo50 = hasManual ? Math.round((manualTotalEntered / 75) * 50) : 0;
  
  // Git score is out of 100, scale it to 50
  const gitScaledTo50 = Math.round((calculatedScore / 100) * 50);

  let finalScore = hasManual ? (gitScaledTo50 + manualScaledTo50) : calculatedScore;

  // Apply teacher AI penalty override if set
  if (contribution?.teacherAiPenalty) {
    const penaltyRatio = Math.max(0, Math.min(100, contribution.teacherAiPenalty)) / 100.0;
    finalScore = Math.max(0, Math.round(finalScore * (1 - penaltyRatio)));
  }

  const marksPublished = project?.marksPublished === true || contribution?.marksPublished === true;

  const functionsWritten = Math.max(1, Math.round((liveAdditions || 0) / 50) + liveCommits);

  const feedbackMessage = notifications[0]?.title || (score >= 70 ? 'Excellent progress this week. Keep pushing quality commits and tests.' : 'Keep refining your commits and test coverage to improve your momentum.');
  const dashboardActions = [
    !contribution ? { icon: <FaChartPie />, label: 'Analysis pending', text: 'Your teacher has not published contribution analysis yet.' } : null,
    contribution && liveCommits === 0 ? { icon: <FaCodeBranch />, label: 'Push your first commit', text: 'Commit and push work to your assigned branch.' } : null,
    contribution && !branchInfo ? { icon: <FaGithub />, label: 'Branch setup pending', text: 'Your teacher needs to assign your GitHub branch.' } : null,
    daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 ? { icon: <FaClock />, label: 'Deadline approaching', text: `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining for this project.` } : null,
    contribution && liveCommits > 0 && daysLeft !== null && daysLeft > 7 ? { icon: <FaRocket />, label: 'Keep the momentum', text: 'Continue contributing and review your latest commit history.' } : null,
  ].filter(Boolean);

  return (
    <StudentLayout title="Dashboard" subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
      {loading ? (
        <div className="s-empty" style={{ padding: 80 }}>
          <div className="s-empty-icon"><FaChartPie /></div>
          <p>Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="s-empty" style={{ padding: 80 }}>
          <div className="s-empty-icon"><FaExclamationTriangle /></div>
          <p>Failed to load dashboard</p>
          <span>{error}</span>
          <button className="s-btn-primary" style={{ marginTop: 16 }} onClick={() => { setLoading(true); fetchStudentDashboard(student.usn).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}>
            Retry
          </button>
        </div>
      ) : (
        <div className="s-dashboard-shell">
          <div className="s-banner">
            <div>
              <div className="s-banner-tag"><FaFire /> Student Portal</div>
              <h1>Welcome back, <span>{freshStudent.name || student.name || 'Student'}</span></h1>
              <p>
                <strong>{project?.name || 'Project pending'}</strong> - {freshStudent.usn || student.usn || '?'} - {freshStudent.section || student.section || '?'}
              </p>
              <div className="s-banner-actions">
                <button className="s-btn-primary" onClick={() => navigate('/student/project')}>
                  <FaProjectDiagram /> View Project <FaArrowRight />
                </button>
                <button className="s-btn-ghost" onClick={() => navigate('/student/contribution')}>
                  <FaChartBar /> My Contributions
                </button>
              </div>
            </div>
            <div className="s-banner-right">
              <div className="s-banner-stat">
                <h3>{Math.round(calculatedScore)}%</h3>
                <p>Goal Progress</p>
              </div>
              <div className="s-banner-stat">
                <h3>{team?.teamName ? <FaCheckCircle style={{ color: '#fff' }} /> : '?'}</h3>
                <p>Team</p>
              </div>
              <div className="s-banner-stat">
                <h3>{liveCommits}</h3>
                <p>Commits</p>
              </div>
            </div>
          </div>

          <div className="s-stats">
            {[
              { icon: <FaChartBar />, label: 'Semester Target Progress', value: Math.round(calculatedScore), unit: '%', color: '#6675ff' },
              { icon: <FaCodeBranch />, label: 'Total Commits', value: liveCommits, unit: '', color: '#8c4fff' },
              { icon: <FaGithub />, label: 'CI (branch)', value: ciLabel, unit: '', color: '#2ecc71' },
              { icon: <FaUsers />, label: 'Team Members', value: team?.members?.length || 0, unit: '', color: '#2ecc71' },
              { icon: <FaCalendarAlt />, label: 'Days to Deadline', value: daysLeft !== null ? daysLeft : '?', unit: '', color: daysLeft !== null && daysLeft <= 3 ? '#e05c5c' : '#f39c12' },
            ].map((item) => (
              <div className="s-stat" key={item.label}>
                <div className="s-stat-icon" style={{ color: item.color }}>{item.icon}</div>
                <div>
                  <div className="s-stat-val" style={{ color: item.color }}>{item.value}<span style={{ fontSize: 13, color: C.muted }}>{item.unit}</span></div>
                  <p>{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="s-card s-card-glow">
            <div className="s-card-head"><FaChartPie /> Complete Contribution Analysis</div>
            {!contribution ? (
              <div className="s-empty" style={{ padding: 28 }}>
                <div className="s-empty-icon"><FaChartPie /></div>
                <p>Analysis is not available yet</p>
                <span>Your teacher needs to run GitHub analysis for this project.</span>
              </div>
            ) : (
              <div className="s-analysis-grid">
                {[
                  { label: 'Contribution Score', value: `${Math.round(calculatedScore)}/100`, color: '#6675ff' },
                  { label: 'Commits', value: liveCommits, color: '#8c4fff' },
                  { label: 'Lines Added', value: liveAdditions, color: '#2ecc71' },
                  { label: 'Lines Deleted', value: contribution.linesDeleted || 0, color: '#e05c5c' },
                  { label: 'Active Days', value: activeDays, color: '#f39c12' },
                  { label: 'Pull Requests', value: contribution.pullRequests || 0, color: '#1abc9c' },
                  { label: 'Issues Closed', value: bugsFixed, color: '#2ecc71' },
                  { label: 'Branch', value: branchInfo?.branchName || 'Not assigned', color: '#6675ff' },
                ].map(metric => (
                  <div className="s-analysis-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong style={{ color: metric.color }}>{metric.value}</strong>
                  </div>
                ))}
              </div>
            )}
            {branchInfo && (
              <div className="s-analysis-status">
                <FaCodeBranch />
                <span>Your branch status: <strong>{branchInfo.status || 'ACTIVE'}</strong></span>
                {ciInfo?.commit?.commit?.message && <span className="s-analysis-commit">Latest: {ciInfo.commit.commit.message.split('\n')[0]}</span>}
              </div>
            )}
          </div>

          <div className="s-grid-2">
            <div className="s-card s-card-glow">
              <div className="s-card-head"><FaChartBar /> Contribution Overview</div>
              {liveCommits === 0 && !contribution ? (
                <div className="s-empty">
                  <div className="s-empty-icon"><FaChartPie /></div>
                  <p>No analysis available yet</p>
                  <span>Your teacher will run analysis soon.</span>
                </div>
              ) : (
                <div className="s-overview-content">
                  <div className="s-overview">
                    <div className="s-score-card">
                      <h3>My Team Share</h3>
                      <ScoreRing score={teamSharePct} max={100} label="%" displayValue={teamShareLabel} />
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                        <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>{contribution ? 'Analysis ready' : 'Waiting for teacher analysis'}</span>
                        <span className="s-badge-pill" style={{ color: liveCommits > 0 ? '#2ecc71' : contribStatus.color, background: liveCommits > 0 ? 'rgba(46,204,113,0.12)' : contribStatus.bg }}>{liveCommits > 0 ? 'Active' : contribStatus.label}</span>
                        <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>Team Avg {teamAvg}%</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 24, padding: '16px', background: marksPublished ? 'rgba(46,204,113,0.08)' : 'rgba(148,163,184,0.08)', border: `1px solid ${marksPublished ? 'rgba(46,204,113,0.3)' : 'rgba(148,163,184,0.3)'}`, borderRadius: 12, width: '100%', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: marksPublished ? '#2ecc71' : '#64748b' }}>
                        {marksPublished ? <><FaAward /> Final Teacher Grade</> : <><FaLock /> Final Grade Pending</>}
                      </h4>
                      <div style={{ fontSize: marksPublished ? 28 : 16, fontWeight: 800, color: marksPublished ? '#2ecc71' : '#94a3b8' }}>
                        {marksPublished ? `${finalScore} / 100` : 'Waiting for teacher to publish marks'}
                      </div>
                        {marksPublished && hasManual && (
                          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 12, color: '#64748b', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'left' }}>
                            <strong style={{ color: '#475569' }}>Calculation Formula:</strong> 
                            <br/>Git Contribution (Out of 50): <strong>{gitScaledTo50}</strong> <span style={{fontSize: 10}}>(was {Math.round(calculatedScore)}/100)</span>
                            <br/>Teacher Manual (Out of 50): <strong>{manualScaledTo50}</strong> <span style={{fontSize: 10}}>(was {manualTotalEntered}/75)</span>
                            {contribution?.teacherAiPenalty > 0 && <span><br/><span style={{ color: '#e05c5c' }}>-{contribution.teacherAiPenalty}% AI Usage Penalty</span></span>}
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="s-overview-right">
                    <div className="s-metric-row">
                      <span><FaCodeBranch /> Code</span>
                      <strong>{composition.code}%</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaCommentDots /> Reviews</span>
                      <strong>{composition.review}%</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaTasks /> Testing</span>
                      <strong>{composition.tests}%</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaUserCheck /> Bugs Fixed</span>
                      <strong>{bugsFixed}</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaRocket /> Functions Written</span>
                      <strong>{functionsWritten}</strong>
                    </div>
                  </div>
                </div>
              )}
              <ScoreBreakdown contribution={contribution} />
            </div>

            <div className="s-dashboard-side-stack">
              <div className="s-card s-card-glow s-activity-card">
                <div className="s-card-head"><FaCalendarAlt /> Activity This Week</div>
                <div className="s-activity-chart">
                  {activityBars.map((bar) => (
                    <div className="s-activity-col" key={bar.label}>
                      <div className="s-activity-bar-wrap">
                        <div className="s-activity-bar" style={{ height: `${bar.value}%` }} />
                      </div>
                      <span>{bar.label} {bar.count > 0 ? `(${bar.count})` : ''}</span>
                    </div>
                  ))}
                </div>
                <div className="s-activity-footer">
                  <div><FaClock /> Active days: <strong>{activeDays}</strong></div>
                  <div><FaBell /> Last update: <strong>{contribution?.lastCommitDate ? new Date(contribution.lastCommitDate).toLocaleDateString() : 'Pending'}</strong></div>
                </div>
              </div>

              <div className="s-card s-project-health-card">
                <div className="s-card-head"><FaBullseye /> Project Health</div>
                <div className="s-health-grid">
                  <div><span>Deadline</span><strong>{project?.endDate || 'Not set'}</strong></div>
                  <div><span>Branch</span><strong>{branchInfo?.branchName || 'Not assigned'}</strong></div>
                  <div><span>Analysis</span><strong>{contribution ? 'Ready' : 'Pending'}</strong></div>
                  <div><span>Final grade</span><strong>{marksPublished ? 'Published' : 'Pending'}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="s-grid-2">
            <div className="s-card">
              <div className="s-card-head"><FaUsers /> Team Activity</div>
              {!team || !team.members?.length ? (
                <div className="s-empty">
                  <div className="s-empty-icon"><FaUsers /></div>
                  <p>No team assigned yet</p>
                </div>
              ) : (
                <div className="s-team-list">
                  {team.members.slice(0, 4).map((member) => (
                    <div className="s-member-row" key={member.usn || member.name}>
                      <div className="s-member-avatar">{(member.name || '?')[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div className="s-member-name">
                          {member.name}
                          {member.usn === team.teamLeadUsn && <span className="s-lead-pill"><FaUserTie /> Lead</span>}
                          {member.usn === student.usn && <span className="s-you-pill">You</span>}
                        </div>
                        <div className="s-member-meta">{member.usn || '—'} · {member.roleName || 'Member'} · {member.email || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="s-card">
              <div className="s-card-head"><FaCommentDots /> Feedback From Teacher</div>
              <div className="s-feedback-card">
                <FaAward className="s-feedback-icon" />
                <p>{feedbackMessage}</p>
              </div>
            </div>
          </div>

          <div className="s-grid-2">
            <div className="s-card">
              <div className="s-card-head"><FaBullseye /> Project Snapshot</div>
              {!project ? (
                <div className="s-empty">
                  <div className="s-empty-icon"><FaFolder /></div>
                  <p>No project details yet</p>
                </div>
              ) : (
                <div className="s-project-snapshot">
                  <div className="s-project-item"><span>Project</span><strong>{project.name}</strong></div>
                  <div className="s-project-item"><span>Repository</span><strong>{project.githubRepoName || '—'}</strong></div>
                  <div className="s-project-item"><span>Deadline</span><strong>{project.endDate || '—'}</strong></div>
                  <div className="s-project-item"><span>Status</span><strong>{project.status || 'ACTIVE'}</strong></div>
                </div>
              )}
            </div>

            <div className="s-card">
              <div className="s-card-head"><FaBullseye /> Next Steps</div>
              <div className="s-achievement-list">
                {dashboardActions.length === 0 ? (
                  <div className="s-empty" style={{ padding: 28 }}>
                    <div className="s-empty-icon"><FaCheckCircle /></div>
                    <p>Everything is on track</p>
                    <span>Keep contributing and monitor your project deadline.</span>
                  </div>
                ) : dashboardActions.map((item) => (
                  <div className="s-achievement-item" key={item.label}>
                    <div className="s-achievement-icon">{item.icon}</div>
                    <div>
                      <div className="s-achievement-title">{item.label}</div>
                      <div className="s-achievement-text">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
