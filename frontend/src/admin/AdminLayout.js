import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTachometerAlt,
  FaUserCircle, FaChalkboardTeacher, FaSignOutAlt,
  FaBell, FaGithub, FaMoon, FaSun,
} from 'react-icons/fa';
import { IoFingerPrint } from 'react-icons/io5';
import { useTheme } from '../utils/ThemeContext';
import '../teacher/teacher.css';
import NotificationDropdown from '../components/NotificationDropdown';

const navItems = [
  { icon: <FaTachometerAlt />,     label: 'Dashboard',       path: '/admin/dashboard' },
  { icon: <FaChalkboardTeacher />, label: 'Teachers',        path: '/admin/add-teacher' },
  { icon: <FaGithub />,            label: 'GitHub Settings', path: '/admin/github-settings' },
  { icon: <FaBell />,              label: 'Email Settings',  path: '/admin/email-settings' },
];

export default function AdminLayout({ children, title, subtitle }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Admin';
  const avatarLetter = (user.firstName?.[0] || 'A').toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('cfp-session-changed'));
    navigate('/login');
  };

  return (
    <div className={`t-page t-page-admin ${collapsed ? 'collapsed' : ''}`}>

      {/* SIDEBAR */}
      <div className="t-sidebar-wrap">
        <aside className="t-sidebar">
          <button
            className="t-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>

          <div className="t-brand">
            <IoFingerPrint className="t-brand-icon" />
            {!collapsed && (
              <div className="t-brand-text">
                <h3>CodeFingerprints</h3>
                <p>Admin Portal</p>
              </div>
            )}
          </div>

          <nav className="t-nav">
            {navItems.map((item) => (
              <div
                key={item.path}
                className={`t-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => { if (collapsed) setCollapsed(false); navigate(item.path); }}
                title={collapsed ? item.label : ''}
              >
                <span className="t-nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            ))}
          </nav>

          <div className="t-nav-divider" />
          <div className="t-sidebar-bottom">
            <div
              className={`t-nav-item ${location.pathname === '/admin/profile' ? 'active' : ''}`}
              onClick={() => { if (collapsed) setCollapsed(false); navigate('/admin/profile'); }}
              title={collapsed ? 'Profile' : ''}
            >
              <span className="t-nav-icon"><FaUserCircle /></span>
              {!collapsed && <span>Profile</span>}
            </div>
            <div
              className="t-nav-item"
              onClick={handleLogout}
              title={collapsed ? 'Logout' : ''}
            >
              <span className="t-nav-icon"><FaSignOutAlt /></span>
              {!collapsed && <span>Logout</span>}
            </div>
          </div>
        </aside>
      </div>

      {/* MAIN */}
      <div className="t-main">
        <div className="t-topbar">
          <div className="t-topbar-left">
            <div className="t-topbar-heading">
              <h2>{title}</h2>
              <span className="t-status-chip">Live</span>
            </div>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="t-topbar-right">
            <NotificationDropdown userId="ADMIN" onNavigate={() => navigate('/admin/notifications')} />
            <button className="t-profile-btn" onClick={() => navigate('/admin/profile')}>
              {user.profilePictureUrl
                ? <img
                    src={user.profilePictureUrl}
                    alt="avatar"
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                : <div className="t-profile-avatar">{avatarLetter}</div>
              }
              <span className="t-profile-name">{displayName}</span>
            </button>
          </div>
        </div>

        <div className="t-content">
          {children}
        </div>
      </div>
    </div>
  );
}
