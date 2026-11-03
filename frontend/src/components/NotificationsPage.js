import React, { useEffect, useState } from 'react';
import { FaBell, FaCheck, FaCheckDouble, FaExclamationTriangle } from 'react-icons/fa';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

function renderMessage(message) {
  return String(message || '').split(/(https?:\/\/[^\s]+)/g).map((part, index) => (
    /^https?:\/\//i.test(part)
      ? <a key={index} href={part} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>{part}</a>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ));
}

export default function NotificationsPage({ recipientKey, title = 'Notifications', subtitle = 'Your latest alerts and updates' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await getNotifications(recipientKey);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [recipientKey]);

  const unread = items.filter(item => !item.read).length;
  const markRead = async (id) => {
    await markNotificationRead(id);
    setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item));
  };
  const markAll = async () => {
    await markAllNotificationsRead(recipientKey);
    setItems(current => current.map(item => ({ ...item, read: true })));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div><h2 style={{ margin: 0, color: '#111827' }}>{title}</h2><p style={{ margin: '6px 0 0', color: '#4b5563' }}>{subtitle}</p></div>
        {unread > 0 && <button className="t-btn-primary" onClick={markAll}><FaCheckDouble /> Mark all read</button>}
      </div>
      {loading && <div style={{ padding: 30, color: '#374151' }}>Loading notifications...</div>}
      {error && <div style={{ padding: 18, color: '#b42318', background: '#fff1f0', borderRadius: 8 }}>{error} <button onClick={load}>Retry</button></div>}
      {!loading && !error && items.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: '#4b5563' }}><FaBell size={28} /><p>No notifications yet.</p></div>}
      {!loading && items.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 14, padding: 16, marginBottom: 10, border: '1px solid #e5e7eb', borderRadius: 10, background: item.read ? '#fff' : '#eff6ff' }}>
          <FaExclamationTriangle style={{ color: item.read ? '#9ca3af' : '#6675ff', marginTop: 3 }} />
          <div style={{ flex: 1 }}><strong style={{ color: '#111827' }}>{item.title}</strong><div style={{ color: '#1f2937', marginTop: 5 }}>{renderMessage(item.message)}</div><small style={{ color: '#6b7280' }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small></div>
          {!item.read && <button className="t-btn-ghost" onClick={() => markRead(item.id)}><FaCheck /> Read</button>}
        </div>
      ))}
    </div>
  );
}