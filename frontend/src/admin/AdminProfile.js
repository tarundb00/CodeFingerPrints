import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './AdminLayout';
import { getMe, updateMe, uploadProfilePicture } from '../services/api';
import {
  FaUser, FaEnvelope, FaLock, FaCamera, FaCheckCircle,
  FaEye, FaEyeSlash, FaIdBadge,
} from 'react-icons/fa';
import './AdminProfile.css';

export default function AdminProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', newPassword: '', confirmPassword: '' });
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getMe().then(data => {
      setProfile(data);
      setPreview(data.profilePictureUrl || null);
      setForm(f => ({ ...f, firstName: data.firstName || '', lastName: data.lastName || '', phone: data.phone || '' }));
    }).catch(() => setError('Failed to load profile'));
  }, []);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const data = await uploadProfilePicture(file);
      if (data.url) {
        const url = `http://localhost:8080${data.url}`;
        setPreview(url);
        setProfile(p => ({ ...p, profilePictureUrl: url }));
        // persist immediately
        await updateMe({ profilePictureUrl: url });
        // update localStorage
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, profilePictureUrl: url }));
      }
    } catch { setError('Photo upload failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };
      if (form.newPassword) payload.password = form.newPassword;
      await updateMe(payload);
      // update localStorage name
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, firstName: form.firstName, lastName: form.lastName }));
      setMessage('Profile updated successfully!');
      setForm(f => ({ ...f, newPassword: '', confirmPassword: '' }));
      setTimeout(() => setMessage(''), 3000);
    } catch { setError('Update failed'); }
    finally { setLoading(false); }
  };

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'A'
    : 'A';

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your account credentials and photo">
      <div className="ap-wrap">

        {/* CREDENTIALS INFO CARD */}
        <div className="ap-cred-card">
          <div className="ap-cred-head">
            <FaIdBadge className="ap-cred-icon" />
            <div>
              <h3>Default Credentials</h3>
              <p>Use these to log in. Change your password below after first login.</p>
            </div>
          </div>
          <div className="ap-cred-row">
            <span className="ap-cred-label"><FaEnvelope /> Email (User ID)</span>
            <code className="ap-cred-value">{profile?.email || 'admin@codefingerprints.com'}</code>
          </div>
          <div className="ap-cred-row">
            <span className="ap-cred-label"><FaLock /> Default Password</span>
            <code className="ap-cred-value">Admin@123</code>
          </div>
        </div>

        <div className="ap-body">
          {/* AVATAR SECTION */}
          <div className="ap-avatar-section">
            <div className="ap-avatar" onClick={() => fileRef.current.click()}>
              {preview
                ? <img src={preview} alt="profile" />
                : <span className="ap-avatar-initials">{initials}</span>}
              <div className="ap-avatar-overlay"><FaCamera /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            <p className="ap-avatar-hint">Click to change photo</p>
            <div className="ap-name-display">
              {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
            </div>
            <div className="ap-role-badge">ADMIN</div>
          </div>

          {/* FORM */}
          <form className="ap-form" onSubmit={handleSubmit}>
            {message && (
              <div className="ap-toast ap-toast-success">
                <FaCheckCircle /> {message}
              </div>
            )}
            {error && <div className="ap-toast ap-toast-error">{error}</div>}

            <div className="ap-section-label">Personal Info</div>
            <div className="ap-grid">
              <div className="ap-field">
                <label><FaUser className="ap-field-icon" /> First Name</label>
                <div className="ap-input-wrap">
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" required />
                </div>
              </div>
              <div className="ap-field">
                <label><FaUser className="ap-field-icon" /> Last Name</label>
                <div className="ap-input-wrap">
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" required />
                </div>
              </div>
              <div className="ap-field ap-full">
                <label><FaEnvelope className="ap-field-icon" /> Email (read-only)</label>
                <div className="ap-input-wrap ap-readonly">
                  <input value={profile?.email || ''} readOnly />
                </div>
              </div>
            </div>

            <div className="ap-section-label" style={{ marginTop: 24 }}>Change Password</div>
            <div className="ap-grid">
              <div className="ap-field">
                <label><FaLock className="ap-field-icon" /> New Password</label>
                <div className="ap-input-wrap ap-pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Leave blank to keep current"
                  />
                  <button type="button" className="ap-eye-btn" onClick={() => setShowPass(s => !s)}>
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              <div className="ap-field">
                <label><FaLock className="ap-field-icon" /> Confirm Password</label>
                <div className="ap-input-wrap ap-pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <div className="ap-actions">
              <button type="submit" className="ap-save-btn" disabled={loading}>
                {loading ? 'Saving…' : <><FaCheckCircle /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
