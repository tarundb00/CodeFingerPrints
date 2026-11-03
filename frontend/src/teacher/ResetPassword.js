import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { IoFingerPrint } from 'react-icons/io5';
import './TeacherAuth.css';
import './ResetPassword.css';

export default function ResetPassword() {
  const [newPass, setNewPass]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [showCon, setShowCon]     = useState(false);
  const [done, setDone]           = useState(false);
  const navigate = useNavigate();

  const mismatch = confirm && newPass !== confirm;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mismatch) return;
    setDone(true);
    setTimeout(() => navigate('/teacher/login'), 2500);
  };

  return (
    <div className="rp-page">
      <div className="rp-card">
        <div className="rp-brand">
          <IoFingerPrint className="rp-brand-icon" />
          <span>CodeFingerprints</span>
        </div>

        {!done ? (
          <>
            <div className="ta-card-head" style={{ marginBottom: 24 }}>
              <div className="ta-card-icon"><FaLock /></div>
              <div>
                <h2>Set New Password</h2>
                <p>Choose a strong password for your account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ta-field">
                <label><FaLock /> New Password</label>
                <div className="ta-input-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={newPass} onChange={e => setNewPass(e.target.value)}
                    required minLength={8}
                  />
                  <button type="button" className="ta-eye" onClick={() => setShowNew(!showNew)}>
                    {showNew ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="ta-field">
                <label><FaLock /> Confirm Password</label>
                <div className={`ta-input-wrap ${mismatch ? 'rp-error' : ''}`}>
                  <input
                    type={showCon ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  <button type="button" className="ta-eye" onClick={() => setShowCon(!showCon)}>
                    {showCon ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {mismatch && <p className="rp-err-msg">Passwords do not match</p>}
              </div>

              <button type="submit" className="ta-btn-primary" disabled={mismatch}>
                <FaLock /> Reset Password
              </button>
            </form>

            <button className="ta-back-link" onClick={() => navigate('/teacher/login')}>
              <FaArrowLeft /> Back to Login
            </button>
          </>
        ) : (
          <div className="rp-success">
            <div className="rp-success-icon"><FaCheck /></div>
            <h3>Password Reset!</h3>
            <p>Your password has been updated successfully.</p>
            <p className="ta-muted">Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
