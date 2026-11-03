import React, { useEffect, useMemo, useState } from 'react';
import StudentLayout from './StudentLayout';
import {
  FaCalendarAlt, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaBullseye, FaFolder, FaUsers, FaShieldAlt,
} from 'react-icons/fa';
import { MdGrade } from 'react-icons/md';
import { fetchStudentDashboard, completeMilestone, uncompleteMilestone } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';

const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

export default function TeamMilestones() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const { toasts, removeToast, toast } = useToast();
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));
  const studentUsn = student.usn || '';

  const load = () => {
    if (!studentUsn) {
      setLoading(false);
      return;
    }
    fetchStudentDashboard(studentUsn)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [studentUsn]);

  const project = data?.project || null;
  const team = data?.team || null;
  const milestones = useMemo(() => Array.isArray(data?.milestones) ? data.milestones : [], [data?.milestones]);

  const stats = useMemo(() => {
    const completed = milestones.filter(m => m.done).length;
    const approved = milestones.filter(m => m.approved).length;
    const pending = milestones.filter(m => m.done && !m.approved).length;
    return { completed, approved, pending };
  }, [milestones]);

  const handleToggle = async (milestone) => {
    if (!milestone.id) return;
    setToggling(milestone.id);
    try {
      if (milestone.done) {
        await uncompleteMilestone(milestone.id);
        toast.info(`Marked "${milestone.title}" incomplete`);
      } else {
        await completeMilestone(milestone.id, studentUsn);
        toast.success(`Submitted "${milestone.title}" for review`);
      }
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update milestone');
    } finally {
      setToggling(null);
    }
  };

  const daysLeft = project?.endDate
    ? Math.ceil((new Date(project.endDate) - new Date()) / 86400000)
    : null;
  const deadlineColor = daysLeft === null ? '#6675ff' : daysLeft <= 3 ? '#e05c5c' : daysLeft <= 7 ? '#f39c12' : '#2ecc71';

  return (
    <StudentLayout title="Team Milestones" subtitle="Milestones use the same project layout and live backend data only">
      <Toast toasts={toasts} removeToast={removeToast} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading milestones...</div>
      ) : !project ? (
        <div className="s-empty" style={{ marginTop: 60 }}>
          <div className="s-empty-icon"><FaFolder /></div>
          <p>No project assigned yet</p>
          <span>Your milestones will appear after a project is assigned</span>
        </div>
      ) : (
        <>
          <div className="s-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: C.text }}>{project.name}</h2>
                <p style={{ margin: '0 0 10px', fontSize: 14, color: C.muted, maxWidth: 560 }}>{project.description}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {project.semester && <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>{project.semester}</span>}
                  {project.academicYear && <span className="s-badge-pill" style={{ color: '#8c4fff', background: 'rgba(140,79,255,0.12)' }}>{project.academicYear}</span>}
                  {team?.teamName && <span className="s-badge-pill" style={{ color: '#2ecc71', background: 'rgba(46,204,113,0.12)' }}>{team.teamName}</span>}
                  <span className="s-badge-pill" style={{ color: deadlineColor, background: `${deadlineColor}18` }}>
                    {daysLeft === null ? 'No deadline set' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                  </span>
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
                { icon: <FaCalendarAlt />, label: 'Start Date', value: project.startDate || '—' },
                { icon: <FaCalendarAlt />, label: 'End Date', value: project.endDate || '—' },
                { icon: <FaUsers />, label: 'Team', value: team?.teamName || '—' },
                { icon: <MdGrade />, label: 'Milestones', value: milestones.length },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text }}>
                  <span style={{ color: '#6675ff' }}>{item.icon}</span>
                  <span style={{ color: C.muted }}>{item.label}:</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="s-grid-2" style={{ marginTop: 20 }}>
            <div className="s-card">
              <div className="s-card-head"><FaCheckCircle /> Milestone Progress</div>
              {milestones.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.text }}>
                    <span style={{ color: C.muted }}>Overall Progress</span>
                    <strong style={{ color: '#2ecc71' }}>{stats.completed}/{milestones.length}</strong>
                  </div>
                  <div className="s-bar-bg" style={{ height: 10 }}>
                    <div className="s-bar-fill" style={{ width: `${milestones.length ? Math.round((stats.completed / milestones.length) * 100) : 0}%`, background: 'linear-gradient(90deg,#2ecc71,#1abc9c)' }} />
                  </div>
                </div>
              )}

              {milestones.length === 0 ? (
                <div className="s-empty"><div className="s-empty-icon"><FaBullseye /></div><p>No milestones defined</p></div>
              ) : (
                milestones.map((m, index) => {
                  const isOverdue = !m.done && m.dueDate && new Date(m.dueDate) < new Date();
                  const isToggling = toggling === m.id;
                  return (
                    <div
                      key={m.id || index}
                      className="s-milestone"
                      style={{ opacity: m.done ? 0.72 : 1, cursor: m.id ? 'pointer' : 'default' }}
                      onClick={() => !isToggling && m.id && handleToggle(m)}
                    >
                      <div className="s-milestone-dot" style={{ background: m.approved ? '#2ecc71' : m.done ? '#f39c12' : isOverdue ? '#e05c5c' : '#6675ff' }} />
                      <div style={{ flex: 1 }}>
                        <div className="s-milestone-title" style={{ textDecoration: m.done ? 'line-through' : 'none' }}>{m.title}</div>
                        {m.dueDate && (
                          <div className="s-milestone-date" style={{ color: isOverdue ? '#e05c5c' : C.muted }}>
                            <FaCalendarAlt style={{ marginRight: 4 }} />{m.dueDate}{isOverdue && ' — Overdue!'}
                          </div>
                        )}
                        {m.done && m.completedAt && (
                          <div style={{ fontSize: 11, color: m.approved ? '#2ecc71' : '#f39c12', marginTop: 2 }}>
                            {m.approved ? `✓ Approved ${m.approvedAt || m.completedAt}` : `⏳ Pending approval — completed ${m.completedAt}`}
                          </div>
                        )}
                      </div>
                      {isToggling ? (
                        <FaClock style={{ color: '#f39c12', fontSize: 14 }} />
                      ) : m.done ? (
                        <FaCheckCircle style={{ color: '#2ecc71', fontSize: 16 }} />
                      ) : isOverdue ? (
                        <FaExclamationTriangle style={{ color: '#e05c5c', fontSize: 14 }} />
                      ) : (
                        <FaClock style={{ color: '#f39c12', fontSize: 14 }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="s-card">
              <div className="s-card-head"><FaShieldAlt /> Approval Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {milestones.length === 0 ? (
                  <div className="s-empty" style={{ padding: '16px 0' }}>
                    <div className="s-empty-icon"><FaBullseye /></div>
                    <p>No milestone data available</p>
                    <span>Ask your teacher to create milestones for this project</span>
                  </div>
                ) : (
                  milestones.map((m) => (
                    <div key={`approval-${m.id || m.title}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: '#f8fafc', border: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text }}>{m.title}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{m.dueDate || 'No due date'}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.approved ? '#2ecc71' : m.done ? '#f39c12' : '#6675ff' }}>
                        {m.approved ? 'Approved' : m.done ? 'Pending approval' : 'Open'}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: C.muted }}>
                This view uses only live milestone records from the backend. No sample data is shown.
              </div>
            </div>
          </div>
        </>
      )}
    </StudentLayout>
  );
}
