import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import {
  FaChalkboardTeacher, FaProjectDiagram, FaUsers, FaBell,
  FaExclamationTriangle, FaEye, FaCheckCircle, FaClock,
  FaChartBar, FaTrophy, FaUserGraduate, FaGithub,
  FaArrowUp, FaArrowDown, FaCircle, FaSync,
} from 'react-icons/fa';
import './AdminDashboard.css';
import useToast from '../components/useToast';
import Toast from '../components/Toast';
import { fetchTeachers, fetchProjects, fetchTeams, fetchStudents, fetchInactiveStudents, fetchAllContributions } from '../services/api';

const alertColor = { high: '#e05c5c', medium: '#f39c12', low: '#2ecc71' };
const alertBg    = { high: 'rgba(224,92,92,0.1)', medium: 'rgba(243,156,18,0.1)', low: 'rgba(46,204,113,0.1)' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();
  const [dismissed, setDismissed] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherLoadError, setTeacherLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboardData = async () => {
      setLoading(true);
      setTeacherLoadError('');
      try {
        const results = await Promise.allSettled([
          fetchTeachers(),
          fetchProjects(),
          fetchTeams(),
          fetchStudents(),
          fetchInactiveStudents(),
          fetchAllContributions(),
        ]);

        const [teacherResult, projectResult, teamResult, studentResult, alertResult, contribResult] = results;

        setTeachers(teacherResult.status === 'fulfilled' && Array.isArray(teacherResult.value) ? teacherResult.value : []);
        if (teacherResult.status === 'rejected') {
          setTeacherLoadError('Teacher data is temporarily unavailable. Please retry.');
        }
        setProjects(projectResult.status === 'fulfilled' && Array.isArray(projectResult.value) ? projectResult.value : []);
        setTeams(teamResult.status === 'fulfilled' && Array.isArray(teamResult.value) ? teamResult.value : []);
        setStudents(studentResult.status === 'fulfilled' && Array.isArray(studentResult.value) ? studentResult.value : []);
        setAlerts(alertResult.status === 'fulfilled' && Array.isArray(alertResult.value) ? alertResult.value : []);
        setContributions(contribResult.status === 'fulfilled' && Array.isArray(contribResult.value) ? contribResult.value : []);

        const names = ['teachers', 'projects', 'teams', 'students', 'alerts', 'contributions'];
        const failed = results
          .map((result, index) => result.status === 'rejected' ? names[index] : null)
          .filter(Boolean)
          .join(', ');

        if (failed) {
          toast.error(`Some dashboard data could not be loaded: ${failed}`);
        }
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
        toast.error(error.message || 'Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => { loadDashboardData(); }, [refreshKey]);

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id || `${a.studentUsn}-${a.status}`));
  const activeProjects = projects.filter(p => !['archived', 'completed'].includes((p.status || '').toLowerCase())).length;
  const completedProjects = projects.filter(p => ['completed', 'archived'].includes((p.status || '').toLowerCase())).length;
  const atRiskCount = visibleAlerts.length;

  const stats = [
    { icon: <FaChalkboardTeacher />, label: 'Teachers', value: teachers.length, trend: '+0', up: true, color: '#6675ff', bg: 'rgba(102,117,255,0.12)', path: '/admin/add-teacher' },
    { icon: <FaProjectDiagram />, label: 'Projects', value: projects.length, trend: '+0', up: true, color: '#8c4fff', bg: 'rgba(140,79,255,0.12)', path: '/teacher/projects' },
    { icon: <FaUsers />, label: 'Teams', value: teams.length, trend: '+0', up: true, color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', path: '/teacher/teams' },
    { icon: <FaBell />, label: 'Alerts', value: visibleAlerts.length, trend: '+0', up: false, color: '#e05c5c', bg: 'rgba(224,92,92,0.12)', path: '/teacher/alerts' },
    { icon: <FaUserGraduate />, label: 'Students', value: students.length, trend: '+0', up: true, color: '#f39c12', bg: 'rgba(243,156,18,0.12)', path: '#' },
    { icon: <FaGithub />, label: 'Active Projects', value: activeProjects, trend: '+0', up: true, color: '#1d2433', bg: 'rgba(29,36,51,0.08)', path: '#' },
    { icon: <FaTrophy />, label: 'Completed', value: completedProjects, trend: '+0', up: true, color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', path: '#' },
    { icon: <FaClock />, label: 'At Risk', value: atRiskCount, trend: '+0', up: false, color: '#f39c12', bg: 'rgba(243,156,18,0.12)', path: '#' },
  ];

  const summaryItems = [
    { name: 'Teachers', value: teachers.length, color: '#6675ff' },
    { name: 'Projects', value: projects.length, color: '#8c4fff' },
    { name: 'Teams', value: teams.length, color: '#2ecc71' },
    { name: 'Students', value: students.length, color: '#f39c12' },
  ];

  return (
    <>
    <AdminLayout title="Admin Dashboard" subtitle="Department of Computer Science & Engineering">

      <div className="ad-dashboard-toolbar">
        <div>
          <strong>Department Overview</strong>
          <span>Live operational data from the academic workspace</span>
        </div>
        <button className="ad-refresh-btn" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
          <FaSync className={loading ? 'ad-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </div>

      {/* ── STATS GRID ── */}
      <div className="ad-stats-grid">
        {stats.map((s, i) => (
          <div
            className="ad-stat-card"
            key={s.label}
            style={{ animationDelay: `${i * 0.06}s`, '--sc': s.color, '--sb': s.bg }}
            onClick={() => s.path !== '#' && navigate(s.path)}
          >
            <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="ad-stat-body">
              <h3 style={{ color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
            <div className={`ad-stat-trend ${s.up ? 'up' : 'down'}`}>
              {s.up ? <FaArrowUp /> : <FaArrowDown />}
              {s.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── PERFORMANCE CHART ── */}
      <div className="t-card ad-chart-card">
        <div className="t-section-head">
          <FaChartBar /> Live Department Summary
        </div>
        <div className="ad-chart">
          {summaryItems.map((item, i) => (
            <div className="ad-chart-col" key={item.name} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="ad-bars">
                <div className="ad-bar-wrap" title={`${item.name}: ${item.value}`}>
                  <div className="ad-bar" style={{ height: `${Math.min(100, Math.max(20, item.value * 10))}%`, background: `linear-gradient(180deg,${item.color},${item.color})` }} />
                </div>
              </div>
              <div className="ad-chart-label">{item.name}</div>
              <div className="ad-chart-vals">
                <span style={{ color: item.color }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTRIBUTION OVERVIEW ── */}
      {contributions.length > 0 && (
        <div className="t-card" style={{ marginBottom: 24 }}>
          <div className="t-section-head">
            <FaGithub /> GitHub Contribution Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginTop: 16 }}>
            {[
              { label: 'Total Analyzed', value: contributions.length, color: '#6675ff' },
              { label: 'Active', value: contributions.filter(c => c.status === 'ACTIVE').length, color: '#2ecc71' },
              { label: 'At Risk', value: contributions.filter(c => c.status === 'AT_RISK').length, color: '#f39c12' },
              { label: 'Inactive', value: contributions.filter(c => c.status === 'INACTIVE').length, color: '#e05c5c' },
              { label: 'Not Contributing', value: contributions.filter(c => c.status === 'NOT_CONTRIBUTING').length, color: '#95a5a6' },
              { label: 'Avg Score', value: contributions.length ? Math.round(contributions.reduce((s, c) => s + (c.score || 0), 0) / contributions.length) + '%' : '—', color: '#8c4fff' },
            ].map(card => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...contributions].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6675ff,#8b9aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {(c.studentName || c.studentUsn || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.studentName || c.studentUsn}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{c.studentUsn} · {c.totalCommits || 0} commits</div>
                </div>
                <div style={{ width: 100 }}>
                  <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${Math.round(c.score || 0)}%`, background: (c.score || 0) > 60 ? '#2ecc71' : (c.score || 0) > 30 ? '#f39c12' : '#e05c5c' }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6675ff', minWidth: 36, textAlign: 'right' }}>{Math.round(c.score || 0)}%</span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                  color: c.status === 'ACTIVE' ? '#2ecc71' : c.status === 'AT_RISK' ? '#f39c12' : '#e05c5c',
                  background: c.status === 'ACTIVE' ? 'rgba(46,204,113,0.12)' : c.status === 'AT_RISK' ? 'rgba(243,156,18,0.12)' : 'rgba(224,92,92,0.12)' }}>
                  {c.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM GRID: TABLE + ALERTS ── */}
      <div className="ad-bottom-grid">

        {/* TEACHERS TABLE */}
        <div className="t-card ad-table-card">
          <div className="t-section-head">
            <FaChalkboardTeacher /> Teachers List
            <button className="ad-view-all" onClick={() => navigate('/admin/add-teacher')}>
              View All
            </button>
          </div>
          <div className="ad-table-wrap">
            {loading ? (
              <div style={{ padding: 20, color: '#888' }}>Loading teacher data...</div>
            ) : teacherLoadError ? (
              <div style={{ padding: 20, color: '#b42318' }}>
                {teacherLoadError}
                <button className="ad-view-all" onClick={() => window.location.reload()} style={{ marginLeft: 12 }}>
                  Retry
                </button>
              </div>
            ) : (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, i) => {
                    const name = [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.name || 'Unnamed teacher';
                    const isActive = teacher.active !== false && teacher.status !== 'inactive';
                    return (
                      <tr key={teacher.id} style={{ animationDelay: `${i * 0.07}s` }}>
                        <td className="ad-td-num">{i + 1}</td>
                        <td>
                          <div className="ad-td-name">
                            <div className="ad-td-avatar" style={{ background: '#6675ff' }}>{name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'T'}</div>
                            <div>
                              <span className="ad-td-fullname">{name}</span>
                              <span className="ad-td-dept">{teacher.department || 'Teacher'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="ad-td-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.1)' }}>{teacher.email || '—'}</span></td>
                        <td><span className="ad-td-pill" style={{ color: '#8c4fff', background: 'rgba(140,79,255,0.1)' }}>{teacher.phone || '—'}</span></td>
                        <td>
                          <span className={`ad-status ${isActive ? 'active' : 'inactive'}`}>
                            <FaCircle />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="ad-view-btn" onClick={() => navigate('/admin/add-teacher')}>
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div className="t-card ad-alerts-card">
          <div className="t-section-head">
            <FaExclamationTriangle /> Escalated Alerts
            <span className="ad-alert-count">{visibleAlerts.length}</span>
          </div>

          {visibleAlerts.length === 0 ? (
            <div className="ad-no-alerts">
              <FaCheckCircle />
              <p>All clear! No active alerts.</p>
            </div>
          ) : (
            <div className="ad-alerts-list">
              {visibleAlerts.map((a, i) => {
                const level = a.status === 'NOT_CONTRIBUTING' || a.status === 'INACTIVE' ? 'high' : 'medium';
                const title = a.status === 'NOT_CONTRIBUTING' ? 'No contribution detected' : 'Low contribution activity';
                const desc = `${a.studentName || a.studentUsn || 'Student'} · ${a.totalCommits || 0} commits · score ${Math.round(a.score || 0)}%`;
                const alertId = a.id || `${a.studentUsn}-${a.status}`;
                return (
                  <div
                    className="ad-alert-item"
                    key={alertId}
                    style={{
                      borderLeft: `4px solid ${alertColor[level]}`,
                      background: alertBg[level],
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    <div className="ad-alert-top">
                      <span className="ad-alert-icon" style={{ color: alertColor[level] }}><FaExclamationTriangle /></span>
                      <div className="ad-alert-info">
                        <div className="ad-alert-title">
                          <span className={`ad-alert-badge ${level}`}>{level}</span>
                          {title}
                        </div>
                        <p className="ad-alert-desc">{desc}</p>
                        <div className="ad-alert-meta">
                          <FaChalkboardTeacher /> {a.studentUsn || 'System'}
                          <FaClock style={{ marginLeft: 10 }} /> {a.status || 'Live' }
                        </div>
                      </div>
                      <button
                        className="ad-dismiss-btn"
                        title="Dismiss"
                        onClick={() => {
                          setDismissed(d => [...d, alertId]);
                          toast.info('Alert dismissed');
                        }}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button className="t-btn-ghost ad-alerts-all" onClick={() => navigate('/teacher/alerts')}>
            <FaBell /> View All Alerts
          </button>
        </div>

      </div>
    </AdminLayout>
    <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
