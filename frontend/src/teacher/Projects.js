import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaPlus, FaSearch, FaEye, FaCog, FaLayerGroup, FaProjectDiagram,
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaClock,
  FaCodeBranch, FaTrash, FaEdit, FaSync, FaSpinner,
  FaFolder, FaShoppingCart, FaRobot, FaChartBar,
  FaMobileAlt, FaFlask, FaGraduationCap, FaRocket, FaDatabase,
  FaUsers, FaEllipsisV, FaVideo, FaClipboardList, FaAward, FaUserTie,
  FaTimes, FaSave, FaDownload, FaBookOpen, FaCommentDots
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import {
  fetchProjects, deleteProject, publishMarks, fetchGithubConfigs, setupBranches,
  fetchTeams, deleteTeam, syncAllStudents,
  fetchMeetingsByProject, createMeeting, updateMeeting, deleteMeeting,
  updateManualGrading, fetchContributions
} from '../services/api';
import { TeamWizard } from './CreateTeam';
import './Projects.css';
import './CreateTeam.css';

const ICON_MAP = {
  folder:   FaFolder,
  cart:     FaShoppingCart,
  robot:    FaRobot,
  chart:    FaChartBar,
  mobile:   FaMobileAlt,
  flask:    FaFlask,
  grad:     FaGraduationCap,
  rocket:   FaRocket,
  database: FaDatabase,
  layers:   FaLayerGroup,
};

function ProjectIcon({ iconKey }) {
  const Icon = ICON_MAP[iconKey] || FaFolder;
  return <Icon style={{ fontSize: 22, color: '#6675ff' }} />;
}

