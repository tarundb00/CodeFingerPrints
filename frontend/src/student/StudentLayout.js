import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTachometerAlt,
  FaProjectDiagram, FaUsers, FaChartBar,
  FaUserCircle, FaSignOutAlt, FaBell, FaGithub,
  FaStar, FaMoon, FaSun,
} from 'react-icons/fa';
import { IoFingerPrint } from 'react-icons/io5';
import { fetchStudentByUsn } from '../services/api';
import { useTheme } from '../utils/ThemeContext';
import './student.css';
import NotificationDropdown from '../components/NotificationDropdown';

const navItems = [
  { icon: <FaTachometerAlt />,  label: 'Dashboard',    path: '/student/dashboard' },
  { icon: <FaProjectDiagram />, label: 'My Project',   path: '/student/project' },
  { icon: <FaUsers />,          label: 'My Team',      path: '/student/team' },
  { icon: <FaChartBar />,       label: 'Contribution', path: '/student/contribution' },
  { icon: <FaGithub />,         label: 'GitHub',       path: '/student/github' },
];

export default function StudentLayout({ children, title, subtitle }) {
  const [collapsed, setCollapsed] = useState(false);
  const [student, setStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('student') || '{}'); }
    catch { return {}; }
  });
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('student') || '{}');
    if (!stored?.usn) return;

    fetchStudentByUsn(stored.usn)
      .then((data) => {
        const merged = { ...stored, ...data };
        localStorage.setItem('student', JSON.stringify(merged));
        setStudent(merged);
      })
      .catch(() => {});
  }, []);

  const displayName  = student.name || 'Student';
  const avatarLetter = (displayName[0] || 'S').toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    window.dispatchEvent(new Event('cfp-session-changed'));
    navigate('/login');
  };

  return (
    <div className={`s-page ${collapsed ? 'collapsed' : ''}`}>

      {/* SIDEBAR */}
      <div className="s-sidebar-wrap">
        <aside className="s-sidebar">
          <button
            className="s-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>

          <div className="s-brand">
            <IoFingerPrint className="s-brand-icon" />
            {!collapsed && (
              <div className="s-brand-text">
                <h3>CodeFingerprints</h3>
                <p>Student Portal</p>
              </div>
            )}
          </div>

          <nav className="s-nav">
            {navItems.map(item => (
              <div
                key={item.path}
                className={`s-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => { if (collapsed) setCollapsed(false); navigate(item.path); }}
                title={collapsed ? item.label : ''}
              >
                <span className="s-nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </div>
            ))}
          </nav>

          <div className="s-nav-divider" />
          <div className="s-sidebar-bottom">
            <div
              className={`s-nav-item ${location.pathname === '/student/profile' ? 'active' : ''}`}
              onClick={() => { if (collapsed) setCollapsed(false); navigate('/student/profile'); }}
              title={collapsed ? 'Profile' : ''}
            >
              <span className="s-nav-icon"><FaUserCircle /></span>
              {!collapsed && <span>Profile</span>}
            </div>
            <div
              className="s-nav-item"
              onClick={handleLogout}
              title={collapsed ? 'Logout' : ''}
            >
              <span className="s-nav-icon"><FaSignOutAlt /></span>
              {!collapsed && <span>Logout</span>}
            </div>
          </div>
        </aside>
      </div>

      {/* MAIN */}
      <div className="s-main">
        <div className="s-topbar">
          <div className="s-topbar-left">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="s-topbar-right">
            <NotificationDropdown userId={student?.usn} onNavigate={() => navigate('/student/notifications')} />
            <button className="s-profile-btn" onClick={() => navigate('/student/profile')}>
              <div className="s-profile-avatar">{avatarLetter}</div>
              <span className="s-profile-name">{displayName}</span>
            </button>
          </div>
        </div>

        <div className="s-content">
          {children}
        </div>
      </div>
    </div>
  );
}
