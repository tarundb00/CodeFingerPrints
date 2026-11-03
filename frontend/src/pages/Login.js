import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFingerPrint } from 'react-icons/io5';
import {
  FaChalkboardTeacher, FaUserGraduate, FaEye, FaEyeSlash,
  FaUserTie, FaRobot, FaEnvelope, FaLock, FaArrowRight,
  FaPaperPlane, FaArrowLeft, FaIdCard, FaUserPlus,
} from 'react-icons/fa';
import { BsBarChartFill, BsShieldFillCheck } from 'react-icons/bs';
import { login, studentLogin } from '../services/api';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import './Login.css';

const roles = [
  { id: 'admin',   label: 'Admin',   icon: <FaUserTie /> },
  { id: 'teacher', label: 'Teacher', icon: <FaChalkboardTeacher /> },
  { id: 'student', label: 'Student', icon: <FaUserGraduate /> },
];

const roleRoutes = {
  TEACHER: '/teacher/dashboard',
  HOD:     '/hod/dashboard',
  ADMIN:   '/admin/dashboard',
  STUDENT: '/student/dashboard',
};

function normalizeRoles(roles = []) {
  return (roles || [])
    .map(role => String(role).toUpperCase().replace(/^ROLE_/, '').trim())
    .filter(Boolean);
}

const roleNotes = {
  admin:   "Admin portal — use your admin credentials",
  teacher: "New teacher? Register your account below.",
  student: "Don't have an account? Contact your Guide",
};

