import React, { useState, useRef, useEffect } from 'react';
import {
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt,
  FaVenusMars, FaMapMarkerAlt, FaCamera, FaLock, FaEye, FaEyeSlash,
  FaChalkboardTeacher, FaEdit, FaTrash, FaPlus, FaTimes,
} from 'react-icons/fa';
import AdminLayout from './AdminLayout';
import './AddTeacher.css';
import useToast from '../components/useToast';
import Toast from '../components/Toast';
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher, uploadProfilePicture } from '../services/api';

const initialState = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '', address: '', profilePicture: null,
  password: '', confirmPassword: '',
};

export default function AddTeacher() {
  const [form, setForm] = useState(initialState);
  const [preview, setPreview] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showPass, setShowPass]        = useState(false);
  const [showConfirm, setShowConfirm]  = useState(false);
  const [passError, setPassError]      = useState('');
  const fileRef = useRef(null);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const data = await fetchTeachers();
        setTeachers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load teachers', error);
        toast.error(error.message || 'Unable to load teachers');
      }
    };
    loadTeachers();
  }, []);

  const resetForm = () => { setForm({ ...initialState }); setPreview(null); setEditingId(null); };

  const openModal = (teacher = null) => {
    if (teacher) {
      setForm({ ...teacher });
      setPreview(teacher.profilePictureUrl || null);
      setEditingId(teacher.id);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const data = await uploadProfilePicture(file);
      if (data.url) {
        const backendUrl = `http://localhost:8080${data.url}`;
        setForm((p) => ({ ...p, profilePictureUrl: backendUrl }));
        setPreview(backendUrl);
      }
    } catch {
      // keep local preview if upload fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    if (!editingId && !form.password) {
      setPassError('Password is required'); return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setPassError('Passwords do not match'); return;
    }
    if (form.password && form.password.length < 6) {
      setPassError('Password must be at least 6 characters'); return;
    }
    const { confirmPassword, ...rest } = form;
    const payload = { ...rest, profilePictureUrl: form.profilePictureUrl || null };
    if (!payload.password) delete payload.password;
    try {
      if (editingId) {
        const updated = await updateTeacher(editingId, payload);
        setTeachers((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        toast.success('Teacher updated successfully');
      } else {
        const created = await createTeacher(payload);
        setTeachers((prev) => [created, ...prev]);
        toast.success('Teacher added successfully');
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save teacher', error);
      toast.error(error.message || 'Unable to save teacher');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteTeacher(deleteTargetId);
      setTeachers((prev) => prev.filter((t) => t.id !== deleteTargetId));
      setDeleteTargetId(null);
      toast.success('Teacher deleted successfully');
    } catch (error) {
      console.error('Failed to delete teacher', error);
      toast.error(error.message || 'Unable to delete teacher');
    }
  };

  const getInitials = (t) => `${t.firstName?.[0] || ''}${t.lastName?.[0] || ''}`.toUpperCase();

  return (
    <>
    <AdminLayout title="Teacher Management" subtitle="Manage and view all registered teachers">

      <div className="at-section-head">
        <div>
          <h2>Registered Teachers</h2>
          <p>Tap a card to edit details or remove a record.</p>
        </div>
        <div className="at-section-actions">
          <span className="at-count-badge">{teachers.length} teachers</span>
          <button className="at-submit-btn" onClick={() => openModal()}>
            <FaPlus /> Add Teacher
          </button>
        </div>
      </div>

      {teachers.length === 0 ? (
        <div className="at-empty-state">
          <FaChalkboardTeacher />
          <h3>No teachers yet</h3>
          <p>Use the add button to create your first teacher profile.</p>
        </div>
      ) : (
        <div className="at-card-grid">
          {teachers.map((teacher) => (
            <article className="at-teacher-card" key={teacher.id}>
              <div className="at-card-top">
                <div className="at-avatar-large">
                  {teacher.profilePictureUrl
                    ? <img src={teacher.profilePictureUrl} alt="teacher" />
                    : <span>{getInitials(teacher)}</span>}
                </div>
                <div className="at-card-actions-inline">
                  <button type="button" className="at-icon-btn" onClick={() => openModal(teacher)}>
                    <FaEdit />
                  </button>
                  <button type="button" className="at-icon-btn at-danger" onClick={() => setDeleteTargetId(teacher.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="at-card-body">
                <h3>{teacher.firstName} {teacher.lastName}</h3>
                <p className="at-card-role">Senior Teacher</p>
                <div className="at-detail-item"><FaEnvelope /> <span>{teacher.email}</span></div>
                <div className="at-detail-item"><FaPhone /> <span>{teacher.phone}</span></div>
                <div className="at-detail-item"><FaCalendarAlt /> <span>{teacher.dateOfBirth || '—'}</span></div>
                <div className="at-detail-item"><FaVenusMars /> <span>{teacher.gender}</span></div>
                <div className="at-detail-item"><FaMapMarkerAlt /> <span>{teacher.address}</span></div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="at-modal-overlay">
          <div className="at-modal-card">
            <div className="at-modal-head">
              <div>
                <p className="at-modal-badge">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</p>
                <h3>{editingId ? 'Update teacher profile' : 'Fill in teacher details'}</h3>
              </div>
              <button type="button" className="at-close-btn" onClick={closeModal}><FaTimes /></button>
            </div>

            <form className="at-form" onSubmit={handleSubmit}>
              <div className="at-photo-section">
                <div className="at-avatar" onClick={() => fileRef.current.click()}>
                  {preview ? <img src={preview} alt="preview" /> : <FaUser className="at-avatar-placeholder" />}
                  <div className="at-avatar-overlay"><FaCamera /></div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
                <div>
                  <p className="at-photo-label">Profile Picture</p>
                  <p className="at-photo-hint">Click the avatar to upload a photo.</p>
                </div>
              </div>

              <div className="at-grid">
                <div className="at-field">
                  <label><FaUser className="at-field-icon" /> First Name</label>
                  <div className="at-input-wrap">
                    <input name="firstName" placeholder="e.g. Rahul" value={form.firstName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="at-field">
                  <label><FaUser className="at-field-icon" /> Last Name</label>
                  <div className="at-input-wrap">
                    <input name="lastName" placeholder="e.g. Sharma" value={form.lastName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="at-field">
                  <label><FaEnvelope className="at-field-icon" /> Email</label>
                  <div className="at-input-wrap">
                    <input name="email" type="email" placeholder="teacher@college.edu" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="at-field">
                  <label><FaPhone className="at-field-icon" /> Phone</label>
                  <div className="at-input-wrap">
                    <input name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} required />
                  </div>
                </div>
                <div className="at-field">
                  <label><FaCalendarAlt className="at-field-icon" /> Date of Birth</label>
                  <div className="at-input-wrap">
                    <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} required />
                  </div>
                </div>
                <div className="at-field">
                  <label><FaVenusMars className="at-field-icon" /> Gender</label>
                  <div className="at-input-wrap at-select-wrap">
                    <select name="gender" value={form.gender} onChange={handleChange} required>
                      <option value="" disabled>Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="at-field at-full">
                  <label><FaMapMarkerAlt className="at-field-icon" /> Address</label>
                  <div className="at-input-wrap">
                    <textarea name="address" rows={3} placeholder="Street, City, State, PIN" value={form.address} onChange={handleChange} required />
                  </div>
                </div>

                {/* PASSWORD SECTION */}
                <div className="at-field at-full at-pass-divider">
                  <label style={{ color: '#6675ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaLock style={{ color: '#6675ff' }} />
                    {editingId ? 'Change Password (leave blank to keep current)' : 'Set Password'}
                  </label>
                </div>

                <div className="at-field">
                  <label><FaLock className="at-field-icon" /> {editingId ? 'New Password' : 'Password'} {!editingId && <span style={{ color: '#e05c5c' }}>*</span>}</label>
                  <div className="at-input-wrap at-pass-wrap">
                    <input
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={handleChange}
                      required={!editingId}
                    />
                    <button type="button" className="at-eye-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="at-field">
                  <label><FaLock className="at-field-icon" /> Confirm Password {!editingId && <span style={{ color: '#e05c5c' }}>*</span>}</label>
                  <div className="at-input-wrap at-pass-wrap">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required={!editingId}
                    />
                    <button type="button" className="at-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {passError && (
                  <div className="at-field at-full">
                    <p className="at-pass-error">{passError}</p>
                  </div>
                )}
              </div>

              <div className="at-actions">
                <button type="button" className="at-reset-btn" onClick={resetForm}>Reset</button>
                <button type="submit" className="at-submit-btn">
                  <FaChalkboardTeacher /> {editingId ? 'Save Changes' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTargetId && (
        <div className="at-modal-overlay at-confirm-overlay">
          <div className="at-confirm-card">
            <h3>Delete this teacher?</h3>
            <p>This action cannot be undone. The teacher card will be removed permanently.</p>
            <div className="at-confirm-actions">
              <button type="button" className="at-reset-btn" onClick={() => setDeleteTargetId(null)}>Cancel</button>
              <button type="button" className="at-submit-btn at-danger-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
    <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
