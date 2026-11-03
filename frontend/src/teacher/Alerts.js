import React, { useEffect, useState } from 'react';
import { FaBell, FaCheck, FaCheckDouble, FaExclamationTriangle } from 'react-icons/fa';
import TeacherLayout from './TeacherLayout';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, toast } = useToast();
  const recipientKey = 'TEACHER';

  const loadAlerts = () => {
    setLoading(true);
    getNotifications(recipientKey)
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => {
        // Preserve the current alerts during a temporary backend restart.
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const unread = alerts.filter(alert => !alert.read).length;

  const readAlert = async (id) => {
    try {
      await markNotificationRead(id);
      setAlerts(items => items.map(item => item.id === id ? { ...item, read: true } : item));
    } catch (error) {
      toast.error(error.message || 'Unable to mark alert as read');
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead(recipientKey);
      setAlerts(items => items.map(item => ({ ...item, read: true })));
    } catch (error) {
      toast.error(error.message || 'Unable to mark alerts as read');
    }
  };

  return (
    <TeacherLayout title="Alerts" subtitle="Daily contribution, deadline, and project notifications">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: '#111827' }}><FaBell style={{ color: '#6675ff', marginRight: 8 }} />Project Alerts</h3>
            <p style={{ margin: '6px 0 0', color: '#374151', fontSize: 13 }}>{unread} unread alert{unread === 1 ? '' : 's'}</p>
          </div>
          {unread > 0 && <button className="t-btn-primary" onClick={readAll}><FaCheckDouble /> Mark all read</button>}
        </div>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Loading alerts...</div> : alerts.length === 0 ? (
          <div style={{ padding: 42, textAlign: 'center', color: '#374151' }}><FaCheck style={{ color: '#2ecc71', fontSize: 28 }} /><p style={{ marginBottom: 0 }}>No alerts yet. Daily alerts will appear here automatically.</p></div>
        ) : alerts.map(alert => (
          <div key={alert.id} style={{ display: 'flex', gap: 14, padding: 16, marginBottom: 10, borderRadius: 10, border: '1px solid #e5e7eb', background: alert.read ? '#fff' : '#eff6ff' }}>
            <FaExclamationTriangle style={{ color: alert.type === 'INACTIVE_STUDENT' ? '#e05c5c' : '#f39c12', marginTop: 3 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#111827' }}>{alert.title}</strong>
              <div style={{ marginTop: 5, color: '#1f2937', fontSize: 13 }}>{alert.message}</div>
              <div style={{ marginTop: 6, color: '#4b5563', fontSize: 11 }}>{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</div>
            </div>
            {!alert.read && <button className="t-btn-ghost" onClick={() => readAlert(alert.id)}><FaCheck /> Read</button>}
          </div>
        ))}
      </div>
    </TeacherLayout>
  );
}
