import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaCog, FaBalanceScale, FaBell, FaSave, FaTimes, FaSpinner,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { fetchProject, updateProject } from '../services/api';
import './Projects.css';

const Toggle = ({ checked, onChange, label, sub }) => (
  <div className="cp-toggle-row" onClick={onChange}>
    <div className={`cp-toggle ${checked ? 'on' : ''}`}><div className="cp-toggle-knob" /></div>
    <div><p>{label}</p>{sub && <span>{sub}</span>}</div>
  </div>
);

const weightKeys = [
  { key: 'coding',   label: 'Coding Contribution', color: '#6675ff' },
  { key: 'docs',     label: 'Documentation',        color: '#8c4fff' },
  { key: 'present',  label: 'Presentation',         color: '#2ecc71' },
  { key: 'research', label: 'Research',             color: '#f39c12' },
  { key: 'testing',  label: 'Testing',              color: '#e05c5c' },
];

const defaultWeights = { coding: 25, docs: 20, present: 15, research: 20, testing: 20 };
const defaultNotifs  = { lowContrib: true, freeRider: true, deadline: true, aiCode: true };

export default function ProjectSettings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectRaw, setProjectRaw] = useState(null);

  const [general, setGeneral] = useState({ name: '', desc: '', status: 'active', marks: '100' });
  const [grading, setGrading] = useState(defaultWeights);
  const [notifs, setNotifs]   = useState(defaultNotifs);
  const [threshold, setThreshold] = useState('10');
  const [aiDetect, setAiDetect]   = useState(true);
  const [reviewImpact, setReviewImpact] = useState(true);
  const [bugTracking, setBugTracking]   = useState(true);

  useEffect(() => {
    fetchProject(projectId).then(p => {
      if (!p) return;
      setProjectRaw(p);
      setGeneral({ name: p.name || '', desc: p.description || '', status: p.status || 'active', marks: p.totalMarks || '100' });
      setAiDetect(p.aiDetect !== false);
      setReviewImpact(p.reviewImpact !== false);
      setBugTracking(p.bugTracking !== false);
      if (p.gradingWeights) {
        try { setGrading({ ...defaultWeights, ...JSON.parse(p.gradingWeights) }); } catch {}
      }
      if (p.notificationSettings) {
        try { setNotifs({ ...defaultNotifs, ...JSON.parse(p.notificationSettings) }); } catch {}
      }
      if (p.alertThreshold) setThreshold(String(p.alertThreshold).replace('%', ''));
    }).catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const totalWeight = Object.values(grading).reduce((a, b) => a + b, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (totalWeight !== 100) { toast.error('Grading weights must total 100%'); return; }
    setSaving(true);
    try {
      await updateProject(projectId, {
        // preserve all existing fields so backend doesn't wipe them
        ...projectRaw,
        name:                 general.name,
        description:          general.desc,
        status:               general.status,
        totalMarks:           general.marks,
        aiDetect,
        reviewImpact,
        bugTracking,
        gradingWeights:       JSON.stringify(grading),
        notificationSettings: JSON.stringify(notifs),
        alertThreshold:       threshold,
      });
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <TeacherLayout title="Project Settings" subtitle="Loading...">
      <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Loading...</div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout title="Project Settings" subtitle={general.name}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <form className="cp-form" onSubmit={handleSave}>

        {/* GENERAL */}
        <div className="cp-section t-card">
          <div className="cp-section-head"><FaCog /> General Settings</div>
          <div className="t-grid-2">
            <div className="t-field cp-full">
              <label>Project Name</label>
              <div className="t-input-wrap">
                <input value={general.name} onChange={e => setGeneral(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="t-field cp-full">
              <label>Description</label>
              <div className="t-input-wrap">
                <textarea rows={2} value={general.desc} onChange={e => setGeneral(p => ({ ...p, desc: e.target.value }))} />
              </div>
            </div>
            <div className="t-field">
              <label>Status</label>
              <div className="t-input-wrap">
                <select value={general.status} onChange={e => setGeneral(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="at-risk">At Risk</option>
                  <option value="ahead">Ahead</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="t-field">
              <label>Total Marks</label>
              <div className="t-input-wrap">
                <input type="number" value={general.marks} onChange={e => setGeneral(p => ({ ...p, marks: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED TOGGLES */}
        <div className="cp-section t-card">
          <div className="cp-section-head"><FaCog /> Advanced Settings</div>
          <div className="cp-toggles">
            <Toggle checked={aiDetect}     onChange={() => setAiDetect(v => !v)}     label="Enable AI Code Detection"      sub="Flags AI-generated code using GraphCodeBERT" />
            <Toggle checked={reviewImpact} onChange={() => setReviewImpact(v => !v)} label="Enable Review Impact Analysis" sub="Credits reviewers whose suggestions were merged" />
            <Toggle checked={bugTracking}  onChange={() => setBugTracking(v => !v)}  label="Enable Bug Lifecycle Tracking" sub="Tracks bug introducers and fixers via SZZ Algorithm" />
          </div>
        </div>

        {/* GRADING WEIGHTS */}
        <div className="cp-section t-card">
          <div className="cp-section-head">
            <FaBalanceScale /> Grading Weights
            <span className={`ps-total ${totalWeight === 100 ? 'ok' : 'err'}`}>Total: {totalWeight}% {totalWeight === 100 ? '✓' : '≠ 100'}</span>
          </div>
          <div className="ps-weights">
            {weightKeys.map(w => (
              <div className="ps-weight-row" key={w.key}>
                <span className="ps-weight-label">{w.label}</span>
                <input type="range" min="0" max="60" step="5"
                  value={grading[w.key]}
                  onChange={e => setGrading(p => ({ ...p, [w.key]: +e.target.value }))}
                  className="ps-slider" style={{ '--sc': w.color }}
                />
                <div className="ps-weight-bar-wrap">
                  <div className="pj-bar-bg ps-bar">
                    <div className="pj-bar-fill" style={{ width: `${grading[w.key]}%`, background: w.color }} />
                  </div>
                </div>
                <span className="ps-weight-val" style={{ color: w.color }}>{grading[w.key]}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="cp-section t-card">
          <div className="cp-section-head"><FaBell /> Notification Settings</div>
          <div className="cp-toggles">
            <Toggle checked={notifs.lowContrib} onChange={() => setNotifs(p => ({ ...p, lowContrib: !p.lowContrib }))} label="Low Contribution Alerts"  sub="Alert when a student's contribution drops below threshold" />
            <Toggle checked={notifs.freeRider}  onChange={() => setNotifs(p => ({ ...p, freeRider: !p.freeRider }))}   label="Free Rider Detection"      sub="Detect students with minimal meaningful contributions" />
            <Toggle checked={notifs.deadline}   onChange={() => setNotifs(p => ({ ...p, deadline: !p.deadline }))}     label="Deadline Reminders"        sub="Notify 7, 3, and 1 day before project deadline" />
            <Toggle checked={notifs.aiCode}     onChange={() => setNotifs(p => ({ ...p, aiCode: !p.aiCode }))}         label="AI Code Detection Alerts"  sub="Flag when AI-generated code exceeds threshold" />
          </div>
          <div className="ps-threshold">
            <label>Alert Threshold (contribution %)</label>
            <div className="t-input-wrap ps-threshold-input">
              <select value={threshold} onChange={e => setThreshold(e.target.value)}>
                {['5','10','15','20','25','30'].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="cp-actions">
          <button type="button" className="t-btn-ghost" onClick={() => navigate(`/teacher/projects/${projectId}`)}>
            <FaTimes /> Cancel
          </button>
          <button type="submit" className="t-btn-primary" disabled={saving}>
            {saving ? <><FaSpinner className="cp-spin" /> Saving...</> : <><FaSave /> Save Changes</>}
          </button>
        </div>

      </form>
    </TeacherLayout>
  );
}
