import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoFingerPrint } from 'react-icons/io5';
import {
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaVenusMars,
  FaMapMarkerAlt, FaLock, FaEye, FaEyeSlash, FaCamera,
  FaChalkboardTeacher, FaArrowLeft, FaCheckCircle,
} from 'react-icons/fa';
import { submitTeacherRegistrationRequest, uploadProfilePicture } from '../services/api';
import './TeacherRegisterRequest.css';

const initialForm = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '', address: '',
  password: '', confirmPassword: '',
};

export default function TeacherRegisterRequest() {
  const [form, setForm]           = useState(initialForm);
  const [preview, setPreview]     = useState(null);
  const [photoUrl, setPhotoUrl]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileRef  = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    try {
      const data = await uploadProfilePicture(file);
      if (data?.url) {
        const url = `http://localhost:8080${data.url}`;
        setPhotoUrl(url);
        setPreview(url);
      }
    } catch { /* keep local preview */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.password) { setError('Password is required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await submitTeacherRegistrationRequest({
        firstName:       form.firstName,
        lastName:        form.lastName,
        email:           form.email,
        password:        form.password,
        phone:           form.phone,
        dateOfBirth:     form.dateOfBirth,
        gender:          form.gender,
        address:         form.address,
        profilePictureUrl: photoUrl || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="trr-page">
        <div className="trr-success-card">
          <div className="trr-success-icon"><FaCheckCircle /></div>
          <h2>Approval Sent!</h2>
          <p>
            Your registration request has been sent to the admin for review.<br />
            You will receive an email once your account is approved.
          </p>
          <button className="trr-back-btn" onClick={() => navigate('/login')}>
            <FaArrowLeft /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="trr-page">
      {/* LEFT PANEL */}
      <div className="trr-left">
        <div className="trr-brand">
          <IoFingerPrint className="trr-brand-icon" />
          <div>
            <h2>CodeFingerprints</h2>
            <p>Track. Analyze. Grade Fairly.</p>
          </div>
        </div>
        <div className="trr-left-text">
          <FaChalkboardTeacher className="trr-big-icon" />
          <h3>Join as a Teacher</h3>
          <p>Fill in your details and submit your request. The admin will review and activate your account.</p>
          <ul className="trr-steps">
            <li><span>1</span> Fill your details</li>
            <li><span>2</span> Submit the form</li>
            <li><span>3</span> Admin reviews</li>
            <li><span>4</span> Get email confirmation</li>
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="trr-right">
        <div className="trr-card">
          <div className="trr-card-header">
            <button className="trr-back-link" onClick={() => navigate('/login')}>
              <FaArrowLeft /> Back to Login
            </button>
            <h2>Teacher Registration</h2>
            <p>Submit your details for admin approval</p>
          </div>

          {/* Photo */}
          <div className="trr-photo-section">
            <div className="trr-avatar" onClick={() => fileRef.current.click()}>
              {preview
                ? <img src={preview} alt="profile" />
                : <FaUser className="trr-avatar-placeholder" />}
              <div className="trr-avatar-overlay"><FaCamera /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            <div>
              <p className="trr-photo-label">Profile Picture <span className="trr-optional">(optional)</span></p>
              <p className="trr-photo-hint">Click avatar to upload</p>
            </div>
          </div>

          <form className="trr-form" onSubmit={handleSubmit}>
            <div className="trr-grid">
              {/* First Name */}
              <div className="trr-field">
                <label><FaUser className="trr-field-icon" /> First Name</label>
                <div className="trr-input-wrap">
                  <input name="firstName" placeholder="e.g. Rahul"
                    value={form.firstName} onChange={handleChange} required />
                </div>
              </div>

              {/* Last Name */}
              <div className="trr-field">
                <label><FaUser className="trr-field-icon" /> Last Name</label>
                <div className="trr-input-wrap">
                  <input name="lastName" placeholder="e.g. Sharma"
                    value={form.lastName} onChange={handleChange} required />
                </div>
              </div>

              {/* Email */}
              <div className="trr-field">
                <label><FaEnvelope className="trr-field-icon" /> Email</label>
                <div className="trr-input-wrap">
                  <input name="email" type="email" placeholder="teacher@college.edu"
                    value={form.email} onChange={handleChange} required />
                </div>
              </div>

              {/* Phone */}
              <div className="trr-field">
                <label><FaPhone className="trr-field-icon" /> Phone</label>
                <div className="trr-input-wrap">
                  <input name="phone" type="tel" placeholder="+91 98765 43210"
                    value={form.phone} onChange={handleChange} required />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="trr-field">
                <label><FaCalendarAlt className="trr-field-icon" /> Date of Birth</label>
                <div className="trr-input-wrap">
                  <input name="dateOfBirth" type="date"
                    value={form.dateOfBirth} onChange={handleChange} required />
                </div>
              </div>

              {/* Gender */}
              <div className="trr-field">
                <label><FaVenusMars className="trr-field-icon" /> Gender</label>
                <div className="trr-input-wrap trr-select-wrap">
                  <select name="gender" value={form.gender} onChange={handleChange} required>
                    <option value="" disabled>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="trr-field trr-full">
                <label><FaMapMarkerAlt className="trr-field-icon" /> Address</label>
                <div className="trr-input-wrap">
                  <textarea name="address" rows={3} placeholder="Street, City, State, PIN"
                    value={form.address} onChange={handleChange} required />
                </div>
              </div>

              {/* Password divider */}
              <div className="trr-field trr-full trr-pass-divider">
                <label><FaLock style={{ color: '#6675ff', marginRight: 6 }} /> Set Account Password</label>
              </div>

              {/* Password */}
              <div className="trr-field">
                <label><FaLock className="trr-field-icon" /> Password <span style={{ color: '#e05c5c' }}>*</span></label>
                <div className="trr-input-wrap trr-pass-wrap">
                  <input name="password" type={showPass ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={form.password} onChange={handleChange} required />
                  <button type="button" className="trr-eye-btn" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="trr-field">
                <label><FaLock className="trr-field-icon" /> Confirm Password <span style={{ color: '#e05c5c' }}>*</span></label>
                <div className="trr-input-wrap trr-pass-wrap">
                  <input name="confirmPassword" type={showConf ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={handleChange} required />
                  <button type="button" className="trr-eye-btn" onClick={() => setShowConf(v => !v)}>
                    {showConf ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="trr-field trr-full">
                  <p className="trr-error">{error}</p>
                </div>
              )}
            </div>

            <button type="submit" className="trr-submit-btn" disabled={loading}>
              {loading ? 'Submitting…' : <><FaChalkboardTeacher /> Submit Registration Request</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
