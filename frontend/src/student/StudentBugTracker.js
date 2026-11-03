import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import { FaBug, FaPlus, FaTimes, FaCheckCircle, FaExclamationTriangle, FaClock, FaEdit } from 'react-icons/fa';
import { fetchStudentDashboard, fetchBugsByProject, createBug, updateBug } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';

const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

const SEV = {
  LOW:      { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)'  },
  MEDIUM:   { color: '#f39c12', bg: 'rgba(243,156,18,0.12)'  },
  HIGH:     { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
  CRITICAL: { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)'  },
};
const STATUS = {
  OPEN:        { color: '#e05c5c', icon: <FaExclamationTriangle /> },
  IN_PROGRESS: { color: '#f39c12', icon: <FaClock /> },
  RESOLVED:    { color: '#2ecc71', icon: <FaCheckCircle /> },
  CLOSED:      { color: '#888',    icon: <FaCheckCircle /> },
};

const emptyForm = () => ({ title: '', description: '', severity: 'MEDIUM', type: 'BUG' });

export default function StudentBugTracker() {
  const [bugs, setBugs]         = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [teamId, setTeamId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editBug, setEditBug]   = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const { toasts, removeToast, toast } = useToast();
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  const load = async () => {
    if (!student.usn) { setLoading(false); return; }
    try {
      const dash = await fetchStudentDashboard(student.usn);
      const pid = dash?.project?.id;
      const tid = dash?.team?.id;
      setProjectId(pid);
      setTeamId(tid);
      if (pid) {
        const data = await fetchBugsByProject(pid);
        setBugs(data || []);
      }
    } catch { setBugs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm()); setEditBug(null); setModal(true); };
  const openEdit = (b) => { setForm({ title: b.title, description: b.description || '', severity: b.severity, type: b.type, status: b.status }); setEditBug(b); setModal(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editBug) {
        await updateBug(editBug.id, form);
        toast.success('Bug updated');
      } else {
        await createBug({
          ...form,
          projectId,
          teamId,
          reportedByUsn: student.usn,
          reportedByName: student.name || student.usn,
        });
        toast.success('Bug reported!');
      }
      setModal(false);
      load();
    } catch (e) { toast.error(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (bug, status) => {
    try {
      await updateBug(bug.id, { status });
      toast.success(`Marked as ${status}`);
      load();
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const openCount  = bugs.filter(b => b.status === 'OPEN').length;
  const inProgCount = bugs.filter(b => b.status === 'IN_PROGRESS').length;
  const resolvedCount = bugs.filter(b => b.status === 'RESOLVED' || b.status === 'CLOSED').length;

  return (
    <StudentLayout title="Bug Tracker" subtitle="Report and track bugs in your project">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* STATS */}
      <div className="s-stats" style={{ marginBottom: 20 }}>
        {[
          { label: 'Open',       value: openCount,     color: '#e05c5c', icon: <FaExclamationTriangle /> },
          { label: 'In Progress',value: inProgCount,   color: '#f39c12', icon: <FaClock /> },
          { label: 'Resolved',   value: resolvedCount, color: '#2ecc71', icon: <FaCheckCircle /> },
          { label: 'Total',      value: bugs.length,   color: '#6675ff', icon: <FaBug /> },
        ].map(s => (
          <div className="s-stat" key={s.label}>
            <div className="s-stat-icon" style={{ color: s.color }}>{s.icon}</div>
            <div className="s-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="s-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Bug Reports</div>
        <button onClick={openAdd} className="s-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <FaPlus /> Report Bug
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading...</div>
      ) : bugs.length === 0 ? (
        <div className="s-empty"><div className="s-empty-icon"><FaBug /></div><p>No bugs reported yet</p><span>Click "Report Bug" to log an issue</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bugs.map(b => {
            const sev = SEV[b.severity] || SEV.MEDIUM;
            const st  = STATUS[b.status] || STATUS.OPEN;
            return (
              <div key={b.id} className="s-card" style={{ padding: '14px 18px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: sev.color, background: sev.bg }}>{b.severity}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{b.type}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>{b.title}</div>
                    {b.description && <div style={{ fontSize: 12, color: C.muted }}>{b.description}</div>}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                      Reported by {b.reportedByName || b.reportedByUsn} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: st.color }}>
                      {st.icon} {b.status?.replace('_', ' ')}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {b.status === 'OPEN' && (
                        <button onClick={() => handleStatusChange(b, 'IN_PROGRESS')}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #f39c12', background: 'transparent', color: '#f39c12', cursor: 'pointer' }}>
                          Start
                        </button>
                      )}
                      {(b.status === 'OPEN' || b.status === 'IN_PROGRESS') && (
                        <button onClick={() => handleStatusChange(b, 'RESOLVED')}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid #2ecc71', background: 'transparent', color: '#2ecc71', cursor: 'pointer' }}>
                          Resolve
                        </button>
                      )}
                      {b.reportedByUsn === student.usn && (
                        <button onClick={() => openEdit(b)}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(102,117,255,0.4)', background: 'transparent', color: '#6675ff', cursor: 'pointer' }}>
                          <FaEdit />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{editBug ? 'Edit Bug' : 'Report a Bug'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}><FaTimes /></button>
            </div>
            {[
              { key: 'title', label: 'Title *', type: 'text', placeholder: 'Short description of the bug' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', color: C.text }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>Description</label>
              <textarea rows={3} placeholder="Steps to reproduce, expected vs actual..." value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box', color: C.text, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>Severity</label>
                <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
                  {['BUG', 'ERROR', 'FEATURE', 'IMPROVEMENT'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editBug ? 'Update' : 'Report Bug'}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
