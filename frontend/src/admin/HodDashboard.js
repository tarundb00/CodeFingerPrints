import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFingerPrint } from 'react-icons/io5';
import {
  FaProjectDiagram, FaUsers, FaUserGraduate, FaExclamationTriangle,
  FaCheckCircle, FaClock, FaSignOutAlt, FaChartBar, FaGithub,
  FaEnvelope, FaCalendarAlt,
} from 'react-icons/fa';
import { fetchProjects, fetchTeams, fetchInactiveStudents } from '../services/api';

const statusColor = {
  active:   { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)'  },
  'at-risk':{ color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
  ahead:    { color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  archived: { color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};

const inactiveColor = {
  AT_RISK:          { color: '#f39c12', bg: 'rgba(243,156,18,0.12)',  label: 'At Risk'          },
  INACTIVE:         { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)',   label: 'Inactive'         },
  NOT_CONTRIBUTING: { color: '#95a5a6', bg: 'rgba(149,165,166,0.12)', label: 'Not Contributing' },
};

export default function HodDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects]   = useState([]);
  const [teams, setTeams]         = useState([]);
  const [inactive, setInactive]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([fetchProjects(), fetchTeams(), fetchInactiveStudents()])
      .then(([p, t, i]) => { setProjects(p || []); setTeams(t || []); setInactive(i || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const totalStudents = teams.reduce((s, t) => s + (t.members ? t.members.length : 0), 0);
  const activeProjects = projects.filter(p => p.status !== 'archived').length;
  const criticalCount = inactive.filter(s => s.status === 'NOT_CONTRIBUTING' || s.status === 'INACTIVE').length;

  const stats = [
    { icon: <FaProjectDiagram />, label: 'Active Projects',   value: activeProjects,    color: '#6675ff' },
    { icon: <FaUsers />,          label: 'Total Teams',       value: teams.length,      color: '#8c4fff' },
    { icon: <FaUserGraduate />,   label: 'Total Students',    value: totalStudents,     color: '#2ecc71' },
    { icon: <FaExclamationTriangle />, label: 'Critical Alerts', value: criticalCount,  color: '#e05c5c' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg,#0f1117 0%,#1a1d2e 100%)', color: '#fff', fontFamily: 'Inter,sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 24px' }}>
          <IoFingerPrint style={{ fontSize: 28, color: '#6675ff' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>CodeFingerPrint</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>HOD Portal</div>
          </div>
        </div>

        {[
          { icon: <FaChartBar />,       label: 'Overview',  active: true },
          { icon: <FaProjectDiagram />, label: 'Projects',  active: false },
          { icon: <FaUsers />,          label: 'Teams',     active: false },
          { icon: <FaExclamationTriangle />, label: 'Alerts', active: false },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', background: item.active ? 'rgba(102,117,255,0.12)' : 'transparent', borderLeft: item.active ? '3px solid #6675ff' : '3px solid transparent', fontSize: 14, opacity: item.active ? 1 : 0.6 }}>
            {item.icon} {item.label}
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', opacity: 0.6, fontSize: 14 }} onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>HOD Dashboard</h2>
          <p style={{ margin: '4px 0 0', opacity: 0.5, fontSize: 13 }}>
            Welcome, {user.firstName || 'HOD'} — Full department overview
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}>Loading...</div>
        ) : (
          <>
            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 28, color: s.color, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* CRITICAL ALERT BANNER */}
            {criticalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', marginBottom: 24, fontSize: 14 }}>
                <FaExclamationTriangle style={{ color: '#e05c5c', fontSize: 18 }} />
                <span><strong style={{ color: '#e05c5c' }}>{criticalCount} student{criticalCount > 1 ? 's' : ''}</strong> have not contributed in 14+ days. Email alerts have been sent automatically.</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              {/* INACTIVE STUDENTS */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaExclamationTriangle style={{ color: '#e05c5c' }} /> Inactive / At-Risk Students
                </div>
                {inactive.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.4 }}>
                    <FaCheckCircle style={{ fontSize: 28, color: '#2ecc71', marginBottom: 8 }} />
                    <p style={{ margin: 0 }}>All students are active!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inactive.map(s => {
                      const cfg = inactiveColor[s.status] || inactiveColor.NOT_CONTRIBUTING;
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                            {(s.studentName || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.studentName || s.studentUsn}</div>
                            <div style={{ fontSize: 11, opacity: 0.5 }}>{s.studentUsn} • {s.studentEmail || '—'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Score: {Math.round(s.score || 0)}/100</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ALL PROJECTS */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaProjectDiagram style={{ color: '#6675ff' }} /> All Projects
                </div>
                {projects.length === 0 ? (
                  <p style={{ opacity: 0.4, fontSize: 13 }}>No projects yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {projects.map(p => {
                      const sc = statusColor[p.status] || statusColor.active;
                      const team = teams.find(t => t.id === p.teamId);
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `3px solid ${sc.color}` }}>
                          <div style={{ fontSize: 22 }}>{p.icon || '📁'}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.5 }}>
                              {team ? team.teamName : 'No team'} · {p.semester || '—'}
                            </div>
                            {p.endDate && (
                              <div style={{ fontSize: 11, opacity: 0.4, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <FaCalendarAlt /> Deadline: {p.endDate}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                            {p.status || 'active'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* TEAMS TABLE */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaUsers style={{ color: '#8c4fff' }} /> Teams Overview
              </div>
              {teams.length === 0 ? (
                <p style={{ opacity: 0.4, fontSize: 13 }}>No teams yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ opacity: 0.5, textAlign: 'left' }}>
                        {['Team', 'Project', 'Members', 'Lead', 'GitHub Repo', 'End Date'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map(t => {
                        const lead = t.members ? t.members.find(m => m.usn === t.teamLeadUsn) : null;
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.teamName}</td>
                            <td style={{ padding: '10px 12px', opacity: 0.7 }}>{t.projectName}</td>
                            <td style={{ padding: '10px 12px' }}>{t.members ? t.members.length : 0}</td>
                            <td style={{ padding: '10px 12px', opacity: 0.7 }}>{lead ? lead.name : t.teamLeadUsn || '—'}</td>
                            <td style={{ padding: '10px 12px', opacity: 0.7 }}>
                              {t.githubRepoName
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FaGithub /> {t.githubRepoName}</span>
                                : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', opacity: 0.7 }}>{t.endDate || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