export default function Login() {
  const [role, setRole]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [usn, setUsn]           = useState('');
  const [showUsn, setShowUsn]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent]   = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return;
    setError('');
    setLoading(true);
    try {
      if (role === 'student') {
        const trimUsn   = usn.trim().toUpperCase();
        const trimEmail = email.trim().toLowerCase();
        if (!trimUsn || !trimEmail) { setError('Please enter both USN and email.'); setLoading(false); return; }
        await studentLogin({ usn: trimUsn, email: trimEmail });
        toast.success('Welcome!');
        setTimeout(() => navigate('/student/dashboard'), 800);
      } else {
        const data = await login({ email, password });
        localStorage.removeItem('student');
        localStorage.setItem('token', data.accessToken);
        const normalizedRoles = normalizeRoles(data.roles);
        const storedRoles = normalizedRoles.length ? normalizedRoles : [role.toUpperCase()];
        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          profilePictureUrl: data.profilePictureUrl,
          roles: storedRoles,
        }));
        window.dispatchEvent(new Event('cfp-session-changed'));
        const backendRoles = storedRoles;
        toast.success(`Welcome back, ${data.firstName || 'User'}!`);
        const primaryRole = backendRoles[0] || (role === 'teacher' ? 'TEACHER' : role.toUpperCase());
        const route = roleRoutes[primaryRole] || '/login';
        setTimeout(() => navigate(route), 800);
      }
    } catch (err) {
      const msg = err.message || 'Invalid credentials. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setResetSent(true);
  };

  const closeForgot = () => { setShowForgot(false); setResetSent(false); setResetEmail(''); };

  return (
    <div className="login-page">

      {/* LEFT */}
      <div className="login-left">
        <div className="brand">
          <IoFingerPrint className="brand-icon" />
          <div>
            <h2>CodeFingerprints</h2>
            <p>Track. Analyze. Grade Fairly.</p>
          </div>
        </div>

        <svg className="hero-svg" viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="80" y="60" width="360" height="230" rx="18" fill="#dde3f0" />
          <rect x="80" y="60" width="360" height="230" rx="18" stroke="#c5cde0" strokeWidth="3" />
          <rect x="96" y="78" width="328" height="194" rx="10" fill="#eef1f8" />
          <rect x="96" y="78" width="328" height="194" rx="10" fill="url(#screenGrad)" opacity="0.5" />
          <rect x="116" y="100" width="80"  height="10" rx="5" fill="#6675ff" opacity="0.7" />
          <rect x="116" y="120" width="140" height="8"  rx="4" fill="#8c4fff" opacity="0.5" />
          <rect x="116" y="138" width="100" height="8"  rx="4" fill="#6675ff" opacity="0.4" />
          <rect x="116" y="156" width="160" height="8"  rx="4" fill="#8c4fff" opacity="0.3" />
          <rect x="116" y="174" width="90"  height="8"  rx="4" fill="#6675ff" opacity="0.5" />
          <rect x="116" y="192" width="120" height="8"  rx="4" fill="#8c4fff" opacity="0.4" />
          <rect x="116" y="210" width="70"  height="8"  rx="4" fill="#6675ff" opacity="0.6" />
          <rect x="280" y="180" width="28" height="60" rx="6" fill="#6675ff" opacity="0.8" />
          <rect x="316" y="155" width="28" height="85" rx="6" fill="#8c4fff" opacity="0.8" />
          <rect x="352" y="165" width="28" height="75" rx="6" fill="#6675ff" opacity="0.6" />
          <rect x="220" y="290" width="80" height="14" rx="7" fill="#c5cde0" />
          <rect x="248" y="290" width="24" height="30" rx="4" fill="#d1d9e6" />
          <rect x="30"  y="150" width="110" height="65" rx="16" fill="#eef1f8" filter="url(#cardShadow)" />
          <circle cx="55" cy="172" r="14" fill="#6675ff" opacity="0.2" />
          <text x="44" y="177" fontSize="13" fill="#6675ff" fontWeight="700">92%</text>
          <rect x="30" y="168" width="70" height="7" rx="3" fill="#6675ff" opacity="0.3" />
          <rect x="30" y="182" width="50" height="7" rx="3" fill="#8c4fff" opacity="0.2" />
          <rect x="380" y="140" width="110" height="65" rx="16" fill="#eef1f8" filter="url(#cardShadow)" />
          <rect x="395" y="158" width="80" height="7" rx="3" fill="#6675ff" opacity="0.5" />
          <rect x="395" y="172" width="60" height="7" rx="3" fill="#8c4fff" opacity="0.4" />
          <rect x="395" y="186" width="70" height="7" rx="3" fill="#6675ff" opacity="0.3" />
          <circle cx="200" cy="370" r="22" fill="#6675ff" opacity="0.15" />
          <circle cx="200" cy="370" r="14" fill="#6675ff" opacity="0.4" />
          <circle cx="240" cy="370" r="22" fill="#8c4fff" opacity="0.15" />
          <circle cx="240" cy="370" r="14" fill="#8c4fff" opacity="0.4" />
          <circle cx="280" cy="370" r="22" fill="#6675ff" opacity="0.15" />
          <circle cx="280" cy="370" r="14" fill="#6675ff" opacity="0.4" />
          <circle cx="320" cy="370" r="22" fill="#8c4fff" opacity="0.15" />
          <circle cx="320" cy="370" r="14" fill="#8c4fff" opacity="0.4" />
          <defs>
            <linearGradient id="screenGrad" x1="96" y1="78" x2="424" y2="272" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6675ff" stopOpacity="0.15" />
              <stop offset="1" stopColor="#8c4fff" stopOpacity="0.05" />
            </linearGradient>
            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="4" dy="4" stdDeviation="6" floodColor="#d1d9e6" />
              <feDropShadow dx="-4" dy="-4" stdDeviation="6" floodColor="#ffffff" />
            </filter>
          </defs>
        </svg>

        <div className="left-badges">
          <span><FaRobot className="badge-icon" /> AI Powered</span>
          <span><BsBarChartFill className="badge-icon" /> Evidence Based</span>
          <span><BsShieldFillCheck className="badge-icon" /> Fair Grading</span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="login-right">
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="sub">Sign in to your account</p>

          <p className="role-label">Select your role</p>
          <div className="role-selector">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`role-btn ${role === r.id ? 'active' : ''}`}
                onClick={() => { setRole(r.id); setEmail(''); setPassword(''); setUsn(''); setError(''); }}
              >
                <span className="role-icon">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label><FaEnvelope className="field-icon" /> Email</label>
              <div className="input-wrap">
                <input
                  type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>

            {role === 'student' ? (
              <div className="field">
                <label><FaIdCard className="field-icon" /> USN (used as password)</label>
                <div className="input-wrap">
                  <input
                    type={showUsn ? 'text' : 'password'}
                    placeholder="e.g. 1RV21CS001"
                    value={usn}
                    autoComplete="current-password"
                    onChange={(e) => setUsn(e.target.value.toUpperCase())}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowUsn(v => !v)}>
                    {showUsn ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="field">
                <label><FaLock className="field-icon" /> Password</label>
                <div className="input-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            )}

            <div className="login-row">
              <label className="remember-wrap" onClick={() => setRemember(!remember)}>
                <div className={`checkbox ${remember ? 'checked' : ''}`}>
                  {remember && <span>✓</span>}
                </div>
                Remember Me
              </label>
              <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>
                Forgot Password?
              </button>
            </div>

            {!role && <p className="role-warning">Please select a role to continue</p>}
            {error && <p className="role-warning" style={{ color: '#e05c5c' }}>{error}</p>}

            <button type="submit" className="submit-btn" disabled={!role || loading}>
              {loading ? 'Signing in…' : <> Sign In <FaArrowRight className="btn-arrow" /> </>}
            </button>
          </form>

          {role && (
            <p className="footer-note">{roleNotes[role]}</p>
          )}

          {role === 'teacher' && (
            <button
              type="button"
              className="register-teacher-btn"
              onClick={() => navigate('/teacher/register-request')}
            >
              <FaUserPlus /> Register as Teacher
            </button>
          )}
        </div>
      </div>

      {/* FORGOT PASSWORD POPUP */}
      {showForgot && (
        <div className="overlay" onClick={closeForgot}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-head">
              <div className="popup-icon"><FaLock /></div>
              <div>
                <h3>Reset Password</h3>
                <p>Enter your registered email to receive a reset link</p>
              </div>
            </div>

            {!resetSent ? (
              <form onSubmit={handleReset}>
                <div className="field">
                  <label><FaEnvelope className="field-icon" /> Registered Email</label>
                  <div className="input-wrap">
                    <input
                      type="email" placeholder="you@example.com"
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required
                    />
                  </div>
                </div>
                <button type="submit" className="submit-btn" style={{ marginTop: 4 }}>
                  <FaPaperPlane /> Send Reset Link
                </button>
              </form>
            ) : (
              <div className="reset-success">
                <div className="success-icon">✓</div>
                <p>Reset link sent to <strong>{resetEmail}</strong></p>
                <span>Check your inbox and follow the instructions.</span>
              </div>
            )}

            <button className="back-link" onClick={closeForgot}>
              <FaArrowLeft /> Back to Login
            </button>
          </div>
        </div>
      )}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
