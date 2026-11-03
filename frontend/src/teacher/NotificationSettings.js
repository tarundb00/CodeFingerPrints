import React, { useState } from 'react';
import TeacherLayout from './TeacherLayout';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import {
  FaBell, FaEnvelope, FaToggleOn, FaToggleOff,
  FaUserSlash, FaChartBar, FaCalendarAlt, FaExclamationTriangle, FaSave,
} from 'react-icons/fa';

const DEFAULT_SETTINGS = {
  inactiveStudentAlert: true,
  lowScoreAlert: true,
  weeklySummary: true,
  plagiarismAlert: true,
  inactiveThresholdDays: 7,
  lowScoreThreshold: 30,
};

const NOTIFICATION_TYPES = [
  {
    key: 'inactiveStudentAlert',
    icon: <FaUserSlash />,
    color: '#e05c5c',
    title: 'Inactive Student Alert',
    desc: 'Email when a student hasn\'t committed in the threshold number of days.',
  },
  {
    key: 'lowScoreAlert',
    icon: <FaExclamationTriangle />,
    color: '#f39c12',
    title: 'Low Score Alert',
    desc: 'Email when a student\'s contribution score drops below the threshold.',
  },
  {
    key: 'weeklySummary',
    icon: <FaChartBar />,
    color: '#6675ff',
    title: 'Weekly Summary Report',
    desc: 'Receive a weekly contribution summary every Monday at 9 AM.',
  },
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('cfp-notification-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('cfp-notification-settings', JSON.stringify(settings));
      setTimeout(() => {
        setSaving(false);
        toast.success('Notification settings saved!');
      }, 400);
    } catch {
      setSaving(false);
      toast.error('Failed to save settings');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) { toast.error('Please enter an email address'); return; }
    toast.error('Email testing is managed by an admin in Admin > Email Settings.');
  };

  const card = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '18px 22px',
    marginBottom: 14,
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  };

  return (
    <TeacherLayout title="Notification Settings" subtitle="Configure automated email alerts">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Info Banner */}
      <div style={{ background: 'rgba(102,117,255,0.08)', border: '1px solid rgba(102,117,255,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#aaa' }}>
        <FaBell style={{ color: '#6675ff', marginRight: 8 }} />
        Email alerts are sent automatically by the backend scheduler. Configure your email server in{' '}
        <code style={{ color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>application.properties</code>{' '}
        before enabling notifications.
      </div>

      {/* Toggle Cards */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, opacity: 0.7 }}>EMAIL ALERTS</h3>
        {NOTIFICATION_TYPES.map(n => (
          <div key={n.key} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
            onClick={() => toggle(n.key)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${n.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: n.color, fontSize: 16, flexShrink: 0,
            }}>
              {n.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{n.desc}</div>
            </div>
            <div style={{ fontSize: 28, color: settings[n.key] ? '#6675ff' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
              {settings[n.key] ? <FaToggleOn /> : <FaToggleOff />}
            </div>
          </div>
        ))}
      </div>

      {/* Threshold Settings */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, opacity: 0.7 }}>THRESHOLDS</h3>
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 6 }}>
                Inactive threshold (days)
              </label>
              <input
                type="number"
                min={1} max={30}
                value={settings.inactiveThresholdDays}
                onChange={e => setSettings(p => ({ ...p, inactiveThresholdDays: +e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(102,117,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Send alert after this many days without commits</div>
            </div>
            <div>
              <label style={{ fontSize: 12, opacity: 0.6, display: 'block', marginBottom: 6 }}>
                Low score threshold (0–100)
              </label>
              <input
                type="number"
                min={0} max={100}
                value={settings.lowScoreThreshold}
                onChange={e => setSettings(p => ({ ...p, lowScoreThreshold: +e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(102,117,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>Send alert when score drops below this value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, opacity: 0.7 }}>TEST EMAIL</h3>
        <div style={card}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
            Send a test email to verify your email server is correctly configured.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(102,117,255,0.3)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13 }}
            />
            <button
              onClick={handleTestEmail}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#6675ff,#8b9aff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <FaEnvelope /> Send Test
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#2ecc71,#27ae60)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}
      >
        <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </TeacherLayout>
  );
}
