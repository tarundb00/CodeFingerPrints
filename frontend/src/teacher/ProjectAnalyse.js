import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherLayout from './TeacherLayout';
import {
  FaArrowLeft, FaChartLine, FaCheckCircle, FaCode, FaClock,
  FaFire, FaUsers, FaExclamationTriangle,
} from 'react-icons/fa';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import { fetchProject, fetchContributions, analyzeContributions, finalizeProject, fetchProjectAudits, validateTeacherSession } from '../services/api';
import './Projects.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function ProjectAnalyse() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();
  const [project, setProject] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [audits, setAudits] = useState([]);
  const reportRef = useRef(null);
  const primaryActionStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 42, padding: '10px 16px', border: 'none', borderRadius: 10,
    background: 'linear-gradient(135deg, #6675ff, #8c4fff)', color: '#fff',
    fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 18px rgba(102,117,255,.22)',
  };
  const secondaryActionStyle = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 42, padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 10,
    background: '#fff', color: '#334155', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetchProject(projectId).catch(e => { console.error('Failed project:', e); return null; }),
      fetchContributions(projectId).catch(e => { console.error('Failed contributions:', e); return []; }),
      fetchProjectAudits(projectId).catch(e => { console.error('Failed audit history:', e); return []; }),
    ])
      .then(([p, c, a]) => {
        setProject(p);
        setContributions(c || []);
        setAudits(a || []);
      })
      .catch(() => toast.error('Failed to load project analysis data'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const loadAnalysis = async () => {
    const [p, c, a] = await Promise.all([
      fetchProject(projectId),
      fetchContributions(projectId),
      fetchProjectAudits(projectId),
    ]);
    setProject(p);
    setContributions(c || []);
    setAudits(a || []);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await validateTeacherSession();
      await analyzeContributions(projectId);
      await loadAnalysis();
      toast.success('GitHub contribution analysis refreshed.');
    } catch (error) {
      toast.error(error.code === 'AUTH_EXPIRED'
        ? 'Your teacher session has expired. Please log in again, then analyze.'
        : error.message || 'Analysis failed. Check GitHub and analyzer configuration.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Finalize this project? This marks the project as completed.')) return;
    setFinalizing(true);
    try {
      const finalizedProject = await finalizeProject(projectId);
      setProject(finalizedProject);
      toast.success('Project completion finalized.');
    } catch (error) {
      toast.error(error.message || 'Could not finalize this project.');
    } finally {
      setFinalizing(false);
    }
  };

  const downloadCsv = () => {
    const headers = ['Student', 'Score', 'Commits', 'Active Days', 'Bug Fixes', 'Status'];
    const rows = sortedRows(contributions).map(item => [
      item.studentName || item.studentUsn || 'Unknown',
      item.score || 0,
      item.totalCommits || 0,
      item.activeDays || 0,
      item.issuesClosed || 0,
      item.status || 'UNKNOWN',
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-contributions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#f7f9fc' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = 190;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, width, height);
    pdf.save(`${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-analysis.pdf`);
  };

  if (loading) return (
    <TeacherLayout title="Project Analysis" subtitle="Loading...">
      <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Loading analysis...</div>
    </TeacherLayout>
  );

  if (!project) return (
    <TeacherLayout title="Project Analysis" subtitle="Not found">
      <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>Project not found.</div>
    </TeacherLayout>
  );

  // Calculate metrics
  const avgScore = contributions.length > 0
    ? (contributions.reduce((s, c) => s + (Number(c.score) || 0), 0) / contributions.length).toFixed(1)
    : 0;
  const totalCommits = contributions.reduce((s, c) => s + (Number(c.totalCommits) || 0), 0);
  const totalBugFixes = contributions.reduce((s, c) => s + (Number(c.issuesClosed) || 0), 0);
  const avgActiveDays = contributions.length > 0
    ? (contributions.reduce((s, c) => s + (Number(c.activeDays) || 0), 0) / contributions.length).toFixed(1)
    : 0;
  const numericScore = value => Number(value) || 0;

  // Sort contributions by score descending
  const sortedContributions = [...contributions].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Calculate progress percentage
  const progressPercent = Math.round(Math.min(100, Number(avgScore) || 0));

  const activeContributors = contributions.filter(c => (c.totalCommits || 0) > 0).length;
  const finalPercent = Math.min(100, Math.round((progressPercent * 0.75) + ((activeContributors / Math.max(contributions.length, 1)) * 25)));
  const getManualTotal = contribution => [contribution.presentationScore, contribution.reportScore, contribution.documentationScore]
    .reduce((sum, value) => sum + (Number(value) || 0), 0);
  const getFinalScore = contribution => {
    const manualEntered = getManualTotal(contribution);
    const hasManual = [contribution.presentationScore, contribution.reportScore, contribution.documentationScore]
      .some(value => value !== null && value !== undefined);
    const gitScore = Number(contribution.score || 0);
    const combined = hasManual ? ((gitScore / 100) * 50) + ((manualEntered / 75) * 50) : gitScore;
    const penalty = Math.min(100, Math.max(0, Number(contribution.teacherAiPenalty) || 0));
    return Math.max(0, combined * (1 - penalty / 100));
  };
  const averageFinalScore = contributions.length
    ? (contributions.reduce((sum, contribution) => sum + getFinalScore(contribution), 0) / contributions.length).toFixed(1)
    : '0.0';

  return (
    <TeacherLayout title={`${project.name} - Final Completion`} subtitle="Overall project contribution and current work contribution report">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className="t-btn-ghost"
          onClick={() => navigate(`/teacher/projects/${projectId}`)}
          style={secondaryActionStyle}
        >
          <FaArrowLeft /> Back to Project
        </button>

        <button
          className="pj-btn-primary"
          onClick={handleAnalyze}
          disabled={analyzing}
          style={{ ...primaryActionStyle, opacity: analyzing ? 0.65 : 1, cursor: analyzing ? 'wait' : 'pointer' }}
        >
          <FaChartLine /> {analyzing ? 'Analyzing...' : 'Analyze Now'}
        </button>
        <button
          className="pj-btn-primary"
          onClick={handleFinalize}
          disabled={finalizing || project.completionFinalized}
          style={{ ...primaryActionStyle, background: project.completionFinalized ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #2ecc71)', opacity: finalizing ? 0.65 : 1, cursor: finalizing ? 'wait' : 'pointer' }}
        >
          <FaCheckCircle /> {project.completionFinalized ? 'Completion Confirmed' : finalizing ? 'Finalizing...' : 'Finalize Completion'}
        </button>
        <button className="t-btn-ghost" onClick={downloadPdf} style={secondaryActionStyle}>Download PDF</button>
        <button className="t-btn-ghost" onClick={downloadCsv} style={secondaryActionStyle}>Download CSV</button>
      </div>

      <div ref={reportRef}>
      <div className="t-card" style={{ marginBottom: 26, background: 'linear-gradient(135deg, rgba(102,117,255,0.08), rgba(140,79,255,0.08))', border: '1px solid rgba(102,117,255,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="t-section-head"><FaCheckCircle /> Final Project Completion</div>
            <h3 style={{ margin: '6px 0 4px', fontSize: 28, color: '#1d2433' }}>{finalPercent}%</h3>
            <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
              {project.completionFinalized ? `Final completion confirmed by ${project.finalizedBy || 'the project owner'}.` : 'Overall contribution and current working contribution are ready for final review.'}
            </p>
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ height: 12, background: '#eaf0ff', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${finalPercent}%`, background: 'linear-gradient(90deg, #6675ff, #8c4fff)', borderRadius: 999 }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Contribution-based completion • {activeContributors} active contributors
            </div>
          </div>
        </div>
      </div>

      <div className="pd-stats" style={{ marginBottom: 28 }}>
        {[
          { icon: <FaCheckCircle />, val: `${finalPercent}%`, label: 'Final Completion', color: '#6675ff' },
          { icon: <FaChartLine />, val: `${avgScore || 0}/100`, label: 'Overall Contribution', color: '#2ecc71' },
          { icon: <FaCheckCircle />, val: `${averageFinalScore}/100`, label: 'Final Grade Score', color: '#8c4fff' },
          { icon: <FaUsers />, val: activeContributors, label: 'Working Contributors', color: '#8c4fff' },
          { icon: <FaCode />, val: totalCommits, label: 'Project Commits', color: '#6675ff' },
          { icon: <FaClock />, val: avgActiveDays, label: 'Average Active Days', color: '#f39c12' },
        ].map((m, i) => (
          <div className="pd-stat" key={i} style={{ '--sc': m.color }}>
            <div className="pd-stat-icon">{m.icon}</div>
            <div><h3 style={{ fontSize: 13 }}>{m.val}</h3><p>{m.label}</p></div>
          </div>
        ))}
      </div>

      <div className="pd-grid">
        <div className="t-card">
          <div className="t-section-head"><FaChartLine /> Overall Contribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Average contribution score</span>
              <strong style={{ fontSize: 13, color: '#6675ff' }}>{avgScore || 0}/100</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Group total commits</span>
              <strong style={{ fontSize: 13 }}>{totalCommits}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Bug fixes tracked</span>
              <strong style={{ fontSize: 13, color: '#e05c5c' }}>{totalBugFixes}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Working contributors</span>
              <strong style={{ fontSize: 13, color: '#2ecc71' }}>{activeContributors}</strong>
            </div>
          </div>
        </div>

        <div className="t-card">
          <div className="t-section-head"><FaFire /> Working Contribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {sortedContributions.slice(0, 5).map((contrib, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: index < 4 ? '1px solid #eef1f8' : 'none' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1d2433' }}>{index + 1}. {contrib.studentName || contrib.author || 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{contrib.totalCommits || 0} commits • {contrib.activeDays || 0} active days</div>
                </div>
                <strong style={{ fontSize: 12, color: '#6675ff' }}>{numericScore(contrib.score).toFixed(1)}</strong>
              </div>
            ))}
            {contributions.length === 0 && (
              <div style={{ padding: 18, textAlign: 'center', color: '#888', fontSize: 12 }}>No working contribution data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="t-card" style={{ marginTop: 28 }}>
        <div className="t-section-head"><FaUsers /> Current Contribution Details</div>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eef1f8' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Student</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Score</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Commits</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Active Days</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Bug Fixes</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Manual /75</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#666' }}>Final</th>
              </tr>
            </thead>
            <tbody>
              {sortedContributions.map((contrib, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eef1f8', backgroundColor: i % 2 === 0 ? '#fafbfc' : '#fff' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1d2433' }}>{contrib.studentName || contrib.author || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#6675ff', fontWeight: 700 }}>{numericScore(contrib.score).toFixed(1)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>{contrib.totalCommits || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>{contrib.activeDays || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#e05c5c' }}>{contrib.issuesClosed || 0}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#8c4fff', fontWeight: 700 }}>{getManualTotal(contrib)}/75</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#2ecc71', fontWeight: 700 }}>{getFinalScore(contrib).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="t-card" style={{ marginTop: 28 }}>
        <div className="t-section-head"><FaClock /> Analysis Audit History</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
          {audits.map(audit => (
            <div key={audit.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #eef1f8', fontSize: 12 }}>
              <strong style={{ color: '#1d2433' }}>{audit.action}</strong>
              <span style={{ color: '#666' }}>{audit.actor || 'System'} • {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : '—'}</span>
            </div>
          ))}
          {audits.length === 0 && <div style={{ color: '#888', fontSize: 12 }}>No analysis or finalization history yet.</div>}
        </div>
      </div>

      {sortedContributions.filter(c => (c.score || 0) < 40).length > 0 && (
        <div className="t-card" style={{ marginTop: 28, borderLeft: `4px solid #e05c5c` }}>
          <div className="t-section-head" style={{ color: '#e05c5c' }}><FaExclamationTriangle /> Not Enough Working Contribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {sortedContributions.filter(c => (c.score || 0) < 40).map((contrib, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: 8, background: '#e05c5c15', border: '1px solid #e05c5c30' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1d2433' }}>{contrib.studentName || contrib.author || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Score: {numericScore(contrib.score).toFixed(1)}/100 • Commits: {contrib.totalCommits || 0}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#e05c5c' }}>Needs attention</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="t-card" style={{ marginTop: 28 }}>
        <div className="t-section-head"><FaCheckCircle /> Project Completion Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
            The team has reached <strong>{finalPercent}%</strong> completion based on contribution analysis. This summary is meant for the group leader to review before approving the project outcome.
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {project.completionFinalized ? 'Final completion is confirmed and the project summary is ready.' : 'Click “Finalize Completion” after reviewing the latest contribution analysis.'}
          </div>
        </div>
      </div>
      </div>
    </TeacherLayout>
  );
}

function sortedRows(items) {
  return [...items].sort((a, b) => (b.score || 0) - (a.score || 0));
}
