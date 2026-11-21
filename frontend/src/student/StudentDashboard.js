import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScoreBreakdown from '../components/ScoreBreakdown';
import useAnalysisUpdates from '../components/useAnalysisUpdates';
import StudentLayout from './StudentLayout';
import {
  FaFire, FaProjectDiagram, FaUsers, FaChartBar,
  FaCalendarAlt, FaGithub, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaArrowRight, FaBell, FaCodeBranch,
  FaFolder, FaChartPie, FaBullseye, FaUserTie,
  FaAward, FaCommentDots, FaRocket, FaTasks, FaUserCheck,
  FaLock,
} from 'react-icons/fa';
import { fetchStudentDashboard, getMyBranch, getBranchDetail } from '../services/api';

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

function buildActivityBars(contribution) {
  let counts = {};
  try { counts = JSON.parse(contribution?.recentActivity || '{}'); } catch { /* Legacy record */ }
  const bars = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 6 + i);
    return { label: date.toLocaleDateString('en', {weekday: 'short', timeZone: 'UTC'}),
      count: counts[date.toISOString().slice(0, 10)] || 0 };
  });
  const max = Math.max(1, ...bars.map(b => b.count));
  return bars.map(b => ({ ...b, value: Math.round(100 * b.count / max) }));
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));
  const [ciInfo, setCiInfo] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
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
              return branchName ? getBranchDetail(d.project.id, branchName) : null;
            })
            .then(detail => setCiInfo(detail))
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
  useAnalysisUpdates(project?.id, () => {
    fetchStudentDashboard(student.usn).then(fresh => {
      setData(fresh);
      setTeamContributions(fresh?.teamContributions || []);
    }).catch(e => setError(e.message));
  });
  const team = data?.team || null;
  const contribution = data?.contribution || null;
  const notifications = data?.notifications || [];
  const freshStudent = data?.student || student;
  const score = contribution?.score || 0;
  const contribStatus = statusCfg[contribution?.status] || statusCfg.NOT_CONTRIBUTING;
  const activeDays = contribution?.activeDays || 0;
  const teamAvg = teamContributions.length
    ? Math.round(teamContributions.reduce((sum, r) => sum + Number(r.score || 0), 0) / teamContributions.length) : 0;
  const activityBars = buildActivityBars(contribution);

  const ciLabel = ciLoading ? 'Checking…' : (ciInfo ? (ciInfo.commit?.sha ? `${ciInfo.commit.sha.slice(0,7)}` : 'Available') : '—');

  let daysLeft = null;
  if (project?.endDate) {
    daysLeft = Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24));
  }

  const bugsFixed = contribution?.issuesClosed ?? 0;
  const liveCommits = contribution?.totalCommits ?? 0;
  const liveAdditions = contribution?.linesAdded ?? 0;
  const calculatedScore = score;
  const teamSharePct = contribution?.codeShare ?? 0;
  const teamShareLabel = contribution?.codeShare == null ? 'Pending' : teamSharePct + '%';

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
                      <h3>My Repository Code Share</h3>
                      <ScoreRing score={teamSharePct} max={100} label="%" displayValue={teamShareLabel} />
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                        <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>{contribution ? 'Analysis ready' : 'Waiting for teacher analysis'}</span>
                        <span className="s-badge-pill" style={{ color: contribStatus.color, background: contribStatus.bg }}>{contribStatus.label}</span>
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
                      <span><FaCodeBranch /> Commits</span>
                      <strong>{liveCommits}</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaCommentDots /> Reviews</span>
                      <strong>{contribution?.reviewComments ?? 0}</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaTasks /> Pull requests</span>
                      <strong>{contribution?.pullRequests ?? 0}</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaUserCheck /> Issues resolved</span>
                      <strong>{bugsFixed}</strong>
                    </div>
                    <div className="s-metric-row">
                      <span><FaRocket /> Lines added</span>
                      <strong>{liveAdditions}</strong>
                    </div>
                  </div>
                </div>
              )}
              <ScoreBreakdown contribution={contribution} />
            </div>

            <div className="s-dashboard-side-stack">
              <div className="s-card s-card-glow s-activity-card">
                <div className="s-card-head"><FaCalendarAlt /> GitHub activity in the last 7 days</div>
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
                  <div><FaBell /> Last update: <strong>{contribution?.lastActivityDate ? new Date(contribution.lastActivityDate + 'Z').toLocaleDateString() : 'Pending'}</strong></div>
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
