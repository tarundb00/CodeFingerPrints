import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaTrash, FaUsers, FaChartLine, FaClock,
  FaGithub, FaCodeBranch, FaCog, FaCheckCircle,
  FaCalendarAlt, FaChartBar,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { fetchProject, deleteProject, fetchContributions } from '../services/api';
import './Projects.css';
import { buildGitHubRepoUrl } from '../utils/githubRepo';

const statusMap = {
  active:   { label: 'Active',   color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk':{ label: 'At Risk',  color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  ahead:    { label: 'Ahead',    color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  archived: { label: 'Archived', color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();
  const [project, setProject] = useState(null);
  const [projectContributions, setProjectContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteGithubRepo, setDeleteGithubRepo] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProject(projectId)
      .then(data => setProject(data))
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));

    // Fetch contribution data for project aggregates.
    fetchContributions(projectId)
      .then(d => setProjectContributions(d || []))
      .catch(() => setProjectContributions([]));

  }, [projectId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(projectId, { deleteGithubRepo });
      toast.success(deleteGithubRepo ? 'Project and GitHub repository deleted' : 'Project deleted');
      setTimeout(() => navigate('/teacher/projects'), 800);
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteGithubRepo(false);
    }
  };

  if (loading) return (
    <TeacherLayout title="Project" subtitle="Loading...">
      <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Loading...</div>
    </TeacherLayout>
  );

  if (!project) return (
    <TeacherLayout title="Project" subtitle="Not found">
      <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Project not found.</div>
    </TeacherLayout>
  );

  const st = statusMap[project.status] || statusMap.active;

  return (
    <TeacherLayout title={project.name} subtitle={`${project.icon || '📁'} ${project.description || ''}`}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* TOP ACTIONS */}
      <div className="pd-top-actions">
        <button className="pj-btn-primary" onClick={() => navigate(`/teacher/projects/${projectId}/analyse`)}>
          <FaChartBar /> Analyse Project
        </button>
        <button className="pj-btn-ghost pd-danger" onClick={() => setDeleteConfirmOpen(true)}>
          <FaTrash /> Delete
        </button>
      </div>

      {/* STATUS + OVERVIEW */}
      <div className="pd-stats">
        {[
          { icon: <FaCheckCircle />, val: st.label,                    label: 'Status',     color: st.color },
          { icon: <FaCalendarAlt />, val: project.startDate || '—',    label: 'Start Date', color: '#6675ff' },
          { icon: <FaCalendarAlt />, val: project.endDate || '—',      label: 'End Date',   color: '#8c4fff' },
          { icon: <FaChartLine />,   val: project.totalMarks || '—',   label: 'Marks',      color: '#2ecc71' },
          { icon: <FaGithub />,      val: project.githubRepoName || '—', label: 'Repo',     color: '#6675ff' },
          { icon: <FaCodeBranch />,  val: project.githubBranch || '—', label: 'Branch',     color: '#8c4fff' },
          { icon: <FaClock />,       val: project.semester || '—',     label: 'Semester',   color: '#f39c12' },
          { icon: <FaUsers />,       val: project.academicYear || '—', label: 'Year',       color: '#888' },
        ].map((s, i) => (
          <div className="pd-stat" key={i} style={{ '--sc': s.color }}>
            <div className="pd-stat-icon">{s.icon}</div>
            <div><h3 style={{ fontSize: 13 }}>{s.val}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="pd-grid">

        {/* ADVANCED SETTINGS INFO */}
        <div className="t-card">
          <div className="t-section-head"><FaCog /> Configuration</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            {[
              { label: 'AI Code Detection',      val: project.aiDetect },
              { label: 'Review Impact Analysis', val: project.reviewImpact },
              { label: 'Bug Lifecycle Tracking', val: project.bugTracking },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{item.label}</span>
                <span style={{ color: item.val ? '#2ecc71' : '#e05c5c', fontWeight: 700, fontSize: 12 }}>
                  {item.val ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM & PROGRESS */}
        <div className="t-card">
          <div className="t-section-head"><FaChartLine /> Team & Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Average Contribution Score</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{projectContributions.length ? Math.round(projectContributions.reduce((s, x) => s + (x.score || 0), 0) / projectContributions.length) : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Team Size</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{project.teamSize || '—'}</span>
            </div>
          </div>
        </div>

        {/* GITHUB INFO */}
        <div className="t-card">
          <div className="t-section-head"><FaGithub /> GitHub</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Repository</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                {project.githubRepoName
                  ? <a href={buildGitHubRepoUrl(project.githubRepoName, project?.githubOwner || '') || '#'} target="_blank" rel="noreferrer" style={{ color: '#6675ff' }}>{project.githubRepoName}</a>
                  : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Branch</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{project.githubBranch || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Visibility</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{project.githubVisibility || '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {deleteConfirmOpen && (
        <div className="ct-wizard-overlay" onClick={() => !deleting && setDeleteConfirmOpen(false)}>
          <div className="ct-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="ct-confirm-icon"><FaTrash /></div>
            <h3>Delete Project</h3>
            <p>Delete <strong>{project.name}</strong>? This action cannot be undone.</p>
            {project.githubRepoName && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18, color: '#4b5563', fontSize: 13 }}>
                <input type="checkbox" checked={deleteGithubRepo} onChange={e => setDeleteGithubRepo(e.target.checked)} />
                Also delete the linked GitHub repository
              </label>
            )}
            <div className="ct-confirm-actions">
              <button className="t-btn-ghost" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</button>
              <button className="t-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT STATUS PROGRESS BAR */}
      <div className="pd-progress-bar t-card" style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1d2433' }}>Project Completion</h4>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6675ff' }}>{Math.round((projectContributions.length / Math.max(1, project.teamSize || 1)) * 100)}%</span>
        </div>
        <div style={{
          height: 12,
          background: '#f0f2f5',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (projectContributions.length / Math.max(1, project.teamSize || 1)) * 100)}%`,
            background: 'linear-gradient(90deg, #6675ff, #8c4fff)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {projectContributions.length} of {project.teamSize || 'N/A'} team members have contributions
        </div>
      </div>

    </TeacherLayout>
  );
}
