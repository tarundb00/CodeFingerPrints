import React, { useState, useEffect } from 'react';
import StudentLayout from './StudentLayout';
import {
  FaUsers, FaUserTie, FaGithub, FaEnvelope,
  FaIdCard, FaCodeBranch, FaCheckCircle, FaClock, FaUserFriends,
  FaVideo, FaClipboardList, FaDownload, FaCalendarAlt
} from 'react-icons/fa';
import { fetchStudentDashboard, fetchMeetingsByProject } from '../services/api';
import { buildGitHubRepoUrl } from '../utils/githubRepo';

function StudentMeetingsSection({ projectId, teamId }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchMeetingsByProject(projectId)
        .then(d => setMeetings(d || []))
        .catch(() => setMeetings([]))
        .finally(() => setLoading(false));
    }
  }, [projectId]);

  if (loading) return null;
  if (!meetings || meetings.length === 0) return null;

  const downloadLog = () => {
    const popup = window.open('', '_blank', 'width=850,height=650');
    if (!popup) return;
    popup.document.write(`<html><head><title>Team meeting log</title><style>body{font-family:Arial;padding:28px;color:#17213a}.meeting{border:1px solid #dbe3ef;border-radius:10px;padding:16px;margin:14px 0}.label{font-weight:bold;margin-top:10px}</style></head><body><h1>Team Meeting Discussion Log</h1>${meetings.map(meeting => `<div class="meeting"><h2>${meeting.title || 'Team meeting'}</h2><div>${meeting.meetingDate || 'Date not set'}</div><div class="label">Attendance</div><div>${meeting.attendanceJson || 'Not recorded'}</div><div class="label">Discussion</div><div>${meeting.discussionSummary || 'Not recorded'}</div><div class="label">Action items</div><div>${meeting.actionItems || 'None'}</div></div>`).join('')}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  };

  return (
    <div className="s-card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><div className="s-card-head"><FaVideo /> Team Meetings & Teacher Discussion Logs ({meetings.length})</div><button className="s-btn-ghost" onClick={downloadLog}><FaDownload /> Download log</button></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {meetings.map(m => (
          <div key={m.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{m.title}</h4>
              {m.meetingDate && (
                <span style={{ fontSize: 12, color: '#6675ff', fontWeight: 600 }}>
                  <FaCalendarAlt style={{ marginRight: 4 }} />{m.meetingDate}
                </span>
              )}
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#64748b' }}>Offline team meeting · Attendance and notes recorded by the team leader</div>
            {m.attendanceJson && <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#334155', border: '1px solid #e2e8f0', marginBottom: 8 }}><strong>Attendance:</strong> {m.attendanceJson}</div>}
            {m.discussionSummary && (
              <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#334155', border: '1px solid #e2e8f0', marginBottom: 8 }}>
                <strong style={{ color: '#0f172a' }}>Meeting Discussion Notes:</strong>
                <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{m.discussionSummary}</p>
              </div>
            )}
            {m.actionItems && (
              <div style={{ background: 'rgba(102,117,255,0.06)', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#4338ca', border: '1px solid rgba(102,117,255,0.15)' }}>
                <strong>Assigned Action Items:</strong>
                <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{m.actionItems}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLE_COLORS = {
  Coder:       { color: '#6675ff', bg: 'rgba(102,117,255,0.12)' },
  Documenter:  { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)'  },
  Presenter:   { color: '#f39c12', bg: 'rgba(243,156,18,0.12)'  },
  Researcher:  { color: '#8c4fff', bg: 'rgba(140,79,255,0.12)'  },
  Tester:      { color: '#e05c5c', bg: 'rgba(224,92,92,0.12)'   },
  Reviewer:    { color: '#1abc9c', bg: 'rgba(26,188,156,0.12)'  },
  Coordinator: { color: '#e67e22', bg: 'rgba(230,126,34,0.12)'  },
};
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6675ff,#8c4fff)',
  'linear-gradient(135deg,#2ecc71,#1abc9c)',
  'linear-gradient(135deg,#f39c12,#e67e22)',
  'linear-gradient(135deg,#e05c5c,#c0392b)',
  'linear-gradient(135deg,#8c4fff,#6675ff)',
  'linear-gradient(135deg,#1abc9c,#2ecc71)',
];
const C = { text: '#1d2433', muted: '#888', border: '#dde3f0' };

export default function StudentTeam() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [student] = useState(() => JSON.parse(localStorage.getItem('student') || '{}'));

  useEffect(() => {
    if (!student.usn) { setLoading(false); return; }
    fetchStudentDashboard(student.usn)
      .then(d => setData(d)).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const team    = data?.team || null;
  const members = team?.members || [];
  const lead    = members.find(m => m.usn === team?.teamLeadUsn);

  return (
    <StudentLayout title="My Team" subtitle="Team members, roles and collaboration info">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading team...</div>
      ) : !team ? (
        <div className="s-empty" style={{ marginTop: 60 }}>
          <div className="s-empty-icon"><FaUserFriends /></div>
          <p>No team assigned yet</p>
          <span>Your teacher will assign you to a team soon</span>
        </div>
      ) : (
        <>
          {/* TEAM HEADER */}
          <div className="s-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#6675ff,#8c4fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                  {team.teamName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text }}>{team.teamName}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{team.projectName} · {team.projectType}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Members', value: members.length },
                  { label: 'Min',     value: team.minStudents || '—' },
                  { label: 'Max',     value: team.maxStudents || '—' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#6675ff' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {team.description && (
              <p style={{ margin: '16px 0 0', fontSize: 14, color: C.muted, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                {team.description}
              </p>
            )}
          </div>

          {/* TEAM LEAD */}
          {lead && (
            <div className="s-card" style={{ background: 'rgba(102,117,255,0.05)', border: '1px solid rgba(102,117,255,0.2)', boxShadow: 'none' }}>
              <div className="s-card-head"><FaUserTie style={{ color: '#f39c12' }} /> Team Lead</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#f39c12,#e67e22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                  {(lead.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: C.text }}>
                    {lead.name}
                    {lead.usn === student.usn && <span style={{ marginLeft: 10, fontSize: 12, color: '#6675ff', fontWeight: 700 }}>← You</span>}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{lead.usn} · {lead.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {lead.githubUsername && (
                    <a href={`https://github.com/${lead.githubUsername}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6675ff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <FaGithub /> {lead.githubUsername}
                    </a>
                  )}
                  <span className="s-badge-pill" style={{ color: '#f39c12', background: 'rgba(243,156,18,0.12)', fontSize: 11 }}>
                    <FaUserTie style={{ marginRight: 4 }} /> Team Lead
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ALL MEMBERS */}
          <div className="s-card">
            <div className="s-card-head"><FaUsers /> All Members ({members.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {members.map((m, i) => {
                const roleCfg = ROLE_COLORS[m.roleName] || { color: '#6675ff', bg: 'rgba(102,117,255,0.12)' };
                const isLead  = m.usn === team.teamLeadUsn;
                const isMe    = m.usn === student.usn;
                return (
                  <div key={i} style={{ background: isMe ? 'rgba(102,117,255,0.06)' : '#eef1f8', border: `1px solid ${isMe ? 'rgba(102,117,255,0.25)' : C.border}`, borderRadius: 16, padding: '16px 18px', boxShadow: '5px 5px 12px #d1d9e6,-5px -5px 12px #ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                        {(m.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {m.name}
                          {isLead && <span style={{ fontSize: 10, color: '#f39c12', fontWeight: 700 }}><FaUserTie style={{ marginRight: 2 }} />Lead</span>}
                          {isMe   && <span style={{ fontSize: 10, color: '#6675ff', fontWeight: 700 }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{m.usn}</div>
                      </div>
                      <span className="s-badge-pill" style={{ color: roleCfg.color, background: roleCfg.bg, fontSize: 11 }}>
                        {m.roleName || 'Member'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: <FaEnvelope />, value: m.email || '—' },
                        { icon: <FaIdCard />,   value: m.section || '—' },
                        { icon: <FaGithub />,   value: m.githubUsername || 'Not set' },
                      ].map((r, ri) => (
                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                          <span style={{ color: '#6675ff', width: 14 }}>{r.icon}</span>
                          <span>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.approved
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2ecc71', fontWeight: 600 }}><FaCheckCircle /> Approved</span>
                        : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888', fontWeight: 600 }}><FaClock /> Pending Approval</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GITHUB REPO */}
          {team.githubRepoName && (
            <div className="s-card">
              <div className="s-card-head"><FaGithub /> Team Repository</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{team.githubRepoName}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{team.githubDescription || 'No description'}</div>
                </div>
                <span className="s-badge-pill" style={{ color: '#6675ff', background: 'rgba(102,117,255,0.12)' }}>
                  <FaCodeBranch style={{ marginRight: 4 }} />{team.githubVisibility || 'private'}
                </span>
                <a href={buildGitHubRepoUrl(team.githubRepoName, team?.githubOwner || '') || '#'} target="_blank" rel="noreferrer" className="s-btn-ghost" style={{ textDecoration: 'none' }}>
                  <FaGithub /> Open Repo
                </a>
              </div>
            </div>
          )}

          {/* ── MEETING & DISCUSSION LOGS FOR STUDENTS ── */}
          {data?.project?.id && (
            <StudentMeetingsSection projectId={data.project.id} teamId={team.id} />
          )}
        </>
      )}
    </StudentLayout>
  );
}
