import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import {
  FaGithub, FaCodeBranch, FaCalendarAlt,
  FaExternalLinkAlt, FaExclamationTriangle,
  FaRobot, FaShieldAlt, FaBug, FaUsers, FaFolder, FaLink,
  FaChartBar, FaCog,
} from 'react-icons/fa';
import { MdGrade } from 'react-icons/md';
import { fetchStudentDashboard } from '../services/api';
import { buildGitHubRepoUrl } from '../utils/githubRepo';

const statusCfg = {
  active:   { label: 'Active',   color: '#2ecc71', bg: 'rgba(46,204,113,0.12)'  },
  'at-risk':{ label: 'At Risk',  color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
  ahead:    { label: 'Ahead',    color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  archived: { label: 'Archived', color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};
const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

export default function StudentProject() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  useEffect(() => {
    if (!student.usn) { setLoading(false); return; }
    fetchStudentDashboard(student.usn)
      .then(d => { setData(d); setError(null); })
      .catch(e => { setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const project    = data?.project || null;
  const team       = data?.team || null;
  let gradingWeights = {};
  if (project?.gradingWeights) { try { gradingWeights = JSON.parse(project.gradingWeights); } catch {} }
  const sc = statusCfg[project?.status] || statusCfg.active;
  let daysLeft = null, deadlineColor = '#f39c12';
  if (project?.endDate) {
    daysLeft = Math.ceil((new Date(project.endDate) - new Date()) / 86400000);
    deadlineColor = daysLeft <= 3 ? '#e05c5c' : daysLeft <= 7 ? '#f39c12' : '#2ecc71';
  }

  return (
    <StudentLayout title="My Project" subtitle="Full project details and progress">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading project...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ color: '#e05c5c', fontSize: 16, fontWeight: 700, marginBottom: 8 }}><FaExclamationTriangle style={{ marginRight: 8 }} />Failed to load</div>
          <div style={{ color: C.muted, fontSize: 13 }}>{error}</div>
        </div>
      ) : !project ? (
        <div className="s-empty"><div className="s-empty-icon"><FaFolder /></div><p>No project assigned yet</p><span>Your teacher will assign you to a project soon</span></div>
      ) : (
        <>
          <div className="s-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.text }}>{project.name}</h2>
                <p style={{ margin: '0 0 10px', fontSize: 14, color: C.muted, maxWidth: 500 }}>{project.description}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span className="s-badge-pill" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                  {project.semester && <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>{project.semester}</span>}
                  {project.academicYear && <span className="s-badge-pill" style={{ color: '#8c4fff', background: 'rgba(140,79,255,0.12)' }}>{project.academicYear}</span>}
                </div>
              </div>
              {daysLeft !== null && (
                <div style={{ textAlign: 'center', padding: '16px 24px', borderRadius: 14, background: `${deadlineColor}18`, border: `1px solid ${deadlineColor}44` }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: deadlineColor }}>{daysLeft}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>days left</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              {[
                { icon: <FaCalendarAlt />, label: 'Start Date',  value: project.startDate || '—' },
                { icon: <FaCalendarAlt />, label: 'End Date',    value: project.endDate || '—' },
                { icon: <MdGrade />,       label: 'Total Marks', value: project.totalMarks || '—' },
                { icon: <FaUsers />,       label: 'Team',        value: team?.teamName || '—' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text }}>
                  <span style={{ color: '#6675ff' }}>{m.icon}</span>
                  <span style={{ color: C.muted }}>{m.label}:</span>
                  <strong>{m.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="s-grid-2">
            <div className="s-card">
              <div className="s-card-head"><FaGithub /> GitHub Repository</div>
              {!project.githubRepoName ? (
                <div className="s-empty"><div className="s-empty-icon"><FaLink /></div><p>No repo linked yet</p></div>
              ) : (
                <>
                  {[
                    { label: 'Repository', value: project.githubRepoName, icon: <FaGithub /> },
                    { label: 'Branch',     value: project.githubBranch || 'main', icon: <FaCodeBranch /> },
                    { label: 'Visibility', value: project.githubVisibility || 'private', icon: <FaShieldAlt /> },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, color: C.text }}>
                      <span style={{ color: '#6675ff', fontSize: 14 }}>{r.icon}</span>
                      <span style={{ color: C.muted, fontSize: 13, width: 90 }}>{r.label}</span>
                      <strong style={{ fontSize: 13 }}>{r.value}</strong>
                    </div>
                  ))}
                  <a href={buildGitHubRepoUrl(project.githubRepoName, project?.githubOwner || '') || '#'} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, color: '#6675ff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    <FaExternalLinkAlt /> Open on GitHub
                  </a>
                </>
              )}
            </div>
            <div className="s-card">
              <div className="s-card-head"><MdGrade /> Grading Breakdown</div>
              {Object.keys(gradingWeights).length === 0 ? (
                <div className="s-empty"><div className="s-empty-icon"><FaChartBar /></div><p>No grading weights set</p></div>
              ) : (
                Object.entries(gradingWeights).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.text }}>
                      <span style={{ color: C.muted, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <strong style={{ color: '#6675ff' }}>{val}%</strong>
                    </div>
                    <div className="s-bar-bg"><div className="s-bar-fill" style={{ width: `${val}%`, background: 'linear-gradient(90deg,#6675ff,#8c4fff)' }} /></div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="s-card">
            <div className="s-card-head"><FaCog /> Project Features</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'AI Detection',  val: project.aiDetect,     icon: <FaRobot />,    color: '#8c4fff' },
                { label: 'Review Impact', val: project.reviewImpact, icon: <FaShieldAlt />,color: '#6675ff' },
                { label: 'Bug Tracking',  val: project.bugTracking,  icon: <FaBug />,      color: '#f39c12' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 16, background: f.val ? `${f.color}18` : '#eef1f8', border: `1px solid ${f.val ? f.color + '44' : C.border}`, boxShadow: f.val ? 'none' : '4px 4px 10px #d1d9e6,-4px -4px 10px #ffffff' }}>
                  <span style={{ color: f.val ? f.color : '#bbc3d4', fontSize: 16 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: f.val ? C.text : C.muted }}>{f.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: f.val ? '#2ecc71' : '#e05c5c' }}>{f.val ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </StudentLayout>
  );
}
