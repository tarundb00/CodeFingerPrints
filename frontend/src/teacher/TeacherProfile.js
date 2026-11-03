import React, { useState, useRef, useEffect } from 'react';
import TeacherLayout from './TeacherLayout';
import { getMe, updateMe, uploadProfilePicture } from '../services/api';
import {
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaVenusMars,
  FaMapMarkerAlt, FaLock, FaEye, FaEyeSlash, FaCamera,
  FaSave, FaIdBadge, FaBriefcase, FaGlobe, FaClock,
  FaBell, FaSms,
} from 'react-icons/fa';
import './TeacherProfile.css';

export default function TeacherProfile() {
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [info, setInfo] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', dob: '', gender: '', address: '',
  });
  const [pass, setPass] = useState({ newP: '', confirm: '' });
  const [showPass, setShowPass] = useState({ newP: false, confirm: false });
  const [prefs, setPrefs] = useState({ language: 'english', timezone: 'Asia/Kolkata', email: true, sms: false });
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMe().then(data => {
      setInfo({
        firstName: data.firstName || '',
        lastName:  data.lastName  || '',
        email:     data.email     || '',
        phone:     data.phone     || '',
        dob:       data.dateOfBirth || '',
        gender:    data.gender    || '',
        address:   data.address   || '',
      });
      setPreview(data.profilePictureUrl || null);
      // keep localStorage in sync
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, ...data }));
    }).catch(() => {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setInfo(i => ({ ...i, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '' }));
      setPreview(u.profilePictureUrl || null);
    });
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
        await updateMe({ profilePictureUrl: url });
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, profilePictureUrl: url }));
      }
    } catch { setError('Photo upload failed'); }
  };

  const saveInfo = async () => {
    setError('');
    try {
      await updateMe({
        firstName: info.firstName,
        lastName:  info.lastName,
        phone:     info.phone,
        gender:    info.gender,
        address:   info.address,
      });
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, firstName: info.firstName, lastName: info.lastName }));
      setSaved('info');
    } catch { setError('Failed to save'); }
  };

  const savePass = async () => {
    setError('');
    if (!pass.newP) return;
    if (pass.newP !== pass.confirm) { setError('Passwords do not match'); return; }
    try {
      await updateMe({ password: pass.newP });
      setPass({ newP: '', confirm: '' });
      toast('pass');
    } catch { setError('Failed to update password'); }
  };

  const toast = (section) => { setSaved(section); setTimeout(() => setSaved(''), 2500); };
  const toggleShow = (k) => setShowPass(p => ({ ...p, [k]: !p[k] }));

  const initials = `${info.firstName?.[0] || ''}${info.lastName?.[0] || ''}`.toUpperCase() || 'T';
  const fullName = `${info.firstName} ${info.lastName}`.trim() || 'Teacher';

  return (
    <TeacherLayout title="My Profile" subtitle="Manage your account information">

      {/* PROFILE HEADER CARD */}
      <div className="tp-header-card t-card">
        <div className="tp-avatar-wrap" onClick={() => fileRef.current.click()}>
          {preview
            ? <img src={preview} alt="avatar" className="tp-avatar-img" />
            : <div className="tp-avatar-initials">{initials}</div>
          }
          <div className="tp-avatar-overlay"><FaCamera /></div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
        </div>
        <div className="tp-header-info">
          <h2>{fullName}</h2>
          <p className="tp-email"><FaEnvelope /> {info.email}</p>
          <div className="tp-meta-row">
            <span><FaIdBadge /> Teacher</span>
            <span><FaBriefcase /> Faculty</span>
            <span><FaGlobe /> Computer Science</span>
            <span><FaClock /> CodeFingerprints</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(224,92,92,0.12)', color: '#c0392b', fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* PERSONAL INFO */}
      <div className="t-card tp-section">
        <div className="t-section-head"><FaUser /> Personal Information</div>
        <div className="t-grid-2">
          {[
            { label: 'First Name', icon: <FaUser />,   key: 'firstName', placeholder: 'First name' },
            { label: 'Last Name',  icon: <FaUser />,   key: 'lastName',  placeholder: 'Last name' },
            { label: 'Phone',      icon: <FaPhone />,  key: 'phone',     placeholder: 'Phone number' },
          ].map(f => (
            <div className="t-field" key={f.key}>
              <label>{f.icon} {f.label}</label>
              <div className="t-input-wrap">
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={info[f.key]}
                  onChange={e => setInfo(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          <div className="t-field">
            <label><FaCalendarAlt /> Date of Birth</label>
            <div className="t-input-wrap">
              <input
                type="date"
                value={info.dob}
                onChange={e => setInfo(p => ({ ...p, dob: e.target.value }))}
              />
            </div>
          </div>

          <div className="t-field">
            <label><FaEnvelope /> Email (read-only)</label>
            <div className="t-input-wrap" style={{ opacity: 0.6 }}>
              <input value={info.email} readOnly />
            </div>
          </div>

          <div className="t-field">
            <label><FaVenusMars /> Gender</label>
            <div className="t-input-wrap">
              <select value={info.gender} onChange={e => setInfo(p => ({ ...p, gender: e.target.value }))}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="t-field t-col-full">
            <label><FaMapMarkerAlt /> Address</label>
            <div className="t-input-wrap">
              <textarea rows={2} value={info.address}
                onChange={e => setInfo(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="tp-actions">
          <button className="t-btn-primary" onClick={saveInfo}>
            {saved === 'info' ? '✓ Saved!' : <><FaSave /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* CHANGE PASSWORD */}
      <div className="t-card tp-section">
        <div className="t-section-head"><FaLock /> Change Password</div>
        <div className="tp-pass-grid">
          {[
            { label: 'New Password',     key: 'newP' },
            { label: 'Confirm Password', key: 'confirm' },
          ].map(f => (
            <div className="t-field" key={f.key}>
              <label><FaLock /> {f.label}</label>
              <div className="t-input-wrap tp-pass-wrap">
                <input
                  type={showPass[f.key] ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pass[f.key]}
                  onChange={e => setPass(p => ({ ...p, [f.key]: e.target.value }))}
                />
                <button type="button" className="tp-eye" onClick={() => toggleShow(f.key)}>
                  {showPass[f.key] ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="tp-actions">
          <button className="t-btn-primary" onClick={savePass}>
            {saved === 'pass' ? '✓ Updated!' : <><FaLock /> Update Password</>}
          </button>
        </div>
      </div>

      {/* PREFERENCES */}
      <div className="t-card tp-section">
        <div className="t-section-head"><FaGlobe /> Preferences</div>
        <div className="t-grid-2">
          <div className="t-field">
            <label><FaGlobe /> Language</label>
            <div className="t-input-wrap">
              <select value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="kannada">Kannada</option>
              </select>
            </div>
          </div>
          <div className="t-field">
            <label><FaClock /> Timezone</label>
            <div className="t-input-wrap">
              <select value={prefs.timezone} onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        </div>

        <div className="tp-toggles">
          <div className="tp-toggle-item" onClick={() => setPrefs(p => ({ ...p, email: !p.email }))}>
            <div className={`tp-toggle ${prefs.email ? 'on' : ''}`}>
              <div className="tp-toggle-knob" />
            </div>
            <div>
              <p><FaBell /> Email Notifications</p>
              <span>Receive project updates via email</span>
            </div>
          </div>
          <div className="tp-toggle-item" onClick={() => setPrefs(p => ({ ...p, sms: !p.sms }))}>
            <div className={`tp-toggle ${prefs.sms ? 'on' : ''}`}>
              <div className="tp-toggle-knob" />
            </div>
            <div>
              <p><FaSms /> SMS Alerts</p>
              <span>Receive urgent alerts via SMS</span>
            </div>
          </div>
        </div>

        <div className="tp-actions">
          <button className="t-btn-primary" onClick={() => toast('prefs')}>
            {saved === 'prefs' ? '✓ Saved!' : <><FaSave /> Save Preferences</>}
          </button>
        </div>
      </div>

    </TeacherLayout>
  );
}
