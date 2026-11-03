import React, { useState, useEffect } from 'react';
import TeacherLayout from './TeacherLayout';
import {
  FaUsers, FaProjectDiagram,
  FaArrowRight, FaTimes, FaPlus, FaUserTie, FaCalendarAlt,
  FaCodeBranch, FaEdit, FaTrash, FaGithub, FaInfoCircle,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { fetchTeams, createTeam, updateTeam, deleteTeam, syncAllStudents, fetchProjects, setupBranches } from '../services/api';
import './CreateTeam.css';

const PROJECT_TYPES = ['Web Application', 'Mobile App', 'AI / ML', 'Data Analytics', 'IoT', 'Other'];
const ROLE_OPTIONS = ['Coder', 'Documenter', 'Presenter', 'Researcher', 'Tester', 'Reviewer', 'Coordinator'];
const STEPS = ['Team & Project', 'Add Students'];

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk': { label: 'At Risk', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  completed: { label: 'Completed', color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
};



/* ─── WIZARD FORM ─── */
export function TeamWizard({ onClose, onSave, initialData }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    teamName: initialData?.teamName || '',
    teamNumber: initialData?.teamNumber || '',
    projectName: initialData?.projectName || '',
    projectType: initialData?.projectType || 'Web Application',
    description: initialData?.description || '',
    minStudents: initialData?.minStudents || 4,
    maxStudents: initialData?.maxStudents || 6,
  });
  const [students, setStudents] = useState(
    initialData?.members?.map(m => ({ usn: m.usn, name: m.name, email: m.email, dept: m.section || '', githubUsername: m.githubUsername || '' })) || []
  );
  const [selected, setSelected] = useState(initialData?.members?.map(m => m.usn) || []);
  const [teamLead, setTeamLead] = useState(initialData?.teamLeadUsn || '');
  const [newStudent, setNewStudent] = useState({ usn: '', name: '', email: '', dept: '', githubUsername: '' });
  const [editingUsn, setEditingUsn] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null);
  const [addError, setAddError] = useState('');
  const [studentRoles, setStudentRoles] = useState(
    Object.fromEntries((initialData?.members || []).map(m => [m.usn, m.roleName || '']))
  );
  const [studentApproved, setStudentApproved] = useState(
    Object.fromEntries((initialData?.members || []).map(m => [m.usn, !!m.approved]))
  );
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleStudent = usn => setSelected(p => {
    if (p.includes(usn)) return p.filter(id => id !== usn);
    if (p.length >= form.maxStudents) return p; // enforce max
    return [...p, usn];
  });

  const repoSlug = form.projectName && form.teamNumber
    ? `${form.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-team${form.teamNumber}`
    : form.projectName
      ? `${form.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-team`
      : 'project-team';

  const canStep1 = form.teamName.trim() && form.teamNumber.trim() && form.projectName.trim() && form.description.trim();
  const canStep2 = selected.length >= form.minStudents && selected.length <= form.maxStudents && teamLead;

  const saveStudentEdit = (originalUsn) => {
    const nextUsn = (editForm.usn || '').trim().toUpperCase();
    const nextName = (editForm.name || '').trim();
    const nextEmail = (editForm.email || '').trim().toLowerCase();
    const nextDept = (editForm.dept || '').trim();
    const nextGithub = (editForm.githubUsername || '').trim();

    if (!nextUsn || !nextName) return;
    if (nextUsn !== originalUsn && students.some(s => s.usn === nextUsn)) {
      setAddError(`USN ${nextUsn} is already in the roster.`);
      return;
    }
    if (nextEmail && students.some(s => s.email === nextEmail && s.usn !== originalUsn)) {
      setAddError(`Email ${nextEmail} is already used by another student.`);
      return;
    }

    setStudents(prev => prev.map(s => (
      s.usn === originalUsn
        ? { ...s, usn: nextUsn, name: nextName, email: nextEmail, dept: nextDept, githubUsername: nextGithub }
        : s
    )));
    setSelected(prev => prev.map(usn => (usn === originalUsn ? nextUsn : usn)));
    setStudentRoles(prev => {
      const next = { ...prev };
      next[nextUsn] = prev[originalUsn] || '';
      if (originalUsn !== nextUsn) delete next[originalUsn];
      return next;
    });
    setStudentApproved(prev => {
      const next = { ...prev };
      next[nextUsn] = !!prev[originalUsn];
      if (originalUsn !== nextUsn) delete next[originalUsn];
      return next;
    });
    setTeamLead(curr => (curr === originalUsn ? nextUsn : curr));
    setEditingUsn(null);
    setAddError('');
  };

  const handleFinish = () => {
    const payload = {
      teamName: form.teamName,
      teamNumber: form.teamNumber,
      projectName: form.projectName,
      projectType: form.projectType,
      description: form.description,
      minStudents: form.minStudents,
      maxStudents: form.maxStudents,
      teamLeadUsn: teamLead,
      githubRepoName: repoSlug,
      githubOwner: '',
      githubVisibility: 'private',
      githubDescription: form.description,
      githubCollaborators: selected
        .map(usn => (students.find(s => s.usn === usn) || {}).githubUsername || '')
        .filter(Boolean),
      members: selected.map(usn => {
        const stu = students.find(s => s.usn === usn) || {};
        return {
          usn,
          name: stu.name || '',
          email: stu.email || '',
          section: stu.dept || '',
          roleName: studentRoles[usn] || '',
          approved: !!studentApproved[usn],
          githubUsername: stu.githubUsername || '',
        };
      }),
    };
    onSave(payload);
  };

  return (
    <>
      <div className="ct-wizard-overlay" onClick={onClose}>
        <div className="ct-wizard-panel" onClick={e => e.stopPropagation()}>

          {/* WIZARD HEADER */}
          <div className="ct-wizard-header">
            <div>
              <h3>{initialData ? 'Edit Team' : 'Create New Team'}</h3>
              <p>Step {step} of {STEPS.length} — {['Team & Project Setup', 'Add Students'][step - 1]}</p>
            </div>
            <button className="ct-wizard-close" onClick={onClose}><FaTimes /></button>
          </div>

          {/* STEP INDICATOR */}
          <div className="ct-steps">
            {STEPS.map((s, i) => (
              <div key={i} className={`ct-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}`}>
                <div className="ct-step-dot">{i + 1 < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="ct-wizard-body">

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className="ct-section">
                  <div className="ct-section-head"><FaUsers /> Team Information</div>
                  <div className="ct-grid">
                    <div className="t-field">
                      <label>Team Name <span className="ct-req">*</span></label>
                      <div className="t-input-wrap"><input placeholder="e.g. Team Alpha" value={form.teamName} onChange={e => setF('teamName', e.target.value)} /></div>
                    </div>
                    <div className="t-field">
                      <label>Team Number <span className="ct-req">*</span></label>
                      <div className="t-input-wrap"><input type="number" min="1" placeholder="e.g. 1" value={form.teamNumber} onChange={e => setF('teamNumber', e.target.value)} /></div>
                    </div>
                    <div className="t-field ct-full">
                      <label>Team Lead <span className="ct-note">(Assigned after adding students)</span></label>
                      <div className="t-input-wrap"><select disabled style={{ opacity: 0.5 }}><option>Available in Step 2</option></select></div>
                    </div>
                  </div>
                </div>

                <div className="ct-section">
                  <div className="ct-section-head"><FaProjectDiagram /> Project Information</div>
                  <div className="ct-grid">
                    <div className="t-field">
                      <label>Project Name <span className="ct-req">*</span></label>
                      <div className="t-input-wrap"><input placeholder="e.g. E-Commerce Platform" value={form.projectName} onChange={e => setF('projectName', e.target.value)} /></div>
                    </div>
                    <div className="t-field">
                      <label>Project Type</label>
                      <div className="t-input-wrap">
                        <select value={form.projectType} onChange={e => setF('projectType', e.target.value)}>
                          {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="t-field ct-full">
                      <label>Description <span className="ct-req">*</span></label>
                      <div className="t-input-wrap"><textarea rows={3} placeholder="Brief description..." value={form.description} onChange={e => setF('description', e.target.value)} /></div>
                    </div>
                    {repoSlug !== 'project-team' && (
                      <div className="t-field ct-full">
                        <label><FaCodeBranch /> Auto GitHub Repo Name</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(102,117,255,0.08)', border: '1px solid rgba(102,117,255,0.2)', fontSize: 13, fontFamily: 'monospace', color: '#6675ff', fontWeight: 700 }}>
                          <FaCodeBranch />
                          <span>{repoSlug}</span>
                          <span style={{ fontSize: 11, color: '#888', fontFamily: 'sans-serif', fontWeight: 400, marginLeft: 4 }}>— auto-generated from project name + team number</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ct-section">
                  <div className="ct-section-head"><FaUsers /> Team Size</div>
                  <div className="ct-size-box">
                    <div className="ct-size-row">
                      <div className="ct-size-field">
                        <label>Min Students</label>
                        <div className="t-input-wrap ct-size-input"><input type="number" min="1" max={form.maxStudents} value={form.minStudents} onChange={e => setF('minStudents', +e.target.value)} /></div>
                      </div>
                      <div className="ct-size-sep">—</div>
                      <div className="ct-size-field">
                        <label>Max Students</label>
                        <div className="t-input-wrap ct-size-input"><input type="number" min={form.minStudents} max="12" value={form.maxStudents} onChange={e => setF('maxStudents', +e.target.value)} /></div>
                      </div>
                      <div className="ct-size-current">
                        <span className="ct-size-label">Selected</span>
                        <span className="ct-size-val" style={{ color: selected.length > form.maxStudents ? '#e05c5c' : selected.length >= form.minStudents ? '#2ecc71' : '#6675ff' }}>
                          {selected.length}
                        </span>
                        <span className="ct-size-label">of {form.maxStudents} max</span>
                      </div>
                    </div>
                    <p className="ct-size-note">Select students in Step 2 — max {form.maxStudents} allowed in this team</p>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="ct-section">
                  <div className="ct-section-head"><FaUsers /> Add Students</div>
                  <div className="ct-student-summary">
                    <div><div className="ct-summary-label">Roster</div><div className="ct-summary-value">{students.length} students</div></div>
                    <div>
                      <div className="ct-summary-label">Selected</div>
                      <div className="ct-summary-value" style={{ color: selected.length >= form.maxStudents ? '#e05c5c' : selected.length >= form.minStudents ? '#2ecc71' : '#6675ff' }}>
                        {selected.length} / {form.maxStudents}
                      </div>
                    </div>
                    <div><div className="ct-summary-label">Min required</div><div className="ct-summary-value">{form.minStudents}</div></div>
                  </div>
                  {selected.length >= form.maxStudents && (
                    <div className="ct-max-warning">Max {form.maxStudents} students reached — deselect one to add another</div>
                  )}
                  {addError && (
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', color: '#e05c5c', fontSize: 12, marginBottom: 10 }}>
                      {addError}
                    </div>
                  )}
                  <div className="ct-github-highlight">
                    <div className="ct-github-highlight-icon"><FaGithub /></div>
                    <div>
                      <h4>GitHub access setup</h4>
                      <p>Capture each student's GitHub username here so they can be added as collaborators and get their own branch automatically.</p>
                    </div>
                  </div>
                  <div className="ct-add-form-card">
                    <div className="ct-add-form-row">
                      <div className="t-input-wrap ct-form-field">
                        <input
                          placeholder="USN (auto-uppercase)"
                          value={newStudent.usn}
                          onChange={e => {
                            setAddError('');
                            setNewStudent({ ...newStudent, usn: e.target.value.toUpperCase() });
                          }}
                        />
                      </div>
                      <div className="t-input-wrap ct-form-field"><input placeholder="Name" value={newStudent.name} onChange={e => { setAddError(''); setNewStudent({ ...newStudent, name: e.target.value }); }} /></div>
                      <div className="t-input-wrap ct-form-field"><input placeholder="Email" value={newStudent.email} onChange={e => { setAddError(''); setNewStudent({ ...newStudent, email: e.target.value }); }} /></div>
                      <div className="t-input-wrap ct-form-field"><input placeholder="Section" value={newStudent.dept} onChange={e => setNewStudent({ ...newStudent, dept: e.target.value })} /></div>
                      <div className="t-input-wrap ct-form-field"><input placeholder="GitHub Username" value={newStudent.githubUsername} onChange={e => setNewStudent({ ...newStudent, githubUsername: e.target.value })} /></div>
                      <button className="t-btn-primary" onClick={() => {
                        const usn = newStudent.usn.trim().toUpperCase();
                        const email = newStudent.email.trim().toLowerCase();
                        if (!usn || !newStudent.name.trim()) { setAddError('USN and Name are required.'); return; }
                        if (students.find(s => s.usn === usn)) { setAddError(`USN ${usn} is already in the roster.`); return; }
                        if (email && students.find(s => s.email === email)) { setAddError(`Email ${email} is already used by another student.`); return; }
                        if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setAddError('Please enter a valid email address.'); return; }
                        const student = { ...newStudent, usn, email, githubUsername: newStudent.githubUsername?.trim() || '' };
                        setStudents(p => [...p, student]);
                        setSelected(p => p.includes(usn) ? p : [...p, usn]);
                        setNewStudent({ usn: '', name: '', email: '', dept: '', githubUsername: '' });
                        setAddError('');
                      }}>Add</button>
                    </div>
                    <div className="ct-add-form-hint"><FaInfoCircle /> GitHub username is recommended for collaboration and branch access. Missing usernames will be skipped during repo setup.</div>
                  </div>
                  <div className="ct-students-stack">
                    {students.map(s => {
                      const isSel = selected.includes(s.usn);
                      const maxed = !isSel && selected.length >= form.maxStudents;
                      const isEditing = editingUsn === s.usn;
                      return (
                        <div key={s.usn} className={`ct-student-card ${isSel ? 'selected' : ''} ${maxed ? 'ct-card-disabled' : ''}`}>
                          <label className="ct-student-check">
                            <input type="checkbox" checked={isSel} disabled={maxed} onChange={() => toggleStudent(s.usn)} />
                            <span className="ct-check-pill" />
                          </label>
                          {isEditing ? (
                            <div className="ct-student-edit-grid">
                              <div className="t-input-wrap ct-form-field" style={{ marginBottom: 0 }}>
                                <input placeholder="USN" value={editForm.usn || ''} onChange={e => setEditForm(p => ({ ...p, usn: e.target.value.toUpperCase() }))} />
                              </div>
                              <div className="t-input-wrap ct-form-field" style={{ marginBottom: 0 }}>
                                <input placeholder="Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                              </div>
                              <div className="t-input-wrap ct-form-field" style={{ marginBottom: 0 }}>
                                <input placeholder="Email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                              </div>
                              <div className="t-input-wrap ct-form-field" style={{ marginBottom: 0 }}>
                                <input placeholder="Section" value={editForm.dept} onChange={e => setEditForm(p => ({ ...p, dept: e.target.value }))} />
                              </div>
                              <div className="t-input-wrap ct-form-field" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                                <input placeholder="GitHub Username (optional)" value={editForm.githubUsername || ''} onChange={e => setEditForm(p => ({ ...p, githubUsername: e.target.value }))} />
                              </div>
                            </div>
                          ) : (
                            <div className="ct-student-info">
                              <div className="ct-student-name">{s.name}</div>
                              <div className="ct-student-tags">
                                <span>USN: {s.usn}</span>
                                <span>Email: {s.email}</span>
                                <span>Section: {s.dept || '—'}</span>
                                {s.githubUsername && <span>GitHub: {s.githubUsername}</span>}
                              </div>
                            </div>
                          )}
                          <div className="ct-student-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {isEditing ? (
                              <>
                                <button className="t-btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => saveStudentEdit(s.usn)}>Save</button>
                                <button className="t-btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setEditingUsn(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                {isSel && (
                                  <div className="t-input-wrap ct-role-select" style={{ marginBottom: 0 }}>
                                    <select value={studentRoles[s.usn] || ''} onChange={e => setStudentRoles(p => ({ ...p, [s.usn]: e.target.value }))}>
                                      <option value="">Select Role</option>
                                      {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                  </div>
                                )}
                                <button title="Edit" className="t-btn-ghost" style={{ padding: '6px 9px', fontSize: 13, flexShrink: 0 }}
                                  onClick={() => { setEditingUsn(s.usn); setEditForm({ usn: s.usn, name: s.name, email: s.email, dept: s.dept, githubUsername: s.githubUsername || '' }); }}>
                                  <FaEdit />
                                </button>
                                <button title="Remove" className="t-btn-ghost" style={{ padding: '6px 9px', fontSize: 13, color: '#e05c5c', flexShrink: 0 }}
                                  onClick={() => setDeleteStudentTarget(s)}>
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ct-section">
                  <div className="ct-section-head"><FaUsers /> Team Lead & Roles</div>
                  <div className="ct-teamlead-card">
                    <div className="t-field ct-full">
                      <label>Team Lead <span className="ct-req">*</span></label>
                      <div className="t-input-wrap">
                        <select value={teamLead} onChange={e => setTeamLead(e.target.value)}>
                          <option value="">Select Team Lead</option>
                          {selected.map(usn => {
                            const stu = students.find(s => s.usn === usn);
                            return <option key={usn} value={usn}>{stu ? stu.name : usn}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                  {selected.length > 0 && (
                    <div className="ct-role-grid">
                      {selected.map(usn => {
                        const stu = students.find(s => s.usn === usn) || {};
                        return (
                          <div key={usn} className="ct-role-card">
                            <div className="ct-role-head">
                              <div>
                                <div className="ct-role-name">{stu.name || usn}</div>
                                <div className="ct-role-meta">{usn}</div>
                              </div>
                              <button className="t-btn-ghost" onClick={() => setStudentApproved(p => ({ ...p, [usn]: !p[usn] }))}>
                                {studentApproved[usn] ? 'Approved' : 'Approve'}
                              </button>
                            </div>
                            <div className="t-input-wrap ct-role-select">
                              <select value={studentRoles[usn] || ''} onChange={e => setStudentRoles(p => ({ ...p, [usn]: e.target.value }))}>
                                <option value="">Select Role</option>
                                {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}


          </div>

          {/* WIZARD FOOTER */}
          <div className="ct-wizard-footer">
            <button className="t-btn-ghost" onClick={onClose}><FaTimes /> Cancel</button>
            <div style={{ display: 'flex', gap: 10 }}>
              {step > 1 && (
                <button className="t-btn-ghost" onClick={() => setStep(step - 1)}>
                  <FaArrowRight style={{ transform: 'rotate(180deg)' }} /> Back
                </button>
              )}
              {step < 2 && (
                <button
                  className={`t-btn-primary ct-submit ${(step === 1 && !canStep1) || (step === 2 && !canStep2) ? 'disabled' : ''}`}
                  disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
                  onClick={() => setStep(step + 1)}
                >
                  Add Students <FaArrowRight />
                </button>
              )}
              {step === 2 && (
                <button
                  className={`t-btn-primary ct-submit ${!canStep2 ? 'disabled' : ''}`}
                  disabled={!canStep2}
                  onClick={handleFinish}
                >
                  Finish & Create Team <FaArrowRight />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* STUDENT DELETE CONFIRM */}
      {deleteStudentTarget && (
        <div className="ct-wizard-overlay" style={{ zIndex: 1100 }} onClick={() => setDeleteStudentTarget(null)}>
          <div className="ct-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="ct-confirm-icon"><FaTrash /></div>
            <h3>Remove Student</h3>
            <p>Remove <strong>{deleteStudentTarget.name}</strong> ({deleteStudentTarget.usn}) from the roster?</p>
            <div className="ct-confirm-actions">
              <button className="t-btn-ghost" onClick={() => setDeleteStudentTarget(null)}>Cancel</button>
              <button className="t-btn-danger" onClick={() => {
                setStudents(p => p.filter(x => x.usn !== deleteStudentTarget.usn));
                setSelected(p => p.filter(id => id !== deleteStudentTarget.usn));
                if (teamLead === deleteStudentTarget.usn) setTeamLead('');
                setDeleteStudentTarget(null);
              }}>Yes, Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── MAIN TEAMS PAGE ─── */
export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState(new Set());
  const [showWizard, setShowWizard] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    fetchTeams()
      .then(data => setTeams(data || []))
      .catch(() => toast.error('Failed to load teams'))
      .finally(() => setLoading(false));
    fetchProjects()
      .then(projectData => {
        const linked = new Set((projectData || []).filter(p => p.teamId).map(p => Number(p.teamId)));
        setLinkedProjectIds(linked);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (payload) => {
    try {
      let savedTeam;
      if (editTeam) {
        savedTeam = await updateTeam(editTeam.id, payload);
        toast.success('Team updated successfully!');
        setEditTeam(null);
      } else {
        savedTeam = await createTeam(payload);
        toast.success('Team created successfully!');
        setShowWizard(false);
      }

      // Always refresh teams list immediately
      fetchTeams()
        .then(data => setTeams(data || []))
        .catch(() => {});

      // Sync students in background
      syncAllStudents().catch(() => {});

      // Auto-create student branches on the linked project (background)
      try {
        const projects = await fetchProjects();
        const linked = (projects || []).find(p => p.teamId === (savedTeam?.id || editTeam?.id));
        if (linked?.id && linked?.githubRepoName) {
          const result = await setupBranches(linked.id);
          const createdCount = result?.created?.length || 0;
          const skippedCount = result?.skipped?.length || 0;
          if (createdCount > 0) {
            toast.success(`${createdCount} student branch${createdCount > 1 ? 'es' : ''} created on GitHub${skippedCount ? `; ${skippedCount} already existed` : ''}.`);
          } else if (skippedCount > 0) {
            toast.info(`No new branches were created. ${skippedCount} already existed.`);
          }
        }
      } catch (branchErr) {
        const msg = branchErr.message || '';
        if (msg.includes('No active GitHub config')) {
          toast.error('Branches not created — configure GitHub settings first.');
        } else if (msg) {
          toast.error(msg);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save team');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTeam(deleteTarget.id);
      toast.success('Team deleted');
      setTeams(p => p.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TeacherLayout title="Teams" subtitle="Manage your project teams">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* TOOLBAR */}
      <div className="ct-teams-toolbar">
        <div className="ct-teams-count">{teams.length} team{teams.length !== 1 ? 's' : ''}</div>
        <button className="t-btn-primary" onClick={() => setShowWizard(true)}>
          <FaPlus /> Create Team
        </button>
      </div>

      {/* TEAM CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="ct-teams-empty">
          <FaUsers />
          <p>No teams yet</p>
          <span>Click "+ Create Team" to get started</span>
        </div>
      ) : (
        <div className="ct-teams-grid">
          {teams.map(team => {
            const st = STATUS_CONFIG[team.status] || STATUS_CONFIG.active;
            const memberCount = team.members ? team.members.length : 0;
            const leadMember = team.members ? team.members.find(m => m.usn === team.teamLeadUsn) : null;
            const leadName = leadMember ? leadMember.name : (team.teamLeadUsn || '—');
            return (
              <div key={team.id} className="ct-team-card">
                <div className="ct-team-card-top">
                  <div className="ct-team-avatar">
                    {team.teamName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="ct-team-info">
                    <h3>{team.teamName}</h3>
                    <p>{team.projectName}</p>
                  </div>
                  <span className="ct-team-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>

                <div className="ct-team-meta">
                  <span><FaUsers /> {memberCount} student{memberCount !== 1 ? 's' : ''}</span>
                  <span><FaUserTie /> Lead: {leadName}</span>
                  <span><FaCodeBranch /> {team.githubRepoName || '—'}</span>
                  <span style={{ background: 'rgba(102,117,255,0.1)', color: '#6675ff' }}>{team.projectType}</span>
                </div>

                {/* STUDENT MEMBERS CHIPS */}
                {team.members && team.members.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 14px' }}>
                    {team.members.map((m, idx) => (
                      <span key={idx} className="s-badge-pill" style={{ fontSize: 11, padding: '3px 10px', background: m.usn === team.teamLeadUsn ? 'rgba(102,117,255,0.15)' : '#f0f4f9', color: m.usn === team.teamLeadUsn ? '#6675ff' : '#475569' }}>
                        {m.name || m.usn} {m.usn === team.teamLeadUsn ? '⭐' : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div className="ct-team-progress">
                  <div className="ct-team-prog-info">
                    <span>Progress</span>
                    <strong style={{ color: '#6675ff' }}>—</strong>
                  </div>
                  <div className="ct-team-bar-bg">
                    <div className="ct-team-bar-fill" style={{ width: '0%', background: 'linear-gradient(90deg,#6675ff,#8b9aff)' }} />
                  </div>
                </div>

                <div className="ct-team-actions">
                  <button className="t-btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => setEditTeam(team)}>
                    <FaEdit /> Edit
                  </button>
                  <button
                    className="t-btn-ghost"
                    style={{ fontSize: 12, padding: '8px 14px', color: '#e05c5c' }}
                    onClick={() => setDeleteTarget(team)}
                    title={linkedProjectIds.has(team.id) ? 'Delete team and its linked project data' : 'Delete team'}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE WIZARD */}
      {showWizard && <TeamWizard onClose={() => setShowWizard(false)} onSave={handleSave} />}

      {/* EDIT WIZARD */}
      {editTeam && <TeamWizard onClose={() => setEditTeam(null)} onSave={handleSave} initialData={editTeam} />}

      {/* DELETE CONFIRM POPUP */}
      {deleteTarget && (
        <div className="ct-wizard-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="ct-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="ct-confirm-icon"><FaTrash /></div>
            <h3>Delete Team</h3>
            <p>Delete <strong>{deleteTarget.teamName}</strong>? This action cannot be undone.</p>
            {deleteTarget.projectName && (
              <p style={{ fontSize: 12, color: '#e05c5c', marginTop: -8, marginBottom: 12 }}>
                This team is linked to <strong>{deleteTarget.projectName}</strong> and deleting it will also remove its linked project data.
              </p>
            )}
            <div className="ct-confirm-actions">
              <button className="t-btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="t-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </TeacherLayout>
  );
}
