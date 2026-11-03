import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCheck, FaTimes, FaRegCircle } from 'react-icons/fa';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

function renderMessage(message) {
  return String(message || '').split(/(https?:\/\/[^\s]+)/g).map((part, index) => (
    /^https?:\/\//i.test(part)
      ? <a key={index} href={part} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} style={{ color: '#4f46e5', textDecoration: 'underline' }}>{part}</a>
      : <React.Fragment key={index}>{part}</React.Fragment>
  ));
}

export default function NotificationDropdown({ userId, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetchNotifs();
    
    // Fallback polling or you can use the WebSocket to update this state
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchNotifs = () => {
    getNotifications(userId)
      .then(data => {
        if(Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      }).catch(() => {
        // Keep the existing notifications while the backend restarts.
      });
  };

  const handleMarkRead = (id, e) => {
    e.stopPropagation();
    markNotificationRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllNotificationsRead(userId).then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        className="s-icon-btn" 
        onClick={() => setOpen(!open)}
        style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
      >
        <FaBell />
        {unreadCount > 0 && (
          <div style={{ position: 'absolute', top: -2, right: -4, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 'bold', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 40, right: 0, width: 340, background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                <FaBell style={{ fontSize: 24, opacity: 0.2, marginBottom: 8 }} />
                <p style={{ margin: 0 }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => { if(!n.read) handleMarkRead(n.id, {stopPropagation:()=>{}}); if(onNavigate) onNavigate(n); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: n.read ? '#fff' : '#f0fdf4', cursor: 'pointer', display: 'flex', gap: 12, transition: 'background 0.2s' }}>
                  <div style={{ marginTop: 2, color: n.type === 'ALERT' ? '#ef4444' : '#3b82f6' }}>
                    {n.read ? <FaCheck style={{ color: '#cbd5e1' }} /> : <FaRegCircle />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 4px', fontSize: 13, color: '#111827' }}>{n.title}</h5>
                    <p style={{ margin: 0, fontSize: 12, color: '#1f2937', lineHeight: 1.4 }}>{renderMessage(n.message)}</p>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'block' }}>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
