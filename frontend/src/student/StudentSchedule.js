import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import {
  FaCalendarAlt, FaCheckCircle, FaClock, FaFire,
  FaExclamationTriangle, FaFlag, FaCalendarCheck,
} from 'react-icons/fa';
import { fetchStudentDashboard, completeMilestone, uncompleteMilestone } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';

const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

export default function StudentSchedule() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(null);
  const { toasts, removeToast, toast } = useToast();
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  const load = () => {
    if (!student.usn) { setLoading(false); return; }
    fetchStudentDashboard(student.usn)
      .then(d => setData(d)).catch(() => setData(null)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const project    = data?.project || null;
  const milestones = data?.milestones || [];

  const handleToggle = async (m) => {
    if (!m.id) return;
    setToggling(m.id);
    try {
      if (m.done) {
        await uncompleteMilestone(m.id);
        toast.info(`"${m.title}" marked incomplete`);
      } else {
        await completeMilestone(m.id, student.usn);
        toast.success(`"${m.title}" marked complete!`);
      }
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update milestone');
    } finally {
      setToggling(null);
    }
  };

  const events = [];
  if (project?.startDate) events.push({ date: project.startDate, title: 'Project Start',    type: 'start',     done: true  });
  milestones.forEach(m => { if (m.dueDate) events.push({ date: m.dueDate, title: m.title, type: 'milestone', done: m.done }); });
  if (project?.endDate)   events.push({ date: project.endDate,  title: 'Project Deadline', type: 'deadline',  done: false });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  let daysLeft = null, deadlineColor = '#f39c12';
  if (project?.endDate) {
    daysLeft = Math.ceil((new Date(project.endDate) - new Date()) / 86400000);
    deadlineColor = daysLeft <= 3 ? '#e05c5c' : daysLeft <= 7 ? '#f39c12' : '#2ecc71';
  }

  const typeConfig = {
    start:     { color: '#2ecc71', icon: <FaFlag />,                label: 'Start'     },
    milestone: { color: '#6675ff', icon: <FaCheckCircle />,         label: 'Milestone' },
    deadline:  { color: '#e05c5c', icon: <FaExclamationTriangle />, label: 'Deadline'  },
  };

  const completedCount = milestones.filter(m => m.done).length;
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <StudentLayout title="Schedule" subtitle="Project timeline, milestones and deadlines">
      <Toast toasts={toasts} removeToast={removeToast} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading schedule...</div>
      ) : !project ? (
        <div className="s-empty" style={{ marginTop: 60 }}>
          <div className="s-empty-icon"><FaCalendarCheck /></div>
          <p>No project assigned yet</p>
          <span>Your schedule will appear once a project is assigned</span>
        </div>
      ) : (
        <>
          {daysLeft !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderRadius: 16, background: `${deadlineColor}18`, border: `1px solid ${deadlineColor}44`, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <FaFire style={{ color: deadlineColor, fontSize: 28 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Project Deadline: {project.endDate}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{project.name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: deadlineColor }}>{daysLeft}</div>
                <div style={{ fontSize: 12, color: C.muted }}>days remaining</div>
              </div>
            </div>
          )}

          <div className="s-stats">
            {[
              { label: 'Start Date',       value: project.startDate || '—',  color: '#2ecc71', icon: <FaFlag /> },
              { label: 'End Date',         value: project.endDate || '—',    color: '#e05c5c', icon: <FaCalendarAlt /> },
              { label: 'Total Milestones', value: milestones.length,          color: '#6675ff', icon: <FaCheckCircle /> },
              { label: 'Completed',        value: completedCount,             color: '#2ecc71', icon: <FaCheckCircle /> },
              { label: 'Pending',          value: milestones.length - completedCount, color: '#f39c12', icon: <FaClock /> },
            ].map(s => (
              <div className="s-stat" key={s.label}>
                <div className="s-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                <div className="s-stat-val" style={{ color: s.color, fontSize: typeof s.value === 'string' && s.value.length > 6 ? 16 : 22 }}>{s.value}</div>
                <div className="s-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="s-grid-2">
            <div className="s-card">
              <div className="s-card-head"><FaCalendarAlt /> Project Timeline</div>
              {events.length === 0 ? (
                <div className="s-empty"><div className="s-empty-icon"><FaCalendarAlt /></div><p>No timeline events</p></div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: C.border, borderRadius: 2 }} />
                  {events.map((ev, i) => {
                    const cfg = typeConfig[ev.type] || typeConfig.milestone;
                    const isPast = new Date(ev.date) < new Date();
                    return (
                      <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
                        <div style={{ position: 'absolute', left: -20, top: 4, width: 14, height: 14, borderRadius: '50%', background: ev.done || isPast ? cfg.color : '#eef1f8', border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff' }}>
                          {(ev.done || isPast) && '✓'}
                        </div>
                        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#eef1f8', border: `1px solid ${ev.done || isPast ? cfg.color + '44' : C.border}`, opacity: ev.done ? 0.7 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.icon}</span>
                            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, textTransform: 'uppercase' }}>{cfg.label}</span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{ev.title}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}><FaCalendarAlt style={{ marginRight: 4 }} />{ev.date}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="s-card">
              <div className="s-card-head"><FaCheckCircle /> Milestones Checklist</div>
              {milestones.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: C.text }}>
                    <span style={{ color: C.muted }}>Overall Progress</span>
                    <strong style={{ color: '#2ecc71' }}>{completedCount}/{milestones.length} ({progress}%)</strong>
                  </div>
                  <div className="s-bar-bg" style={{ height: 10 }}>
                    <div className="s-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#2ecc71,#1abc9c)' }} />
                  </div>
                </div>
              )}
              {milestones.length === 0 ? (
                <div className="s-empty"><div className="s-empty-icon"><FaFlag /></div><p>No milestones set</p></div>
              ) : (
                milestones.map((m, i) => {
                  const isOverdue = !m.done && m.dueDate && new Date(m.dueDate) < new Date();
                  const isToggling = toggling === m.id;
                  return (
                    <div key={i} className="s-milestone" style={{ opacity: m.done ? 0.65 : 1, cursor: m.id ? 'pointer' : 'default' }}
                      onClick={() => !isToggling && m.id && handleToggle(m)}>
                      <div className="s-milestone-dot" style={{ background: m.done ? '#2ecc71' : isOverdue ? '#e05c5c' : '#6675ff' }} />
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
              {milestones.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 12, color: C.muted, textAlign: 'center' }}>
                  Click a milestone to mark it complete / incomplete
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </StudentLayout>
  );
}
