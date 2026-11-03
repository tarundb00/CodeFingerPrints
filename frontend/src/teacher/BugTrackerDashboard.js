import React, { useState, useEffect } from 'react';
import TeacherLayout from './TeacherLayout';
import { FaBug, FaPlus, FaTimes, FaCheckCircle, FaExclamationTriangle, FaClock, FaEdit, FaTrash } from 'react-icons/fa';
import { fetchProjects, fetchBugsByProject, createBug, updateBug, deleteBug, fetchMilestonesByProject, createMilestone, updateMilestone, deleteMilestone } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';

const SEV = {
  LOW:      { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)'  },
  MEDIUM:   { color: '#f39c12', bg: 'rgba(243,156,18,0.12)'  },
  HIGH:     { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
  CRITICAL: { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)'  },
};
const STATUS_CFG = {
  OPEN:        { color: '#e05c5c', label: 'Open'        },
  IN_PROGRESS: { color: '#f39c12', label: 'In Progress' },
  RESOLVED:    { color: '#2ecc71', label: 'Resolved'    },
  CLOSED:      { color: '#888',    label: 'Closed'      },
};

const emptyBug = () => ({ title: '', description: '', severity: 'MEDIUM', type: 'BUG', status: 'OPEN', assignedToUsn: '' });
const emptyMs  = () => ({ title: '', dueDate: '' });

export default function BugTrackerDashboard() {
  const [projects, setProjects]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [bugs, setBugs]             = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tab, setTab]               = useState('bugs');
  const [filterStatus, setFilter]   = useState('ALL');
  const [bugModal, setBugModal]     = useState(false);
  const [editBug, setEditBug]       = useState(null);
  const [bugForm, setBugForm]       = useState(emptyBug());
  const [msModal, setMsModal]       = useState(false);
  const [editMs, setEditMs]         = useState(null);
  const [msForm, setMsForm]         = useState(emptyMs());
  const [saving, setSaving]         = useState(false);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    fetchProjects().then(data => {
      setProjects(data || []);
      if (data?.length) loadProject(data[0]);
    }).catch(() => toast.error('Failed to load projects'));
  }, []);

  const loadProject = async (p) => {
    setSelected(p);
    try {
      const [b, m] = await Promise.all([fetchBugsByProject(p.id), fetchMilestonesByProject(p.id)]);
      setBugs(b || []);
      setMilestones(m || []);
    } catch { setBugs([]); setMilestones([]); }
  };

  const saveBug = async () => {
    if (!bugForm.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      if (editBug) { await updateBug(editBug.id, bugForm); toast.success('Bug updated'); }
      else         { await createBug({ ...bugForm, projectId: selected.id }); toast.success('Bug created'); }
      setBugModal(false);
      loadProject(selected);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const saveMs = async () => {
    if (!msForm.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const payload = { title: msForm.title, dueDate: msForm.dueDate || null, projectId: selected.id };
      if (editMs) { await updateMilestone(editMs.id, payload); toast.success('Milestone updated'); }
      else        { await createMilestone(payload);            toast.success('Milestone created'); }
      setMsModal(false);
      loadProject(selected);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDeleteBug = async (id) => {
    if (!window.confirm('Delete this bug?')) return;
    try { await deleteBug(id); toast.success('Deleted'); loadProject(selected); }
    catch (e) { toast.error(e.message); }
  };

  const handleDeleteMs = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try { await deleteMilestone(id); toast.success('Deleted'); loadProject(selected); }
    catch (e) { toast.error(e.message); }
  };

  const toggleMsDone = async (m) => {
    try {
      await updateMilestone(m.id, { title: m.title, dueDate: m.dueDate, completed: !m.completed });
      loadProject(selected);
    } catch (e) { toast.error(e.message); }
  };

  const filteredBugs = filterStatus === 'ALL' ? bugs : bugs.filter(b => b.status === filterStatus);
  const card = { background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.07)' };
  const inp  = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(102,117,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, boxSizing: 'border-box' };

  return (
    <TeacherLayout title="Bug Tracker & Milestones" subtitle="Track bugs, errors and project milestones">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* PROJECT SELECTOR + TABS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selected?.id || ''} onChange={e => { const p = projects.find(x => x.id === +e.target.value); if (p) loadProject(p); }}
          style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(102,117,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14 }}>
          {projects.length === 0 && <option>No projects</option>}
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          {['bugs', 'milestones'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: tab === t ? 'linear-gradient(135deg,#6675ff,#8b9aff)' : 'rgba(255,255,255,0.06)', color: '#fff' }}>
              {t === 'bugs' ? '🐛 Bugs' : '🎯 Milestones'}
            </button>
          ))}
        </div>
      </div>

      {/* BUGS TAB */}
      {tab === 'bugs' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total',       value: bugs.length,                                                                          color: '#6675ff' },
              { label: 'Open',        value: bugs.filter(b => b.status === 'OPEN').length,                                         color: '#e05c5c' },
              { label: 'In Progress', value: bugs.filter(b => b.status === 'IN_PROGRESS').length,                                  color: '#f39c12' },
              { label: 'Resolved',    value: bugs.filter(b => b.status === 'RESOLVED' || b.status === 'CLOSED').length,            color: '#2ecc71' },
              { label: 'Critical',    value: bugs.filter(b => b.severity === 'CRITICAL').length,                                   color: '#8c4fff' },
            ].map(c => (
              <div key={c.label} style={card}>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Filter + Add */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: filterStatus === s ? '#6675ff' : 'rgba(255,255,255,0.08)', color: '#fff' }}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button onClick={() => { setBugForm(emptyBug()); setEditBug(null); setBugModal(true); }}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <FaPlus /> Add Bug
            </button>
          </div>

          {filteredBugs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}><FaBug style={{ fontSize: 36, marginBottom: 12 }} /><p>No bugs found</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBugs.map(b => {
                const sev = SEV[b.severity] || SEV.MEDIUM;
                const st  = STATUS_CFG[b.status] || STATUS_CFG.OPEN;
                return (
                  <div key={b.id} style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: sev.color, background: sev.bg }}>{b.severity}</span>
                        <span style={{ fontSize: 11, opacity: 0.5 }}>{b.type}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>● {st.label}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</div>
                      {b.description && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{b.description}</div>}
                      <div style={{ fontSize: 11, opacity: 0.4, marginTop: 6 }}>
                        {b.reportedByName || b.reportedByUsn || 'Teacher'} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={b.status}
                        onChange={e => updateBug(b.id, { status: e.target.value }).then(() => loadProject(selected)).catch(() => {})}
                        style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                        {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                      </select>
                      <button onClick={() => { setBugForm({ title: b.title, description: b.description || '', severity: b.severity, type: b.type, status: b.status, assignedToUsn: b.assignedToUsn || '' }); setEditBug(b); setBugModal(true); }}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(102,117,255,0.3)', background: 'transparent', color: '#6675ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDeleteBug(b.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(224,92,92,0.3)', background: 'transparent', color: '#e05c5c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MILESTONES TAB */}
      {tab === 'milestones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ opacity: 0.6, fontSize: 13 }}>
              {milestones.filter(m => m.completed).length}/{milestones.length} completed
            </div>
            <button onClick={() => { setMsForm(emptyMs()); setEditMs(null); setMsModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <FaPlus /> Add Milestone
            </button>
          </div>

          {milestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, opacity: 0.4 }}>🎯<p style={{ marginTop: 12 }}>No milestones yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {milestones.map(m => {
                const isOverdue = !m.completed && m.dueDate && new Date(m.dueDate) < new Date();
                return (
                  <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <input type="checkbox" checked={!!m.completed} onChange={() => toggleMsDone(m)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6675ff' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, textDecoration: m.completed ? 'line-through' : 'none', opacity: m.completed ? 0.5 : 1 }}>{m.title}</div>
                      {m.dueDate && (
                        <div style={{ fontSize: 12, marginTop: 3, color: isOverdue ? '#e05c5c' : 'rgba(255,255,255,0.4)' }}>
                          Due: {m.dueDate}{isOverdue && ' — Overdue!'}
                        </div>
                      )}
                      {m.completed && m.completedAt && (
                        <div style={{ fontSize: 11, color: '#2ecc71', marginTop: 2 }}>
                          ✓ Completed {m.completedAt}{m.completedByUsn ? ` by ${m.completedByUsn}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setMsForm({ title: m.title, dueDate: m.dueDate || '' }); setEditMs(m); setMsModal(true); }}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(102,117,255,0.3)', background: 'transparent', color: '#6675ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDeleteMs(m.id)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(224,92,92,0.3)', background: 'transparent', color: '#e05c5c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* BUG MODAL */}
      {bugModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editBug ? 'Edit Bug' : 'Add Bug'}</div>
              <button onClick={() => setBugModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}><FaTimes /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>Title *</label>
              <input value={bugForm.title} onChange={e => setBugForm(p => ({ ...p, title: e.target.value }))} placeholder="Bug title" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>Description</label>
              <textarea rows={3} value={bugForm.description} onChange={e => setBugForm(p => ({ ...p, description: e.target.value }))}
                style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'severity', label: 'Severity', opts: ['LOW','MEDIUM','HIGH','CRITICAL'] },
                { key: 'type',     label: 'Type',     opts: ['BUG','ERROR','FEATURE','IMPROVEMENT'] },
                { key: 'status',   label: 'Status',   opts: ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <select value={bugForm[f.key]} onChange={e => setBugForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(102,117,255,0.3)', background: '#1a1d2e', color: '#fff', fontSize: 12 }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setBugModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={saveBug} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editBug ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MILESTONE MODAL */}
      {msModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editMs ? 'Edit Milestone' : 'Add Milestone'}</div>
              <button onClick={() => setMsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}><FaTimes /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>Title *</label>
              <input value={msForm.title} onChange={e => setMsForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Complete login module" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 5 }}>Due Date</label>
              <input type="date" value={msForm.dueDate} onChange={e => setMsForm(p => ({ ...p, dueDate: e.target.value }))}
                style={{ ...inp, background: '#1a1d2e' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setMsModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={saveMs} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editMs ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