const statusMap = {
  active:   { label: 'Active',   color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk':{ label: 'At Risk',  color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  ahead:    { label: 'Ahead',    color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  archived: { label: 'Archived', color: '#888',    bg: 'rgba(136,136,136,0.12)' },
};

const TEAM_STATUS_CONFIG = {
  active: { label: 'Active', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
  'at-risk': { label: 'At Risk', color: '#e05c5c', bg: 'rgba(224,92,92,0.12)' },
  completed: { label: 'Completed', color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
};

export default function Projects() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'teams'
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // 3-Dots Menu State
  const [openMenuId, setOpenMenuId] = useState(null);

  // Deletion States
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState('project'); // 'project' | 'team'
  const [deleteGithubRepo, setDeleteGithubRepo] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Modals
  const [githubModal, setGithubModal] = useState(null);
  const [showTeamWizard, setShowTeamWizard] = useState(false);
  const [editTeamData, setEditTeamData] = useState(null);

  // Meeting Scheduler Modal
  const [meetingModalProject, setMeetingModalProject] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [meetingForm, setMeetingForm] = useState({ title: '', meetingDate: '', attendanceJson: '[]', discussionSummary: '', actionItems: '', status: 'SCHEDULED' });
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Manual Grading Modal
  const [gradingModalProject, setGradingModalProject] = useState(null);
  const [projectContributions, setProjectContributions] = useState([]);
  const [gradingForm, setGradingForm] = useState({});
  const [savingGrading, setSavingGrading] = useState(false);

  const { toasts, removeToast, toast } = useToast();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projData, teamData] = await Promise.all([
        fetchProjects().catch(() => []),
        fetchTeams().catch(() => []),
      ]);
      setProjects(projData || []);
      setTeams(teamData || []);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  /* ── PROJECT / TEAM DELETION ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteType === 'project') {
        await deleteProject(deleteTarget.id, { deleteGithubRepo });
        setProjects(p => p.filter(x => x.id !== deleteTarget.id));
        toast.success(deleteGithubRepo ? 'Project and GitHub repository deleted' : 'Project deleted');
      } else {
        await deleteTeam(deleteTarget.id);
        setTeams(t => t.filter(x => x.id !== deleteTarget.id));
        toast.success('Team deleted successfully');
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  /* ── GITHUB CONNECTION CHECK ── */
  const handleGitHubCheck = async (project) => {
    setGithubModal({ project, status: 'loading', message: 'Checking GitHub connection for this project...' });
    try {
      const configs = await fetchGithubConfigs();
      const activeConfig = Array.isArray(configs) ? configs.find(cfg => cfg?.status === 'active') : null;
      if (!activeConfig || !activeConfig.personalAccessToken) {
        throw new Error('GitHub is not configured yet. Ask the admin to complete GitHub Settings.');
      }
      if (!project.githubRepoName) {
        throw new Error('This project does not have a GitHub repository linked yet.');
      }
      const result = await setupBranches(project.id);
      const createdCount = result?.created?.length || 0;
      const skippedCount = result?.skipped?.length || 0;
      const grantedCount = result?.permissionsGranted?.length || 0;
      const resentCount = result?.permissionsResent?.length || 0;
      const alreadyGrantedCount = result?.permissionsAlreadyGranted?.length || 0;
      const summary = createdCount > 0
        ? `Branches created for ${createdCount} student${createdCount > 1 ? 's' : ''}.`
        : `Branches and permissions checked successfully. ${skippedCount} student${skippedCount === 1 ? '' : 's'} already linked. ${resentCount > 0 ? `${resentCount} GitHub invitation email(s) resent.` : ''}${grantedCount > 0 ? `${grantedCount} new invitation(s) sent.` : ''}${alreadyGrantedCount > 0 ? ` ${alreadyGrantedCount} permission(s) already active.` : ''}`;

      setGithubModal({ project, status: 'success', message: 'GitHub connected successfully.', details: summary });
    } catch (err) {
      setGithubModal({ project, status: 'error', message: 'GitHub setup incomplete.', details: err.message });
    }
  };

  /* ── MEETINGS & DISCUSSION LOGS ── */
  const openMeetingModal = async (project) => {
    setMeetingModalProject(project);
    setEditingMeetingId(null);
    setMeetingForm({ title: `${project.name} - Team Meeting`, meetingDate: '', attendanceJson: '[]', discussionSummary: '', actionItems: '', status: 'SCHEDULED' });
    try {
      const data = await fetchMeetingsByProject(project.id);
      setMeetings(data || []);
    } catch {
      setMeetings([]);
    }
  };

  const handleSaveMeeting = async () => {
    if (!meetingForm.title.trim()) {
      toast.error('Meeting title is required');
      return;
    }
    setSavingMeeting(true);
    try {
      const payload = {
        ...meetingForm,
        projectId: meetingModalProject.id,
        teamId: meetingModalProject.teamId || null,
        conductedBy: 'Teacher',
      };
      if (editingMeetingId) {
        await updateMeeting(editingMeetingId, payload);
        toast.success('Meeting log updated!');
      } else {
        await createMeeting(payload);
        toast.success('Meeting scheduled and logged!');
      }
      const refreshed = await fetchMeetingsByProject(meetingModalProject.id);
      setMeetings(refreshed || []);
      setEditingMeetingId(null);
      setMeetingForm({ title: `${meetingModalProject.name} - Team Meeting`, meetingDate: '', attendanceJson: '[]', discussionSummary: '', actionItems: '', status: 'SCHEDULED' });
    } catch (e) {
      toast.error('Failed to save meeting: ' + e.message);
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteMeeting(id);
      setMeetings(m => m.filter(x => x.id !== id));
      toast.success('Meeting deleted');
    } catch (e) {
      toast.error('Failed to delete meeting');
    }
  };

  const exportMeetingPdf = (dateFilter = '') => {
    const rows = meetings.filter(meeting => !dateFilter || String(meeting.meetingDate || '').startsWith(dateFilter));
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;
    popup.document.write(`<html><head><title>Team meeting report</title><style>body{font-family:Arial;padding:28px;color:#17213a}h1{margin-bottom:4px}.meeting{border:1px solid #dbe3ef;border-radius:10px;padding:16px;margin:14px 0}small{color:#64748b}.label{font-weight:bold;color:#334155;margin-top:10px}</style></head><body><h1>${meetingModalProject?.name || 'Team'} - Offline Meeting Report</h1><small>${dateFilter ? `Date: ${dateFilter}` : 'All meeting records'}</small>${rows.map(meeting => `<div class="meeting"><h2>${meeting.title || 'Team meeting'}</h2><small>${meeting.meetingDate || 'Date not set'} · ${meeting.status || 'RECORDED'} · Led by ${meeting.conductedBy || 'Teacher'}</small><div class="label">Attendance</div><div>${meeting.attendanceJson || 'Not recorded'}</div><div class="label">Discussion points</div><div>${meeting.discussionSummary || 'None recorded'}</div><div class="label">Action items</div><div>${meeting.actionItems || 'None recorded'}</div></div>`).join('')}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  };

  /* ── MANUAL GRADING MODAL ── */
  const openGradingModal = async (project) => {
    setGradingModalProject(project);
    try {
      const data = await fetchContributions(project.id);
      setProjectContributions(data || []);
      const formState = {};
      (data || []).forEach(c => {
        formState[c.id] = {
          presentationScore: c.presentationScore ?? '',
          reportScore: c.reportScore ?? '',
          documentationScore: c.documentationScore ?? '',
          manualFeedback: c.manualFeedback || '',
          teacherAiPenalty: c.teacherAiPenalty ?? '',
        };
      });
      setGradingForm(formState);
    } catch {
      setProjectContributions([]);
    }
  };

  const handlePublishMarks = async () => {
    if (!window.confirm('Publish marks to all students in this project? \n\nMake sure you have clicked "Save Marks" for all students first!\n\nThey will now be able to see their final grades.')) return;
    try {
      await publishMarks(gradingModalProject.id);
      toast.success('Marks published successfully! Students can now see their final grades.');
      loadAllData();
    } catch (e) {
      toast.error('Failed to publish marks: ' + e.message);
    }
  };

  const handleSaveGrading = async (scoreId) => {
    setSavingGrading(true);
    try {
      const vals = gradingForm[scoreId] || {};
      const parseScore = (v) => {
        if (v === '' || v == null) return null;
        const num = Number(v);
        return isNaN(num) ? null : num;
      };
      
      const payload = {
        presentationScore: parseScore(vals.presentationScore),
        reportScore: parseScore(vals.reportScore),
        documentationScore: parseScore(vals.documentationScore),
        manualFeedback: vals.manualFeedback || '',
        teacherAiPenalty: parseScore(vals.teacherAiPenalty),
      };
      
      await updateManualGrading(scoreId, payload);
      toast.success('Manual grades updated for student!');
      const updated = await fetchContributions(gradingModalProject.id);
      setProjectContributions(updated || []);
      
      // Update form state so closing and reopening preserves the values
      const formState = {};
      (updated || []).forEach(c => {
        formState[c.id] = {
          presentationScore: c.presentationScore ?? '',
          reportScore: c.reportScore ?? '',
          documentationScore: c.documentationScore ?? '',
          manualFeedback: c.manualFeedback || '',
          teacherAiPenalty: c.teacherAiPenalty ?? '',
        };
      });
      setGradingForm(formState);
      
    } catch (e) {
      toast.error('Failed to save manual grades: ' + e.message);
    } finally {
      setSavingGrading(false);
    }
  };

  /* ── FILTERING ── */
  const filteredProjects = projects.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const filteredTeams = teams.filter(t => {
    const matchSearch = (t.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
                        (t.projectName || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <TeacherLayout title="Projects & Teams" subtitle="Unified workspace for projects, student teams, meetings, and grading">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── TOP UNIFIED TAB SWITCHER ── */}
      <div className="pj-top-tabs">
        <button
          className={`pj-top-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FaProjectDiagram /> Projects ({projects.length})
        </button>
        <button
          className={`pj-top-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          <FaUsers /> Student Teams ({teams.length})
        </button>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="pj-toolbar">
        <div className="pj-search-wrap">
          <FaSearch className="pj-search-icon" />
          <input
            placeholder={activeTab === 'projects' ? 'Search projects by name...' : 'Search teams by name or project...'}
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {activeTab === 'projects' && (
          <div className="pj-filters">
            {['all','active','at-risk','ahead','archived'].map(f => (
              <button key={f} className={`pj-filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : statusMap[f]?.label || f}
              </button>
            ))}
          </div>
        )}
        {activeTab === 'projects' ? (
          <button className="t-btn-primary pj-create-btn" onClick={() => navigate('/teacher/projects/create')}>
            <FaPlus /> New Project
          </button>
        ) : (
          <button className="t-btn-primary pj-create-btn" onClick={() => setShowTeamWizard(true)}>
            <FaPlus /> Create Team
          </button>
        )}
      </div>

      {/* ── TAB 1: PROJECTS VIEW ── */}
      {activeTab === 'projects' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading projects...</div>
        ) : (
          <div className="pj-list">
            {filteredProjects.map((p, i) => {
              const st = statusMap[p.status] || statusMap.active;
              const assignedTeam = teams.find(t => t.id === p.teamId);
              const isMenuOpen = openMenuId === `proj-${p.id}`;

              return (
                <div className="pj-card" key={p.id} style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="pj-card-top">
                    <div className="pj-card-left">
                      <div className="pj-icon"><ProjectIcon iconKey={p.icon} /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ margin: 0 }}>{p.name}</h3>
                          <button
                            onClick={() => openMeetingModal(p)}
                            title="Schedule & View Team Meeting Logs"
                            style={{ background: 'none', border: 'none', color: '#6675ff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center' }}
                          >
                            <FaCog />
                          </button>
                        </div>
                        <p>{p.description}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="pj-status" style={{ color: st.color, background: st.bg }}>
                        {p.status === 'at-risk' ? <FaExclamationTriangle /> : p.status === 'ahead' ? <FaCheckCircle /> : <FaClock />}
                        {st.label}
                      </span>

                      {/* 3-DOTS ACTION DROPDOWN */}
                      <div className="pj-menu-wrap" onClick={e => e.stopPropagation()}>
                        <button
                          className="pj-dots-btn"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : `proj-${p.id}`)}
                          title="More options"
                        >
                          <FaEllipsisV />
                        </button>
                        {isMenuOpen && (
                          <div className="pj-menu-dropdown">
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); navigate(`/teacher/projects/${p.id}`); }}>
                              <FaEye /> View Details
                            </button>
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); navigate(`/teacher/projects/edit/${p.id}`); }}>
                              <FaEdit /> Edit Project
                            </button>
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); navigate(`/teacher/projects/${p.id}/analyse`); }}>
                              <FaChartBar /> Analyse Git Tree
                            </button>
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); handleGitHubCheck(p); }}>
                              <FaSync /> Recheck GitHub & Branches
                            </button>
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); openMeetingModal(p); }}>
                              <FaVideo /> Meeting Hub & Logs
                            </button>
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); openGradingModal(p); }}>
                              <FaAward /> Manual Grading (Presentation/Report)
                            </button>
                            <div className="pj-menu-divider" />
                            <button className="pj-menu-item danger" onClick={() => { setOpenMenuId(null); setDeleteType('project'); setDeleteTarget(p); }}>
                              <FaTrash /> Delete Project
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Team & Meta Info */}
                  <div className="pj-meta">
                    <span><FaCalendarAlt /> {p.startDate || '—'} → {p.endDate || '—'}</span>
                    <span><FaCodeBranch /> {p.githubRepoName || 'No repo'}</span>
                    {assignedTeam && (
                      <span style={{ background: 'rgba(102,117,255,0.12)', color: '#6675ff', fontWeight: 600 }}>
                        <FaUsers /> Team: {assignedTeam.teamName} ({assignedTeam.members?.length || 0} students)
                      </span>
                    )}
                    {p.semester && <span>{p.semester}</span>}
                    {p.totalMarks && <span>Marks: {p.totalMarks}</span>}
                  </div>

                  {/* Student Members Chips */}
                  {assignedTeam?.members && assignedTeam.members.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {assignedTeam.members.map((m, idx) => (
                        <span key={idx} className="s-badge-pill" style={{ fontSize: 11, padding: '3px 10px', background: m.usn === assignedTeam.teamLeadUsn ? 'rgba(102,117,255,0.15)' : '#f0f4f9', color: m.usn === assignedTeam.teamLeadUsn ? '#6675ff' : '#475569' }}>
                          {m.name || m.usn} {m.usn === assignedTeam.teamLeadUsn ? '⭐' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="pj-btn-view" onClick={() => navigate(`/teacher/projects/${p.id}`)}>
                      <FaEye /> Open Project
                    </button>
                    <button className="pj-btn-ghost" onClick={() => openMeetingModal(p)}>
                      <FaVideo /> Meeting Logs
                    </button>
                    <button className="pj-btn-ghost" onClick={() => openGradingModal(p)}>
                      <FaAward /> Manual Grading
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && !loading && (
              <div className="pj-empty">
                <FaLayerGroup />
                <p>{projects.length === 0 ? 'No projects yet' : 'No projects found'}</p>
                <span>{projects.length === 0 ? 'Click "+ New Project" to get started' : 'Try a different search or filter'}</span>
              </div>
            )}
          </div>
        )
      )}

      {/* ── TAB 2: TEAMS VIEW ── */}
      {activeTab === 'teams' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading teams...</div>
        ) : (
          <div className="ct-teams-grid">
            {filteredTeams.map(team => {
              const st = TEAM_STATUS_CONFIG[team.status] || TEAM_STATUS_CONFIG.active;
              const memberCount = team.members ? team.members.length : 0;
              const leadMember = team.members ? team.members.find(m => m.usn === team.teamLeadUsn) : null;
              const leadName = leadMember ? leadMember.name : (team.teamLeadUsn || '—');
              const isMenuOpen = openMenuId === `team-${team.id}`;

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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="ct-team-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>

                      {/* 3-DOTS ACTION DROPDOWN */}
                      <div className="pj-menu-wrap" onClick={e => e.stopPropagation()}>
                        <button
                          className="pj-dots-btn"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : `team-${team.id}`)}
                          title="Team options"
                        >
                          <FaEllipsisV />
                        </button>
                        {isMenuOpen && (
                          <div className="pj-menu-dropdown">
                            <button className="pj-menu-item" onClick={() => { setOpenMenuId(null); setEditTeamData(team); }}>
                              <FaEdit /> Edit Team Roster
                            </button>
                            <div className="pj-menu-divider" />
                            <button className="pj-menu-item danger" onClick={() => { setOpenMenuId(null); setDeleteType('team'); setDeleteTarget(team); }}>
                              <FaTrash /> Delete Team
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ct-team-meta">
                    <span><FaUsers /> {memberCount} student{memberCount !== 1 ? 's' : ''}</span>
                    <span><FaUserTie /> Lead: {leadName}</span>
                    <span><FaCodeBranch /> {team.githubRepoName || '—'}</span>
                    <span style={{ background: 'rgba(102,117,255,0.1)', color: '#6675ff' }}>{team.projectType}</span>
                  </div>

                  {/* Student Members Chips */}
                  {team.members && team.members.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 14px' }}>
                      {team.members.map((m, idx) => (
                        <span key={idx} className="s-badge-pill" style={{ fontSize: 11, padding: '3px 10px', background: m.usn === team.teamLeadUsn ? 'rgba(102,117,255,0.15)' : '#f0f4f9', color: m.usn === team.teamLeadUsn ? '#6675ff' : '#475569' }}>
                          {m.name || m.usn} {m.usn === team.teamLeadUsn ? '⭐' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button className="pj-btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => setEditTeamData(team)}>
                      <FaEdit /> Edit Roster
                    </button>
                    <button className="pj-btn-ghost" style={{ fontSize: 12, padding: '8px 14px', color: '#e05c5c' }} onClick={() => { setDeleteType('team'); setDeleteTarget(team); }}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTeams.length === 0 && !loading && (
              <div className="ct-teams-empty">
                <FaUsers />
                <p>No teams found</p>
                <span>Click "+ Create Team" to get started</span>
              </div>
            )}
          </div>
        )
      )}

      {/* ── MEETING SCHEDULER & DISCUSSION LOGS MODAL ── */}
      {meetingModalProject && (
        <div className="ct-wizard-overlay" onClick={() => setMeetingModalProject(null)}>
          <div className="ct-wizard-panel" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="ct-wizard-header">
              <div>
                <h3><FaVideo /> Team Meetings & Discussion Logs</h3>
                <p>{meetingModalProject.name} · Schedule meetings and log key outcomes</p>
              </div>
              <button className="ct-wizard-close" onClick={() => setMeetingModalProject(null)}><FaTimes /></button>
            </div>

            <div className="ct-wizard-scroll">
              {/* Meeting Scheduler Form */}
              <div className="ct-section" style={{ marginBottom: 24 }}>
                <div className="ct-section-head"><FaVideo /> {editingMeetingId ? 'Edit Meeting / Discussion Record' : 'Schedule New Meeting'}</div>
                <div className="ct-grid">
                  <div className="t-field ct-full">
                    <label>Meeting Title / Agenda <span className="ct-req">*</span></label>
                    <div className="t-input-wrap">
                      <input
                        placeholder="e.g. Sprint 2 Progress & Architecture Review"
                        value={meetingForm.title}
                        onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="t-field">
                    <label>Date & Time</label>
                    <div className="t-input-wrap">
                      <input
                        type="datetime-local"
                        value={meetingForm.meetingDate}
                        onChange={e => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="t-field">
                    <label>Attendance (USN or name, one per line)</label>
                    <div className="t-input-wrap">
                      <textarea rows={3} placeholder="4MN231 - Present\n4MN232 - Present\n4MN233 - Absent" value={meetingForm.attendanceJson} onChange={e => setMeetingForm({ ...meetingForm, attendanceJson: e.target.value })} />
                    </div>
                  </div>
                  <div className="t-field ct-full">
                    <label>Discussion Log & Key Decisions</label>
                    <div className="t-input-wrap">
                      <textarea
                        rows={3}
                        placeholder="Log what was discussed, blockers resolved, decisions made..."
                        value={meetingForm.discussionSummary}
                        onChange={e => setMeetingForm({ ...meetingForm, discussionSummary: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="t-field ct-full">
                    <label>Action Items & Student Next Steps</label>
                    <div className="t-input-wrap">
                      <textarea
                        rows={2}
                        placeholder="e.g. Sharath: Submit Login PR by Friday; Alice: Test API endpoints..."
                        value={meetingForm.actionItems}
                        onChange={e => setMeetingForm({ ...meetingForm, actionItems: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  {editingMeetingId && (
                    <button className="t-btn-ghost" onClick={() => {
                      setEditingMeetingId(null);
                      setMeetingForm({ title: `${meetingModalProject.name} - Team Meeting`, meetingDate: '', attendanceJson: '', discussionSummary: '', actionItems: '', status: 'SCHEDULED' });
                    }}>Cancel Edit</button>
                  )}
                  <button className="t-btn-primary" onClick={handleSaveMeeting} disabled={savingMeeting}>
                    <FaSave /> {savingMeeting ? 'Saving...' : editingMeetingId ? 'Update Meeting Log' : 'Save Meeting & Log'}
                  </button>
                </div>
              </div>

              {/* Past Meetings List */}
              <div className="ct-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div className="ct-section-head"><FaClipboardList /> Offline Meeting Logs ({meetings.length})</div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="date" id="meeting-report-date" style={{ padding: 7, border: '1px solid #cbd5e1', borderRadius: 7 }} /><button className="t-btn-ghost" onClick={() => exportMeetingPdf(document.getElementById('meeting-report-date')?.value || '')}><FaDownload /> Date PDF</button><button className="t-btn-primary" onClick={() => exportMeetingPdf()}><FaDownload /> All Logs PDF</button></div></div>
                {meetings.length === 0 ? (
                  <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No meeting logs recorded yet for this team.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {meetings.map(m => (
                      <div key={m.id} className="t-card" style={{ padding: '16px 20px', borderRadius: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{m.title}</h4>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="t-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => {
                              setEditingMeetingId(m.id);
                              setMeetingForm({
                                title: m.title || '',
                                meetingDate: m.meetingDate ? String(m.meetingDate).slice(0, 16) : '',
                                attendanceJson: m.attendanceJson || '',
                                discussionSummary: m.discussionSummary || '',
                                actionItems: m.actionItems || '',
                                status: m.status || 'SCHEDULED',
                              });
                            }}><FaEdit /> Edit</button>
                            <button className="t-btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: '#e05c5c' }} onClick={() => handleDeleteMeeting(m.id)}><FaTrash /></button>
                          </div>
                        </div>
                        {m.meetingDate && <p style={{ fontSize: 12, color: '#6675ff', fontWeight: 600, margin: '2px 0 6px' }}><FaCalendarAlt /> {m.meetingDate}</p>}
                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#334155', marginBottom: 6 }}><strong>Attendance:</strong> {m.attendanceJson || 'Not recorded'}</div>
                        {m.discussionSummary && (
                          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#334155', marginBottom: 6 }}>
                            <strong>Discussion Summary:</strong> {m.discussionSummary}
                          </div>
                        )}
                        {m.actionItems && (
                          <div style={{ background: 'rgba(102,117,255,0.06)', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#4338ca' }}>
                            <strong>Action Items:</strong> {m.actionItems}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL GRADING MODAL ── */}
      {gradingModalProject && (
        <div className="ct-wizard-overlay" onClick={() => setGradingModalProject(null)}>
          <div className="ct-wizard-panel" style={{ maxWidth: 840 }} onClick={e => e.stopPropagation()}>
            <div className="ct-wizard-header">
              <div>
                <h3><FaAward /> Manual Grading (Presentation & Reports)</h3>
                <p>{gradingModalProject.name} — Grade soft skills, presentation, and written report contributions</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="t-btn-primary" onClick={handlePublishMarks} style={{ background: '#2ecc71', borderColor: '#2ecc71' }}>
                  Publish All Marks
                </button>
                <button className="ct-wizard-close" onClick={() => setGradingModalProject(null)}><FaTimes /></button>
              </div>
            </div>

            <div className="ct-wizard-scroll">
              {projectContributions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
                  <FaAward style={{ fontSize: 36, color: '#6675ff', marginBottom: 10 }} />
                  <p>No student contributions analyzed yet. Run Git Analysis first to load students.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {projectContributions.map(c => {
                    const rowForm = gradingForm[c.id] || {};
                    const isAiRiskHigh = c.aiRisk > 45;
                    return (
                      <div key={c.id} className="t-card" style={{ padding: '18px 22px', borderRadius: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{c.studentName || c.studentUsn}</h4>
                            <span style={{ fontSize: 12, color: '#64748b' }}>USN: {c.studentUsn} · Git Score: <strong>{c.score != null ? Math.round(c.score) : 0}%</strong></span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button
                              className="t-btn-primary"
                              style={{ padding: '6px 14px', fontSize: 12 }}
                              onClick={() => handleSaveGrading(c.id)}
                              disabled={savingGrading}
                            >
                              <FaSave /> Save Marks
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.marksPublished ? '#f0fdf4' : '#f1f5f9', padding: '4px 10px', borderRadius: 20, border: `1px solid ${c.marksPublished ? '#bbf7d0' : '#e2e8f0'}` }}>
                              <span style={{ fontSize: 12, color: c.marksPublished ? '#166534' : '#64748b', fontWeight: 600 }}>Published</span>
                              <div 
                                onClick={async () => {
                                  const isPublished = !c.marksPublished;
                                  try {
                                    await updateManualGrading(c.id, { marksPublished: isPublished });
                                    toast.success(isPublished ? `Marks published for ${c.studentName || c.studentUsn}` : `Marks hidden for ${c.studentName || c.studentUsn}`);
                                    setProjectContributions(prev => prev.map(p => p.id === c.id ? { ...p, marksPublished: isPublished } : p));
                                  } catch (err) {
                                    toast.error('Failed to update publish status');
                                  }
                                }}
                                style={{ 
                                  width: 32, height: 18, borderRadius: 10, background: c.marksPublished ? '#2ecc71' : '#cbd5e1', 
                                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s' 
                                }}
                              >
                                <div style={{
                                  width: 14, height: 14, borderRadius: '50%', background: '#fff', 
                                  position: 'absolute', top: 2, left: c.marksPublished ? 16 : 2, transition: 'left 0.2s'
                                }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {isAiRiskHigh && (
                          <div style={{ background: 'rgba(224, 92, 92, 0.1)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, color: '#e05c5c', border: '1px solid rgba(224, 92, 92, 0.3)' }}>
                            <FaExclamationTriangle style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12 }}>
                              <strong>High AI Code Detected ({c.aiRisk}%)</strong>. Please apply a manual AI penalty percentage to override.
                            </div>
                            <div className="t-input-wrap" style={{ width: 100 }}>
                              <input
                                type="number" min="0" max="100"
                                placeholder="Penalty %"
                                value={rowForm.teacherAiPenalty ?? ''}
                                onChange={e => setGradingForm(p => ({
                                  ...p,
                                  [c.id]: { ...p[c.id], teacherAiPenalty: e.target.value }
                                }))}
                                style={{ background: '#fff' }}
                              />
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Presentation (0–25)</label>
                            <div className="t-input-wrap">
                              <input
                                type="number" min="0" max="25"
                                placeholder="Marks"
                                value={rowForm.presentationScore ?? ''}
                                onChange={e => setGradingForm(p => ({
                                  ...p,
                                  [c.id]: { ...p[c.id], presentationScore: e.target.value }
                                }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Project Report (0–25)</label>
                            <div className="t-input-wrap">
                              <input
                                type="number" min="0" max="25"
                                placeholder="Marks"
                                value={rowForm.reportScore ?? ''}
                                onChange={e => setGradingForm(p => ({
                                  ...p,
                                  [c.id]: { ...p[c.id], reportScore: e.target.value }
                                }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Documentation (0–25)</label>
                            <div className="t-input-wrap">
                              <input
                                type="number" min="0" max="25"
                                placeholder="Marks"
                                value={rowForm.documentationScore ?? ''}
                                onChange={e => setGradingForm(p => ({
                                  ...p,
                                  [c.id]: { ...p[c.id], documentationScore: e.target.value }
                                }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Teacher Feedback & Notes</label>
                          <div className="t-input-wrap">
                            <input
                              placeholder="Feedback on presentation delivery and report structure..."
                              value={rowForm.manualFeedback || ''}
                              onChange={e => setGradingForm(p => ({
                                ...p,
                                [c.id]: { ...p[c.id], manualFeedback: e.target.value }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT TEAM WIZARD ── */}
      {showTeamWizard && (
        <TeamWizard
          onClose={() => setShowTeamWizard(false)}
          onSave={async (payload) => {
            try {
              await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              toast.success('Team created successfully!');
              setShowTeamWizard(false);
              loadAllData();
            } catch (err) {
              toast.error(err.message || 'Failed to create team');
            }
          }}
        />
      )}

      {editTeamData && (
        <TeamWizard
          initialData={editTeamData}
          onClose={() => setEditTeamData(null)}
          onSave={async (payload) => {
            try {
              await fetch(`/api/teams/${editTeamData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              toast.success('Team updated successfully!');
              setEditTeamData(null);
              loadAllData();
            } catch (err) {
              toast.error(err.message || 'Failed to update team');
            }
          }}
        />
      )}

      {/* ── DELETE CONFIRMATION ── */}
      {deleteTarget && (
        <div className="ct-wizard-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="ct-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="ct-confirm-icon"><FaTrash /></div>
            <h3>Delete {deleteType === 'project' ? 'Project' : 'Team'}</h3>
            <p>Delete <strong>{deleteTarget.name || deleteTarget.teamName}</strong>? This action cannot be undone.</p>
            {deleteType === 'project' && deleteTarget.githubRepoName && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18, color: '#4b5563', fontSize: 13 }}>
                <input type="checkbox" checked={deleteGithubRepo} onChange={e => setDeleteGithubRepo(e.target.checked)} />
                Also delete the linked GitHub repository
              </label>
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

      {/* ── GITHUB STATUS MODAL ── */}
      {githubModal && (
        <div className="ct-wizard-overlay" onClick={() => setGithubModal(null)}>
          <div className="ct-confirm-box" onClick={e => e.stopPropagation()}>
            <div className={`ct-confirm-icon ${githubModal.status === 'error' ? 'pj-github-error' : githubModal.status === 'success' ? 'pj-github-success' : ''}`}>
              {githubModal.status === 'loading' ? <FaSpinner className="pj-github-spin" /> : githubModal.status === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <h3>{githubModal.status === 'success' ? 'GitHub connected' : githubModal.status === 'error' ? 'GitHub setup incomplete' : 'Checking GitHub setup'}</h3>
            <p>{githubModal.message}</p>
            {githubModal.details && <div className="pj-github-details">{githubModal.details}</div>}
            <div className="ct-confirm-actions">
              <button className="t-btn-ghost" onClick={() => setGithubModal(null)}>Close</button>
              {githubModal.status === 'error' && (
                <button className="t-btn-primary" onClick={() => navigate('/teacher/github-workflow')}>Open workflow</button>
              )}
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}

