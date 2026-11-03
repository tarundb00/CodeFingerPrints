import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFingerPrint } from 'react-icons/io5';
import { FaIdCard, FaEnvelope, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import { studentLogin } from '../services/api';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [usn, setUsn]         = useState('');
  const [email, setEmail]     = useState('');
  const [showUsn, setShowUsn] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimUsn   = usn.trim().toUpperCase();
    const trimEmail = email.trim().toLowerCase();
    if (!trimUsn || !trimEmail) { setError('Please enter both USN and email.'); return; }
    setLoading(true); setError('');
    try {
      await studentLogin({ usn: trimUsn, email: trimEmail });
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid USN or email. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const field = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f1117,#1a1d2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', marginBottom: 16 }}>
            <IoFingerPrint style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: '#fff' }}>Student Portal</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Sign in with your Email &amp; USN</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>

          {/* EMAIL */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <FaEnvelope style={{ marginRight: 6 }} />Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={field}
            />
          </div>

          {/* USN — shown as password field with toggle */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <FaIdCard style={{ marginRight: 6 }} />USN (used as password)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showUsn ? 'text' : 'password'}
                placeholder="e.g. 1RV21CS001"
                value={usn}
                onChange={e => setUsn(e.target.value.toUpperCase())}
                autoComplete="current-password"
                required
                style={{ ...field, paddingRight: 44, letterSpacing: showUsn ? 2 : 4 }}
              />
              <button
                type="button"
                onClick={() => setShowUsn(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 15, padding: 0 }}
              >
                {showUsn ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Your USN acts as your password (e.g. 1RV21CS001)
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', color: '#e05c5c', fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? 'Signing in...' : <><span>Sign In</span><FaArrowRight /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          Teacher? <span style={{ color: '#6675ff', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login here</span>
        </p>
      </div>
    </div>
  );
}
