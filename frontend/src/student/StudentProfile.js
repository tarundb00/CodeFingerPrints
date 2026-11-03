import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import { FaUserCircle, FaEnvelope, FaIdCard, FaGithub, FaSave, FaEdit, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { fetchStudentByUsn, updateStudentProfile } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';

const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, toast } = useToast();
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  useEffect(() => {
    if (!student.usn) { setLoading(false); setProfile(student); setForm(student); return; }
    fetchStudentByUsn(student.usn)
      .then(d => { setProfile(d); setForm(d || {}); })
      .catch(() => { setProfile(student); setForm(student); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateStudentProfile(profile.id, { name: form.name, email: form.email, section: form.section, githubUsername: form.githubUsername });
      setProfile(updated);
      localStorage.setItem('student', JSON.stringify({ ...JSON.parse(localStorage.getItem('student') || '{}'), ...updated }));
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const p = profile || student;

  return (
    <StudentLayout title="My Profile" subtitle="View and update your personal information">
      <Toast toasts={toasts} removeToast={removeToast} />
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading profile...</div> : (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="s-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6675ff,#8c4fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 auto 16px', boxShadow: '8px 8px 20px #d1d9e6,-8px -8px 20px #ffffff' }}>
              {(p.name || 'S')[0].toUpperCase()}
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: C.text }}>{p.name || '—'}</h2>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: C.muted }}>{p.usn} · {p.section || '—'}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>{p.roleName || 'Member'}</span>
              <span className="s-badge-pill" style={{ color: p.approved ? '#2ecc71' : '#888', background: p.approved ? 'rgba(46,204,113,0.12)' : 'rgba(136,136,136,0.1)' }}>
                {p.approved ? <><FaCheckCircle style={{ marginRight: 4 }} />Approved</> : 'Pending Approval'}
              </span>
            </div>
          </div>

          <div className="s-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="s-card-head" style={{ margin: 0 }}><FaUserCircle /> Personal Information</div>
              {!editing
                ? <button className="s-btn-ghost" onClick={() => setEditing(true)}><FaEdit /> Edit</button>
                : <div style={{ display: 'flex', gap: 10 }}>
                    <button className="s-btn-ghost" onClick={() => { setEditing(false); setForm(profile || {}); }}>Cancel</button>
                    <button className="s-btn-primary" onClick={handleSave} disabled={saving}><FaSave /> {saving ? 'Saving...' : 'Save'}</button>
                  </div>
              }
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Full Name', key: 'name', icon: <FaUserCircle />, editable: true },
                { label: 'USN', key: 'usn', icon: <FaIdCard />, editable: false },
                { label: 'Email', key: 'email', icon: <FaEnvelope />, editable: true },
                { label: 'Section', key: 'section', icon: <FaIdCard />, editable: true },
                { label: 'GitHub Username', key: 'githubUsername', icon: <FaGithub />, editable: true },
                { label: 'Role', key: 'roleName', icon: <FaUserCircle />, editable: false },
              ].map(f => (
                <div className="s-field" key={f.key}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#6675ff' }}>{f.icon}</span> {f.label}
                  </label>
                  {editing && f.editable
                    ? <div className="s-input-wrap"><input value={form[f.key] || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.label} /></div>
                    : <div style={{ padding: '10px 14px', borderRadius: 12, background: '#eef1f8', boxShadow: 'inset 4px 4px 10px #d1d9e6,inset -4px -4px 10px #ffffff', fontSize: 14, color: p[f.key] ? C.text : C.muted }}>
                        {f.key === 'githubUsername' && p[f.key]
                          ? <a href={`https://github.com/${p[f.key]}`} target="_blank" rel="noreferrer" style={{ color: '#6675ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><FaGithub /> {p[f.key]}</a>
                          : p[f.key] || '—'}
                      </div>
                  }
                </div>
              ))}
            </div>
            {!p.githubUsername && (
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', fontSize: 13, color: '#e05c5c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaExclamationTriangle /><span><strong>GitHub username not set.</strong> Without it, your commits cannot be tracked. Click Edit to add it.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
