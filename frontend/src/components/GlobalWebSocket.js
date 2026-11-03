import React, { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { FaCheckCircle, FaTimes, FaBell } from 'react-icons/fa';

function readSession() {
  try {
    const student = JSON.parse(localStorage.getItem('student') || '{}');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const roles = (user.roles || []).map(role => String(role).toUpperCase().replace(/^ROLE_/, ''));
    const recipientKey = student.usn || (roles.includes('ADMIN') ? 'ADMIN' : roles.includes('HOD') ? 'HOD' : roles.includes('TEACHER') ? 'TEACHER' : '');
    return { token: localStorage.getItem('token') || '', recipientKey };
  } catch {
    return { token: '', recipientKey: '' };
  }
}

export default function GlobalWebSocket() {
  const [session, setSession] = useState(readSession);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const refreshSession = () => setSession(readSession());
    window.addEventListener('storage', refreshSession);
    window.addEventListener('cfp-session-changed', refreshSession);
    const interval = window.setInterval(refreshSession, 1000);
    return () => {
      window.removeEventListener('storage', refreshSession);
      window.removeEventListener('cfp-session-changed', refreshSession);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!session.token || !session.recipientKey) return undefined;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${window.location.protocol}//${window.location.hostname}:8080/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        const seen = new Set();
        const show = message => {
          if (!message.body) return;
          try {
            const data = JSON.parse(message.body);
            if (data.recipientKey && data.recipientKey !== session.recipientKey) return;
            const identity = data.id ? String(data.id) : `${data.recipientKey}:${data.title}:${data.message}`;
            if (seen.has(identity)) return;
            seen.add(identity);
            const id = `${identity}:${Date.now()}`;
            setNotifications(current => [...current, { id, ...data }]);
            window.setTimeout(() => setNotifications(current => current.filter(item => item.id !== id)), 7000);
          } catch { /* Ignore malformed broker messages. */ }
        };
        client.subscribe(`/topic/notifications/${session.recipientKey}`, show);
        client.subscribe('/topic/notifications', show);
      },
      onStompError: () => {},
      onWebSocketError: () => {},
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [session.token, session.recipientKey]);

  if (!notifications.length) return null;
  return <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
    {notifications.map(notification => <div key={notification.id} style={{ background: notification.type === 'GRADES_PUBLISHED' ? '#2ecc71' : '#6675ff', color: '#fff', padding: '16px 20px', borderRadius: 8, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 12, minWidth: 300 }}>
      {notification.type === 'GRADES_PUBLISHED' ? <FaCheckCircle size={20} /> : <FaBell size={20} />}
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}><strong>{notification.title}</strong><div>{notification.message}</div></div>
      <button onClick={() => setNotifications(current => current.filter(item => item.id !== notification.id))} aria-label="Dismiss notification" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}><FaTimes /></button>
    </div>)}
  </div>;
}