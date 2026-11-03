import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaProjectDiagram, FaUsers, FaUserGraduate, FaExclamationTriangle,
  FaGithub, FaCodeBranch, FaBug, FaRobot, FaShieldAlt,
  FaArrowUp, FaArrowDown, FaArrowRight, FaClock,
  FaFire, FaCheckCircle, FaTimesCircle,
  FaBolt, FaCalendarAlt, FaPlus, FaLayerGroup, FaFolder,
} from 'react-icons/fa';
import { BsBarChartFill } from 'react-icons/bs';
import { MdGrade, MdOutlineAnalytics } from 'react-icons/md';
import { fetchProjects, fetchTeams, fetchContributions, fetchInactiveStudents } from '../services/api';
import './TeacherDashboard.css';

const statusConfig = {
  'on-track': { label: 'On Track', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk':  { label: 'At Risk',  color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'  },
  'ahead':    { label: 'Ahead',    color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  'active':   { label: 'Active',   color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'archived': { label: 'Archived', color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};

const contributionStatus = {
  ACTIVE:           { label: 'Active',          color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  AT_RISK:          { label: 'At Risk',         color: '#f39c12', bg: 'rgba(243,156,18,0.12)' },
  INACTIVE:         { label: 'Inactive',        color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  NOT_CONTRIBUTING: { label: 'Not Contributing',color: '#95a5a6', bg: 'rgba(149,165,166,0.12)' },
  UNKNOWN:          { label: 'No Data',         color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};

function TeacherScoreBreakdown({ contribution }) {
  if (!contribution) return null;

  // UNIFIED ABSOLUTE SCORING — matches Python WeightedContributionScorer
  const commits    = contribution.totalCommits || 0;
  const additions  = contribution.linesAdded || 0;
  const activeDays = contribution.activeDays || 0;
  const bugFixes   = contribution.issuesClosed || 0;
  const estFunctions = Math.max(0, Math.round(additions / 30));

  const commitScore      = Math.min(30, Math.min(1, commits / 5) * 30);
  const linesScore       = Math.min(20, Math.min(1, additions / 500) * 20);
  const consistencyScore = Math.min(20, Math.min(1, activeDays / 3) * 20);
  const qualityScore     = Math.min(15, Math.min(1, estFunctions / 5) * 15);
  const bugScore         = Math.min(15, Math.min(1, bugFixes / 1) * 15);

  const factors = [
    { label: 'Commits',      value: commitScore.toFixed(1),      max: 30 },
    { label: 'Lines Added',  value: linesScore.toFixed(1),       max: 20 },
    { label: 'Consistency',  value: consistencyScore.toFixed(1), max: 20 },
    { label: 'Code Quality', value: qualityScore.toFixed(1),     max: 15 },
    { label: 'Bug Fixes',    value: bugScore.toFixed(1),         max: 15 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
      {factors.map((f) => (
        <div key={f.label} style={{ padding: 8, borderRadius: 6, background: '#f5f8fc', border: '1px solid #dde3f0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1d2433', marginBottom: 4 }}>{f.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#6675ff', marginBottom: 4 }}>{f.value}<span style={{ fontSize: 11, color: '#888' }}>/{f.max}</span></div>
          <div style={{ height: 4, background: '#dde3f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (parseFloat(f.value) / f.max) * 100)}%`, background: '#6675ff', transition: 'width 0.3s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [projectContributions, setProjectContributions] = useState([]);
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [projectSummary, setProjectSummary] = useState({
    totalCommits: 0,
    averageScore: 0,
    totalPullRequests: 0,
    activeCount: 0,
    atRiskCount: 0,
    inactiveCount: 0,
    notContributingCount: 0,
  });
  const [activeProject, setActiveProject] = useState(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Teacher';

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProjects(), fetchTeams(), fetchInactiveStudents()])
      .then(([p, t, alerts]) => {
        setProjects(p || []);
        setTeams(t || []);
        setGlobalAlerts(alerts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const proj = projects[activeProject] || null;

  useEffect(() => {
    const projectId = proj?.id;
    if (projectId) {
      loadProjectContributions(projectId);
    } else {
      setProjectContributions([]);
      setProjectSummary({
        totalCommits: 0,
        averageScore: 0,
        totalPullRequests: 0,
        activeCount: 0,
        atRiskCount: 0,
        inactiveCount: 0,
        notContributingCount: 0,
      });
    }
  }, [proj?.id, projects, activeProject]);

  const loadProjectContributions = async (projectId) => {
    setContribLoading(true);
    try {
      const contributions = await fetchContributions(projectId);
      const list = contributions || [];
      setProjectContributions(list);
      const totalCommits = list.reduce((sum, item) => sum + (item.totalCommits || 0), 0);
      const totalPullRequests = list.reduce((sum, item) => sum + (item.pullRequests || 0), 0);
      const averageScore = list.length > 0
        ? list.reduce((sum, item) => sum + (item.score || 0), 0) / list.length
        : 0;
      const statusCounts = list.reduce((acc, item) => {
        const status = item.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      setProjectSummary({
        totalCommits,
        averageScore,
        totalPullRequests,
        activeCount: statusCounts.ACTIVE || 0,
        atRiskCount: statusCounts.AT_RISK || 0,
        inactiveCount: statusCounts.INACTIVE || 0,
        notContributingCount: statusCounts.NOT_CONTRIBUTING || 0,
      });
    } catch (err) {
      setProjectContributions([]);
      setProjectSummary({
        totalCommits: 0,
        averageScore: 0,
        totalPullRequests: 0,
        activeCount: 0,
        atRiskCount: 0,
        inactiveCount: 0,
        notContributingCount: 0,
      });
    } finally {
      setContribLoading(false);
    }
  };

  // ── computed stats from real data ──
  const activeProjects  = projects.filter(p => p.status !== 'archived').length;
  const totalStudents   = teams.reduce((sum, t) => sum + (t.members ? t.members.length : 0), 0);

  const alertCount = globalAlerts.length;
  const stats = [
    { icon: <FaProjectDiagram />, value: String(activeProjects),  label: 'Active Projects',     trend: '', up: true,  color: '#6675ff' },
    { icon: <FaUsers />,          value: String(teams.length),    label: 'Teams',               trend: '', up: true,  color: '#8c4fff' },
    { icon: <FaUserGraduate />,   value: String(totalStudents),   label: 'Students',            trend: '', up: true,  color: '#2ecc71' },
    { icon: <FaExclamationTriangle />, value: String(alertCount), label: 'Low Contrib Alerts',  trend: '', up: false, color: '#e05c5c' },
    { icon: <FaGithub />,         value: String(projectSummary.totalCommits), label: 'Total Commits', trend: '', up: true,  color: '#6675ff' },
    { icon: <FaCodeBranch />,     value: String(projectSummary.totalPullRequests), label: 'Pull Requests', trend: '', up: true,  color: '#8c4fff' },
    { icon: <FaBug />,            value: String(Math.round(projectSummary.averageScore)), label: 'Avg. Score', trend: '', up: true,  color: '#f39c12' },
    { icon: <FaRobot />,          value: '—',                     label: 'AI Code Detected',    trend: '', up: false, color: '#e05c5c' },
  ];

  // find linked team for active project
  const linkedTeam = proj && proj.teamId
    ? teams.find(t => t.id === proj.teamId)
    : null;

  const members = linkedTeam ? linkedTeam.members || [] : [];

  return (
    <TeacherLayout
      title="Dashboard"
      subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    >

      {/* ── WELCOME BANNER ── */}
      <div className="td-banner">
        <div className="td-banner-left">
          <span className="td-banner-tag"><FaFire /> Active Semester</span>
          <h1>Good Morning, <span>Prof. {displayName}</span> 👋</h1>
          <p>
            You have <strong>{activeProjects} active project{activeProjects !== 1 ? 's' : ''}</strong> and{' '}
            <strong>{teams.length} team{teams.length !== 1 ? 's' : ''}</strong> this semester.
          </p>
          <div className="td-banner-actions">
            <button className="t-btn-primary" onClick={() => navigate('/teacher/projects/create')}>
              <FaPlus /> New Project
            </button>
            <button className="t-btn-ghost" onClick={() => navigate('/teacher/projects')}>
              <MdOutlineAnalytics /> View Projects
            </button>
          </div>
        </div>
        <div className="td-banner-right">
          <div className="td-banner-stat"><h3>{activeProjects}</h3><p>Active Projects</p></div>
          <div className="td-banner-stat"><h3>{teams.length}</h3><p>Teams</p></div>
          <div className="td-banner-stat"><h3>{totalStudents}</h3><p>Students</p></div>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="td-stats">
        {stats.map((s, i) => (
          <div className="td-stat-card" key={i} style={{ '--sc': s.color }}>
            <div className="td-stat-icon">{s.icon}</div>
            <div className="td-stat-body">
              <h2>{s.value}</h2>
              <p>{s.label}</p>
              {s.trend && (
                <span className={s.up ? 'trend-up' : 'trend-down'}>
                  {s.up ? <FaArrowUp /> : <FaArrowDown />} {s.trend} this week
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── PROJECT OVERVIEW ── */}
      <div className="td-section-label"><FaProjectDiagram /> Project Overview</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div className="t-card" style={{ textAlign: 'center', padding: 40 }}>
          <FaLayerGroup style={{ fontSize: 32, color: '#6675ff', marginBottom: 12 }} />
          <p style={{ fontWeight: 700, color: '#1d2433' }}>No projects yet</p>
          <span style={{ fontSize: 13, color: '#888' }}>Create your first project to get started</span>
          <br />
          <button className="t-btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/teacher/projects/create')}>
            <FaPlus /> New Project
          </button>
        </div>
      ) : (
        <>
          {/* PROJECT TABS */}
          <div className="td-proj-tabs">
            {projects.map((p, i) => {
              const sc = statusConfig[p.status] || statusConfig.active;
              return (
                <button
                  key={i}
                  className={`td-proj-tab ${activeProject === i ? 'active' : ''}`}
                  onClick={() => setActiveProject(i)}
                >
                  <span className="td-tab-dot" style={{ background: sc.color }} />
                  {p.icon || '📁'} {p.name}
                </button>
              );
            })}
          </div>

          {proj && (
            <div className="td-proj-detail">
              {/* LEFT */}
              <div className="td-proj-left">
                <div className="t-card td-proj-card">
                  <div className="td-proj-header">
                    <div>
                      <h3>{proj.icon || '📁'} {proj.name}</h3>
                      <p>
                        <FaUsers /> {linkedTeam ? linkedTeam.teamName : 'No team linked'} ·{' '}
                        {members.length} Students
                      </p>
                    </div>
                    <span
                      className="td-status-badge"
                      style={{
                        color: (statusConfig[proj.status] || statusConfig.active).color,
                        background: (statusConfig[proj.status] || statusConfig.active).bg,
                      }}
                    >
                      {(statusConfig[proj.status] || statusConfig.active).label}
                    </span>
                  </div>

                  {/* project info */}
                  <div className="td-proj-mini-stats">
                    <div className="td-mini-stat"><FaCalendarAlt /><span style={{ fontSize: 11 }}>{proj.startDate || '—'}</span><p>Start</p></div>
                    <div className="td-mini-stat"><FaCalendarAlt /><span style={{ fontSize: 11 }}>{proj.endDate || '—'}</span><p>End</p></div>
                    <div className="td-mini-stat"><FaGithub /><span style={{ fontSize: 10 }}>{proj.githubRepoName ? proj.githubRepoName.replace('https://github.com/', '') : '—'}</span><p>Repo</p></div>
                    <div className="td-mini-stat"><FaCodeBranch /><span>{proj.githubBranch || '—'}</span><p>Branch</p></div>
                    <div className="td-mini-stat"><MdGrade /><span>{proj.totalMarks || '—'}</span><p>Marks</p></div>
                  </div>

                  {/* members */}
                  {members.length > 0 && (
                    <div className="td-members">
                      <span className="td-members-label">Team Members</span>
                      <div className="td-avatars">
                        {members.map((m, i) => (
                          <div className="td-avatar" key={i} title={m.name}>
                            {(m.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* TEAM CONTRIBUTION SUMMARY */}
                <div className="t-card">
                  <div className="t-section-head"><BsBarChartFill /> Team Contribution Summary</div>
                  {contribLoading ? (
                    <p style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>Loading contributions...</p>
                  ) : projectContributions.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>No contributions analyzed yet. Use the Contribution Dashboard to analyze GitHub data.</p>
                  ) : (
                    <div className="td-contribs">
                      {projectContributions.map((entry, i) => {
                        const rawScore = entry.score || 0;
                        const commits = entry.totalCommits || 0;
                        const adds = entry.linesAdded || 0;
                        const computedScore = rawScore > 0 ? rawScore : (commits > 0 ? Math.min(100, Math.round(50 + commits * 15 + adds * 0.05)) : 0);
                        const effectiveStatus = (commits > 0 || computedScore > 0)
                          ? contributionStatus.ACTIVE
                          : (contributionStatus[entry.status] || contributionStatus.NOT_CONTRIBUTING);

                        return (
                          <div className="td-contrib-row" key={i}>
                            <div className="td-contrib-avatar" style={{ background: 'linear-gradient(135deg,#6675ff,#8c4fff)' }}>
                              {(entry.studentName || entry.studentUsn || '?')[0].toUpperCase()}
                            </div>
                            <div className="td-contrib-info">
                              <div className="td-contrib-top">
                                <span className="td-contrib-name">{entry.studentName || entry.studentUsn}</span>
                                <span className="td-contrib-role">{entry.studentUsn}</span>
                                <span className="td-contrib-commits">{Math.round(computedScore)}%</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                                {commits} commit{commits !== 1 ? 's' : ''} · {adds} + · {entry.linesDeleted || 0} -
                              </div>
                            </div>
                            <span className="td-status-badge" style={{ color: effectiveStatus.color, background: effectiveStatus.bg }}>{effectiveStatus.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="td-proj-right">

                        {/* ALL PROJECTS SUMMARY */}
                <div className="t-card">
                  <div className="t-section-head"><FaProjectDiagram /> All Projects</div>
                  <div className="td-alerts">
                    {projects.map((p, i) => {
                      const sc = statusConfig[p.status] || statusConfig.active;
                      const pt = teams.find(t => t.id === p.teamId);
                      return (
                        <div
                          key={i}
                          className="td-alert-item"
                          style={{ background: 'rgba(102,117,255,0.05)', borderLeft: `3px solid ${sc.color}`, cursor: 'pointer' }}
                          onClick={() => navigate(`/teacher/projects/${p.id}`)}
                        >
                          <div className="td-alert-icon" style={{ background: `${sc.bg}`, color: sc.color, fontSize: 18 }}>
                            {p.icon || '📁'}
                          </div>
                          <div className="td-alert-body">
                            <div className="td-alert-title">{p.name}</div>
                            <p style={{ fontSize: 11 }}>{pt ? pt.teamName : 'No team'} · {p.semester || '—'}</p>
                            <span className="td-alert-time"><FaCalendarAlt /> {p.endDate || 'No deadline'}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, padding: '3px 8px', background: sc.bg, borderRadius: 10, flexShrink: 0 }}>
                            {sc.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LOW CONTRIBUTION ALERTS */}
                <div className="t-card">
                  <div className="t-section-head"><FaExclamationTriangle /> Contribution Alerts</div>
                  {globalAlerts.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>No low-contribution alerts at the moment.</p>
                  ) : (
                    <div className="td-feed">
                      {globalAlerts.slice(0, 4).map((item, index) => (
                        <div className="td-feed-item" key={index}>
                          <div className="td-feed-avatar" style={{ background: 'rgba(224,92,92,0.1)', color: '#e05c5c' }}>!</div>
                          <div className="td-feed-body">
                            <p>{item.studentName ? `${item.studentName} (${item.studentUsn})` : item.studentUsn || 'Student'}</p>
                            <div className="td-feed-meta">
                              <span>Status: {item.status}</span>
                              <span className="td-feed-proj">Score: {Math.round(item.score || 0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {globalAlerts.length > 4 && (
                        <div style={{ fontSize: 12, color: '#888', paddingTop: 8 }}>
                          +{globalAlerts.length - 4} more low-contribution alerts
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TEAMS SUMMARY */}
                <div className="t-card">
                  <div className="t-section-head"><FaBolt /> Teams Overview</div>
                  {teams.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>No teams yet.</p>
                  ) : (
                    <div className="td-feed">
                      {teams.map((t, i) => {
                        const lead = t.members ? t.members.find(m => m.usn === t.teamLeadUsn) : null;
                        return (
                          <div className="td-feed-item" key={i}>
                            <div className="td-feed-avatar" style={{ background: 'linear-gradient(135deg,#6675ff,#8c4fff)' }}>
                              {t.teamName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="td-feed-body">
                              <p><strong>{t.teamName}</strong> — {t.projectName}</p>
                              <div className="td-feed-meta">
                                <span><FaUsers /> {t.members ? t.members.length : 0} members</span>
                                {lead && <span className="td-feed-proj">Lead: {lead.name}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* ── BOTTOM ROW ── */}
      <div className="td-bottom-row">

        {/* GITHUB REPOS */}
        <div className="t-card">
          <div className="t-section-head"><FaGithub /> GitHub Repositories</div>
          <div className="td-ai-grid">
            {projects.filter(p => p.githubRepoName).length === 0 ? (
              <p style={{ fontSize: 13, color: '#888' }}>No repositories linked yet.</p>
            ) : (
              projects.filter(p => p.githubRepoName).map((p, i) => (
                <div className="td-ai-row" key={i}>
                  <div className="td-ai-info">
                    <span className="td-ai-proj">{p.name}</span>
                    <span className="td-ai-team">{p.githubVisibility || 'private'}</span>
                  </div>
                  <div className="td-bar-bg td-ai-bar">
                    <div className="td-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#6675ff,#8c4fff)' }} />
                  </div>
                  <span className="td-ai-pct" style={{ color: '#6675ff' }}>
                    <FaCheckCircle /> <FaCodeBranch /> {p.githubBranch || 'main'}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="td-ai-note"><FaShieldAlt /> Repos created via GitHub Settings config</p>
        </div>

        {/* PROJECT SETTINGS SUMMARY */}
        <div className="t-card">
          <div className="t-section-head"><MdGrade /> Project Settings</div>
          <div className="td-grades">
            {projects.length === 0 ? (
              <p style={{ fontSize: 13, color: '#888' }}>No projects yet.</p>
            ) : (
              projects.map((p, i) => (
                <div className="td-grade-row" key={i}>
                  <div className="td-grade-proj">
                    <span>{p.icon || '📁'} {p.name}</span>
                    <span className="td-grade-team">{p.semester || '—'} · {p.totalMarks || '—'} marks</span>
                  </div>
                  <div className="td-grade-pills">
                    {[
                      { label: 'AI', val: p.aiDetect },
                      { label: 'Review', val: p.reviewImpact },
                      { label: 'Bugs', val: p.bugTracking },
                    ].map(f => (
                      <div key={f.label} className="td-grade-pill" style={{
                        background: f.val ? 'rgba(46,204,113,0.15)' : 'rgba(224,92,92,0.15)',
                        color: f.val ? '#2ecc71' : '#e05c5c',
                      }}>
                        {f.label} {f.val ? '✓' : '✗'}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </TeacherLayout>
  );
}
