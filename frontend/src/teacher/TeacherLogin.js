// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   FaEnvelope, FaLock, FaEye, FaEyeSlash,
//   FaChalkboardTeacher, FaArrowLeft, FaPaperPlane,
// } from 'react-icons/fa';
// import { IoFingerPrint } from 'react-icons/io5';
// import './TeacherAuth.css';

// export default function TeacherLogin() {
//   const [email, setEmail]       = useState('');
//   const [password, setPassword] = useState('');
//   const [remember, setRemember] = useState(false);
//   const [showPass, setShowPass] = useState(false);
//   const [showForgot, setShowForgot] = useState(false);
//   const [resetEmail, setResetEmail] = useState('');
//   const [resetSent, setResetSent]   = useState(false);
//   const navigate = useNavigate();

//   const handleLogin = (e) => {
//     e.preventDefault();
//     navigate('/teacher/dashboard');
//   };

//   const handleReset = (e) => {
//     e.preventDefault();
//     setResetSent(true);
//   };

//   return (
//     <div className="ta-page">

//       {/* LEFT PANEL */}
//       <div className="ta-left">
//         <div className="ta-brand">
//           <IoFingerPrint className="ta-brand-icon" />
//           <div>
//             <h2>CodeFingerprints</h2>
//             <p>Track. Analyze. Grade Fairly.</p>
//           </div>
//         </div>
//         <div className="ta-left-body">
//           <div className="ta-role-badge">
//             <FaChalkboardTeacher /> Teacher Portal
//           </div>
//           <h1>Welcome Back,<br /><span>Professor</span></h1>
//           <p>Sign in to manage your projects, track student contributions, and generate evidence-based grades.</p>
//           <div className="ta-features">
//             <div className="ta-feat"><FaChalkboardTeacher /> Manage Projects</div>
//             <div className="ta-feat"><FaLock /> Secure Access</div>
//             <div className="ta-feat"><FaEnvelope /> Instant Alerts</div>
//           </div>
//         </div>
//       </div>

//       {/* RIGHT PANEL */}
//       <div className="ta-right">
//         <div className="ta-card">

//           <div className="ta-card-head">
//             <div className="ta-card-icon"><FaLock /></div>
//             <div>
//               <h2>Teacher Login</h2>
//               <p>Access your teacher dashboard</p>
//             </div>
//           </div>

//           <form onSubmit={handleLogin}>
//             <div className="ta-field">
//               <label><FaEnvelope /> Email Address</label>
//               <div className="ta-input-wrap">
//                 <input
//                   type="email" placeholder="teacher@college.edu"
//                   value={email} onChange={e => setEmail(e.target.value)} required
//                 />
//               </div>
//             </div>

//             <div className="ta-field">
//               <label><FaLock /> Password</label>
//               <div className="ta-input-wrap">
//                 <input
//                   type={showPass ? 'text' : 'password'}
//                   placeholder="••••••••"
//                   value={password} onChange={e => setPassword(e.target.value)} required
//                 />
//                 <button type="button" className="ta-eye" onClick={() => setShowPass(!showPass)}>
//                   {showPass ? <FaEyeSlash /> : <FaEye />}
//                 </button>
//               </div>
//             </div>

//             <div className="ta-row-between">
//               <label className="ta-check">
//                 <div className={`ta-checkbox ${remember ? 'checked' : ''}`} onClick={() => setRemember(!remember)}>
//                   {remember && <span>✓</span>}
//                 </div>
//                 Remember Me
//               </label>
//               <button type="button" className="ta-link" onClick={() => setShowForgot(true)}>
//                 Forgot Password?
//               </button>
//             </div>

//             <button type="submit" className="ta-btn-primary">
//               <FaChalkboardTeacher /> Login
//             </button>
//           </form>

//           <p className="ta-footer-note">
//             Don't have an account? <span>Contact your HOD</span>
//           </p>
//         </div>
//       </div>

//       {/* FORGOT PASSWORD POPUP */}
//       {showForgot && (
//         <div className="ta-overlay" onClick={() => { setShowForgot(false); setResetSent(false); }}>
//           <div className="ta-popup" onClick={e => e.stopPropagation()}>
//             <div className="ta-popup-head">
//               <div className="ta-card-icon"><FaLock /></div>
//               <div>
//                 <h3>Reset Password</h3>
//                 <p>We'll send a reset link to your email</p>
//               </div>
//             </div>

//             {!resetSent ? (
//               <form onSubmit={handleReset}>
//                 <div className="ta-field">
//                   <label><FaEnvelope /> Registered Email</label>
//                   <div className="ta-input-wrap">
//                     <input
//                       type="email" placeholder="teacher@college.edu"
//                       value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
//                     />
//                   </div>
//                 </div>
//                 <button type="submit" className="ta-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
//                   <FaPaperPlane /> Send Reset Link
//                 </button>
//               </form>
//             ) : (
//               <div className="ta-reset-success">
//                 <div className="ta-success-icon">✓</div>
//                 <p>Reset link sent to <strong>{resetEmail}</strong></p>
//                 <p className="ta-muted">Check your inbox and follow the instructions.</p>
//               </div>
//             )}

//             <button className="ta-back-link" onClick={() => { setShowForgot(false); setResetSent(false); }}>
//               <FaArrowLeft /> Back to Login
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
