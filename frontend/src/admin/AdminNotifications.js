import React, { useEffect, useState, useCallback } from 'react';
import {
  FaBell, FaCheck, FaCheckDouble, FaExclamationTriangle,
  FaChalkboardTeacher, FaUserCheck, FaUserTimes, FaClock,
  FaEnvelope, FaPhone, FaCalendarAlt, FaVenusMars, FaMapMarkerAlt,
  FaUserCircle,
} from 'react-icons/fa';
import AdminLayout from './AdminLayout';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  fetchPendingTeacherRequests, approveTeacherRequest, declineTeacherRequest,
} from '../services/api';
import useToast from '../components/useToast';
import Toast from '../components/Toast';
import './AdminNotifications.css';

/* ── Helpers ─────────────────────────────────────────────────────────── */
function renderMessage(message) {
  return String(message || '').split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//i.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: '#6675ff' }}>{part}</a>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Pending Request Card ──────────────────────────────────────────── */
function RequestCard({ req, onApprove, onDecline, busy }) {
  const [showDeclineBox, setShowDeclineBox] = useState(false);
  const [reason, setReason] = useState('');

  const fullName = `${req.firstName || ''} ${req.lastName || ''}`.trim();

  return (
    <div className={`an-req-card ${busy ? 'an-req-busy' : ''}`}>
      {/* avatar */}
      <div className="an-req-avatar">
        {req.profilePictureUrl
          ? <img src={req.profilePictureUrl} alt={fullName} />
          : <FaUserCircle className="an-req-avatar-icon" />}
      </div>

      <div className="an-req-body">
        <div className="an-req-name">{fullName}</div>
        <div className="an-req-meta">
          <span><FaEnvelope /> {req.email}</span>
          {req.phone && <span><FaPhone /> {req.phone}</span>}
          {req.gender && <span><FaVenusMars /> {req.gender}</span>}
          {req.dateOfBirth && <span><FaCalendarAlt /> {req.dateOfBirth}</span>}
          {req.address && <span><FaMapMarkerAlt /> {req.address}</span>}
        </div>
        <div className="an-req-time">
          <FaClock /> Requested {timeAgo(req.requestedAt)}
        </div>

        {showDeclineBox && (
          <div className="an-decline-box">
            <textarea
              className="an-decline-input"
              placeholder="Optional reason for declining (will be emailed)"
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="an-decline-actions">
              <button className="an-btn-ghost" onClick={() => setShowDeclineBox(false)}>Cancel</button>
              <button className="an-btn-decline" disabled={busy} onClick={() => { onDecline(req.id, reason); setShowDeclineBox(false); }}>
                Confirm Decline
              </button>
            </div>
          </div>
        )}

        <div className="an-req-actions">
          <button className="an-btn-approve" disabled={busy} onClick={() => onApprove(req.id)}>
            <FaUserCheck /> Approve
          </button>
          {!showDeclineBox && (
            <button className="an-btn-decline" disabled={busy} onClick={() => setShowDeclineBox(true)}>
              <FaUserTimes /> Decline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function AdminNotifications() {
  const [items, setItems]           = useState([]);
  const [pendingReqs, setPendingReqs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingReqs, setLoadingReqs]     = useState(true);
  const [error, setError]           = useState('');
  const [busyId, setBusyId]         = useState(null);
  const [activeTab, setActiveTab]   = useState('requests'); // 'requests' | 'notifications'
  const { toasts, removeToast, toast } = useToast();

  /* notifications */
  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications('ADMIN');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load notifications');
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  /* pending teacher requests */
  const loadPendingRequests = useCallback(async () => {
    try {
      const data = await fetchPendingTeacherRequests();
      setPendingReqs(Array.isArray(data) ? data : []);
    } catch {
      setPendingReqs([]);
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadPendingRequests();
    const interval = setInterval(() => { loadNotifications(); loadPendingRequests(); }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, loadPendingRequests]);

  const unread = items.filter(i => !i.read).length;

  const markRead = async (id) => {
    await markNotificationRead(id);
    setItems(cur => cur.map(i => i.id === id ? { ...i, read: true } : i));
  };

  const markAll = async () => {
    await markAllNotificationsRead('ADMIN');
    setItems(cur => cur.map(i => ({ ...i, read: true })));
  };

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await approveTeacherRequest(id);
      toast.success('Teacher account approved and email sent!');
      setPendingReqs(cur => cur.filter(r => r.id !== id));
      loadNotifications(); // refresh notifications
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id, reason) => {
    setBusyId(id);
    try {
      await declineTeacherRequest(id, reason);
      toast.success('Request declined and email sent.');
      setPendingReqs(cur => cur.filter(r => r.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to decline request');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AdminLayout title="Notifications" subtitle="Department alerts and teacher approval requests">
        {/* ── TABS ── */}
        <div className="an-tabs">
          <button
            className={`an-tab ${activeTab === 'requests' ? 'an-tab-active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <FaChalkboardTeacher />
            Teacher Requests
            {pendingReqs.length > 0 && (
              <span className="an-badge">{pendingReqs.length}</span>
            )}
          </button>
          <button
            className={`an-tab ${activeTab === 'notifications' ? 'an-tab-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <FaBell />
            Notifications
            {unread > 0 && (
              <span className="an-badge">{unread}</span>
            )}
          </button>
        </div>

        {/* ── TEACHER REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div className="an-section">
            <div className="an-section-header">
              <h2>Pending Teacher Registration Requests</h2>
              <p>Review and approve or decline teacher account requests</p>
            </div>

            {loadingReqs && <div className="an-loading">Loading requests…</div>}

            {!loadingReqs && pendingReqs.length === 0 && (
              <div className="an-empty">
                <FaChalkboardTeacher className="an-empty-icon" />
                <p>No pending teacher registration requests.</p>
              </div>
            )}

            {!loadingReqs && pendingReqs.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                onApprove={handleApprove}
                onDecline={handleDecline}
                busy={busyId === req.id}
              />
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <div className="an-section">
            <div className="an-section-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>System Notifications</h2>
                <p>Latest alerts and system updates</p>
              </div>
              {unread > 0 && (
                <button className="an-btn-mark-all" onClick={markAll}>
                  <FaCheckDouble /> Mark all read
                </button>
              )}
            </div>

            {loadingNotifs && <div className="an-loading">Loading notifications…</div>}
            {error && <div className="an-error">{error} <button onClick={loadNotifications}>Retry</button></div>}

            {!loadingNotifs && !error && items.length === 0 && (
              <div className="an-empty">
                <FaBell className="an-empty-icon" />
                <p>No notifications yet.</p>
              </div>
            )}

            {!loadingNotifs && items.map(item => (
              <div key={item.id} className={`an-notif-item ${item.read ? 'an-notif-read' : 'an-notif-unread'}`}>
                <FaExclamationTriangle className={`an-notif-icon ${item.read ? '' : 'an-notif-icon-active'}`} />
                <div className="an-notif-content">
                  <strong>{item.title}</strong>
                  <div className="an-notif-message">{renderMessage(item.message)}</div>
                  <small>{timeAgo(item.createdAt)}</small>
                </div>
                {!item.read && (
                  <button className="an-btn-read" onClick={() => markRead(item.id)}>
                    <FaCheck /> Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminLayout>
      <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}