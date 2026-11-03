import React, { useState } from 'react';
import { FaEnvelope, FaKey, FaPaperPlane } from 'react-icons/fa';
import AdminLayout from './AdminLayout';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { sendTestEmail } from '../services/api';

export default function AdminEmailSettings() {
  const [senderEmail, setSenderEmail] = useState(localStorage.getItem('cfp-mail-sender') || '');
  const [appPassword, setAppPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  const testEmail = async (event) => {
    event.preventDefault();
    if (!senderEmail || !appPassword || !recipient) { toast.error('Enter sender email, Google app password, and recipient'); return; }
    setSending(true);
    try {
      await sendTestEmail({ senderEmail, appPassword, recipient });
      localStorage.setItem('cfp-mail-sender', senderEmail);
      setAppPassword('');
      toast.success(`Test email sent to ${recipient}`);
    } catch (error) { toast.error(error.message || 'Test email failed'); }
    finally { setSending(false); }
  };

  return <AdminLayout title="Email Notifications" subtitle="Configure and test Gmail delivery">
    <Toast toasts={toasts} removeToast={removeToast} />
    <form onSubmit={testEmail} style={{ maxWidth: 680, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
      <h3 style={{ marginTop: 0, color: '#111827' }}><FaEnvelope /> Gmail SMTP</h3>
      <p style={{ color: '#4b5563', fontSize: 13 }}>Use a Google app password, not your normal Google password. The password is sent only for this test and is not stored.</p>
      <label style={{ display: 'block', margin: '16px 0 6px', color: '#374151' }}>Sender Gmail address</label>
      <input type="email" required value={senderEmail} onChange={e => setSenderEmail(e.target.value)} style={{ width: '100%', padding: 11, boxSizing: 'border-box' }} />
      <label style={{ display: 'block', margin: '16px 0 6px', color: '#374151' }}><FaKey /> Google app password</label>
      <input type="password" required value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="16-character app password" style={{ width: '100%', padding: 11, boxSizing: 'border-box' }} />
      <label style={{ display: 'block', margin: '16px 0 6px', color: '#374151' }}>Send test to</label>
      <input type="email" required value={recipient} onChange={e => setRecipient(e.target.value)} style={{ width: '100%', padding: 11, boxSizing: 'border-box' }} />
      <button className="t-btn-primary" disabled={sending} style={{ marginTop: 20 }}><FaPaperPlane /> {sending ? 'Sending...' : 'Send test email'}</button>
    </form>
  </AdminLayout>;
}