import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaChartLine, FaSearch, FaSync, FaDownload, FaTable, FaChartBar, FaUsers, FaCodeBranch, FaClock, FaTrophy, FaSave, FaListAlt, FaPlus, FaMinus, FaCalendarAlt, FaFire } from 'react-icons/fa';
import RepositoryEvidence from '../components/RepositoryEvidence';
import useAnalysisUpdates from '../components/useAnalysisUpdates';
import TeacherLayout from './TeacherLayout';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import ContributionCharts from '../components/ContributionCharts';
import TechStackPanel from '../components/TechStackPanel';
import { fetchProjects, fetchContributions, analyzeContributions, connectRepositoryWebhook, updateContribution, validateTeacherSession } from '../services/api';

const STATUS = {
  ACTIVE: { label: 'Active', color: '#16a34a', bg: '#dcfce7' },
  AT_RISK: { label: 'At risk', color: '#b45309', bg: '#fef3c7' },
  INACTIVE: { label: 'Inactive', color: '#dc2626', bg: '#fee2e2' },
  NOT_CONTRIBUTING: { label: 'No contribution', color: '#64748b', bg: '#f1f5f9' },
};

const number = value => Number(value) || 0;

export default function ContributionDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [view, setView] = useState('table');
  const [commitStudentFilter, setCommitStudentFilter] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { toasts, removeToast, toast } = useToast();

  const requestId = useRef(0);
  const displayedProject = useRef(null);
  const loadScores = useCallback(async project => {
    if (!project) return;
    const current = ++requestId.current;
    if (displayedProject.current !== project.id) {
      displayedProject.current = project.id;
      setLoading(true);
    }
    setSelectedProject(project);
    try {
      const records = await fetchContributions(project.id);
      if (current === requestId.current) setScores(records || []);
    } catch (error) {
      if (current !== requestId.current) return;
      setScores([]);
      toast.error(error.message || 'Unable to load contribution data');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [toast]);

  useEffect(() => {
    fetchProjects()
      .then(data => {
        const available = (data || []).filter(project => project.githubRepoName);
        setProjects(available);
        if (available[0]) loadScores(available[0]);
        else setLoading(false);
      })
      .catch(error => { setLoading(false); toast.error(error.message || 'Unable to load projects'); });
  }, [loadScores, toast]);

  useAnalysisUpdates(selectedProject?.id, () => loadScores(selectedProject));

  const analyze = async () => {
    if (!selectedProject) return;
    setAnalyzing(true);
    try {
      await validateTeacherSession();
      const result = await analyzeContributions(selectedProject.id);
      await loadScores(selectedProject);
      toast.success(result?.message || 'Contribution analysis completed');
    } catch (error) {
      toast.error(error.code === 'AUTH_EXPIRED' ? 'Teacher session expired. Please log in again.' : error.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const connectWebhook = async () => {
    setConnecting(true);
    try {
      const result = await connectRepositoryWebhook(selectedProject.id);
      toast.success(result.message);
    } catch (error) { toast.error(error.message); }
    finally { setConnecting(false); }
  };

  const startEdit = score => {
    setEditingId(score.id);
    setEditForm({
      presentationScore: score.presentationScore ?? '',
      reportScore: score.reportScore ?? '',
      documentationScore: score.documentationScore ?? '',
      teacherAiPenalty: score.teacherAiPenalty ?? '',
      manualFeedback: score.manualFeedback || '',
    });
  };

  const saveEdit = async score => {
    try {
      const payload = {
        ...editForm,
        presentationScore: editForm.presentationScore === '' ? null : number(editForm.presentationScore),
        reportScore: editForm.reportScore === '' ? null : number(editForm.reportScore),
        documentationScore: editForm.documentationScore === '' ? null : number(editForm.documentationScore),
        teacherAiPenalty: editForm.teacherAiPenalty === '' ? 0 : number(editForm.teacherAiPenalty),
      };
      const updated = await updateContribution(score.id, payload);
      setScores(items => items.map(item => item.id === score.id ? { ...item, ...updated } : item));
      setEditingId(null);
      toast.success('Contribution marks saved');
    } catch (error) { toast.error(error.message || 'Unable to save marks'); }
  };

  const filteredScores = useMemo(() => scores.filter(score => {
    const text = `${score.studentName || ''} ${score.studentUsn || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (statusFilter === 'ALL' || score.status === statusFilter);
  }), [scores, query, statusFilter]);

  const metrics = useMemo(() => ({
    average: scores.length ? (scores.reduce((sum, item) => sum + number(item.score), 0) / scores.length).toFixed(1) : '0.0',
    commits: scores.reduce((sum, item) => sum + number(item.totalCommits), 0),
    active: scores.filter(item => item.status === 'ACTIVE').length,
    additions: scores.reduce((sum, item) => sum + number(item.linesAdded), 0),
  }), [scores]);

  const downloadCsv = () => {
    const rows = [['Student', 'USN', 'Score', 'Commits', 'Lines added', 'Active days', 'Status'], ...scores.map(item => [item.studentName || '', item.studentUsn || '', number(item.score), number(item.totalCommits), number(item.linesAdded), number(item.activeDays), item.status || ''])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${(selectedProject?.name || 'contribution-analysis').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const statCards = [
    { label: 'Average score', value: `${metrics.average}/100`, icon: <FaTrophy />, color: '#6675ff' },
    { label: 'Total commits', value: metrics.commits, icon: <FaCodeBranch />, color: '#2ecc71' },
    { label: 'Working contributors', value: `${metrics.active}/${scores.length}`, icon: <FaUsers />, color: '#f39c12' },
    { label: 'Lines added', value: metrics.additions.toLocaleString(), icon: <FaChartLine />, color: '#8c4fff' },
  ];

  return (
    <TeacherLayout title="Contribution Analysis" subtitle="Measure GitHub work, compare students, and record final marks">
      <Toast toasts={toasts} removeToast={removeToast} />
      <section style={{ background: 'linear-gradient(135deg,#18233d,#293b68)', borderRadius: 16, padding: 24, color: '#fff', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Teacher workspace</div><h1 style={{ margin: '7px 0 6px', fontSize: 25 }}>Contribution intelligence</h1><p style={{ margin: 0, opacity: 0.75, fontSize: 13 }}>Refresh GitHub analysis, review individual evidence, and save manual marks.</p></div>
          <div style={{ minWidth: 260 }}><label style={{ display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 6 }}>PROJECT</label><select disabled={analyzing} value={selectedProject?.id || ''} onChange={event => loadScores(projects.find(project => project.id === Number(event.target.value)))} style={{ width: '100%', padding: 11, borderRadius: 9, border: 0, color: '#17213a' }}><option value="">Select a GitHub-linked project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}><button className="t-btn-primary" onClick={analyze} disabled={!selectedProject || analyzing}><FaSync /> {analyzing ? 'Analyzing GitHub...' : 'Analyze now'}</button>{selectedProject && <button className="t-btn-ghost" style={{ color: '#fff' }} onClick={connectWebhook} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect webhook'}</button>}{selectedProject && <button className="t-btn-ghost" onClick={downloadCsv} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}><FaDownload /> Export CSV</button>}</div>
      </section>

      {!selectedProject ? <div className="t-card" style={{ padding: 42, textAlign: 'center' }}><FaChartLine style={{ fontSize: 34, color: '#6675ff', marginBottom: 12 }} /><h3 style={{ margin: 0 }}>Select a project to begin</h3><p style={{ color: '#64748b', fontSize: 13 }}>Only projects with a linked GitHub repository can be analyzed.</p></div> : loading ? <div className="t-card" style={{ padding: 42, textAlign: 'center' }}>Loading contribution records...</div> : <>
        <TechStackPanel project={selectedProject} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 22 }}>{statCards.map(card => <div className="t-card" key={card.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 17 }}><div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: `${card.color}18`, color: card.color }}>{card.icon}</div><div><strong style={{ display: 'block', fontSize: 19 }}>{card.value}</strong><span style={{ color: '#64748b', fontSize: 11 }}>{card.label}</span></div></div>)}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}><div style={{ position: 'relative', flex: 1, minWidth: 220 }}><FaSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student or USN" style={{ width: '100%', padding: '10px 12px 10px 34px', border: '1px solid #dbe3ef', borderRadius: 9, boxSizing: 'border-box' }} /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={{ padding: 10, border: '1px solid #dbe3ef', borderRadius: 9 }}><option value="ALL">All statuses</option>{Object.keys(STATUS).map(key => <option key={key}>{key}</option>)}</select><button className="t-btn-ghost" onClick={() => setView(view === 'table' ? 'charts' : 'table')}>{view === 'table' ? <><FaChartBar /> Charts</> : <><FaTable /> Table</>}</button></div>
        {view === 'charts' ? <ContributionCharts scores={filteredScores} /> : <div className="t-card" style={{ overflowX: 'auto', padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}><thead><tr style={{ background: '#f8fafc' }}>{['Student', 'Score', 'Commits', 'Lines added', 'Active days', 'Status', 'Marks'].map(label => <th key={label} style={{ padding: 13, textAlign: label === 'Student' ? 'left' : 'center', fontSize: 11, color: '#64748b' }}>{label}</th>)}</tr></thead><tbody>{filteredScores.map(score => { const badge = STATUS[score.status] || STATUS.NOT_CONTRIBUTING; const editing = editingId === score.id; return <React.Fragment key={score.id}><tr style={{ borderTop: '1px solid #eef2f7' }}><td style={{ padding: 13 }}><strong style={{ display: 'block', fontSize: 13 }}>{score.studentName || 'Unknown student'}</strong><span style={{ fontSize: 11, color: '#64748b' }}>{score.studentUsn || 'No USN'}</span></td><td style={{ textAlign: 'center', fontWeight: 800, color: '#6675ff' }}>{number(score.score).toFixed(1)}</td><td style={{ textAlign: 'center' }}>{number(score.totalCommits)}</td><td style={{ textAlign: 'center' }}>{number(score.linesAdded).toLocaleString()}</td><td style={{ textAlign: 'center' }}>{number(score.activeDays)}</td><td style={{ textAlign: 'center' }}><span style={{ color: badge.color, background: badge.bg, padding: '5px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{badge.label}</span></td><td style={{ textAlign: 'center' }}><button className="t-btn-ghost" onClick={() => editing ? saveEdit(score) : startEdit(score)}>{editing ? <><FaSave /> Save</> : 'Edit marks'}</button></td></tr>{editing && <tr><td colSpan="7" style={{ padding: 15, background: '#f8fafc' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>{[['presentationScore','Presentation /25'],['reportScore','Report /25'],['documentationScore','Documentation /25'],['teacherAiPenalty','AI penalty %']].map(([key, label]) => <label key={key} style={{ fontSize: 11, color: '#64748b' }}>{label}<input type="number" value={editForm[key]} onChange={event => setEditForm(form => ({ ...form, [key]: event.target.value }))} style={{ width: '100%', marginTop: 5, padding: 8, boxSizing: 'border-box' }} /></label>)}</div><textarea value={editForm.manualFeedback} onChange={event => setEditForm(form => ({ ...form, manualFeedback: event.target.value }))} placeholder="Manual feedback" style={{ width: '100%', marginTop: 12, padding: 9, boxSizing: 'border-box', minHeight: 55 }} /></td></tr>}</React.Fragment>; })}</tbody></table>{filteredScores.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No students match the current filters.</div>}</div>}

        {/* ── COMMIT ANALYSIS TABLE ── */}
        <div className="t-card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FaListAlt style={{ color: '#6675ff' }} />
            <strong style={{ fontSize: 15, color: '#1e293b' }}>Commit Analysis — Per Student</strong>
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8', fontSize: 12 }} />
              <input
                value={commitStudentFilter}
                onChange={e => setCommitStudentFilter(e.target.value)}
                placeholder="Filter student…"
                style={{ padding: '8px 10px 8px 28px', border: '1px solid #dbe3ef', borderRadius: 8, fontSize: 12 }}
              />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(90deg,#6675ff,#8c4fff)' }}>
                  {['Student', 'USN', 'Total Commits', 'Lines Added', 'Lines Deleted', 'Net Lines', 'Active Days', 'Last Commit', 'Commit Frequency', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Student' || h === 'USN' ? 'left' : 'center', fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredScores
                  .filter(s => !commitStudentFilter || (s.studentName || '').toLowerCase().includes(commitStudentFilter.toLowerCase()) || (s.studentUsn || '').toLowerCase().includes(commitStudentFilter.toLowerCase()))
                  .sort((a, b) => number(b.totalCommits) - number(a.totalCommits))
                  .map((score, idx) => {
                    const badge = STATUS[score.status] || STATUS.NOT_CONTRIBUTING;
                    const netLines = number(score.linesAdded) - number(score.linesDeleted);
                    const activeDays = number(score.activeDays);
                    const totalCommits = number(score.totalCommits);
                    const freq = activeDays > 0 ? (totalCommits / activeDays).toFixed(2) : '0.00';
                    const linesPerCommit = totalCommits > 0 ? Math.round(number(score.linesAdded) / totalCommits) : 0;
                    return (
                      <tr key={score.id} style={{ borderBottom: '1px solid #eef2f7', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>{score.studentName || '—'}</strong>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>~{linesPerCommit} lines/commit</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>{score.studentUsn || '—'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#6675ff', fontSize: 15 }}>
                            <FaCodeBranch style={{ fontSize: 11 }} />
                            {totalCommits}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ color: '#2ecc71', fontWeight: 600 }}>
                            <FaPlus style={{ fontSize: 10, marginRight: 2 }} />
                            {number(score.linesAdded).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ color: '#e05c5c', fontWeight: 600 }}>
                            <FaMinus style={{ fontSize: 10, marginRight: 2 }} />
                            {number(score.linesDeleted).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: netLines >= 0 ? '#2ecc71' : '#e05c5c' }}>
                          {netLines >= 0 ? '+' : ''}{netLines.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f39c12' }}>
                            <FaCalendarAlt style={{ fontSize: 11 }} />
                            {activeDays}d
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                          {score.lastCommitDate ? new Date(score.lastCommitDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#8c4fff', fontWeight: 600 }}>
                            <FaFire style={{ fontSize: 11 }} />
                            {freq}/day
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ color: badge.color, background: badge.bg, padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{badge.label}</span>
                        </td>
                      </tr>
                    );
                })}
                {filteredScores.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No data available. Run analysis to populate commit data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Summary row */}
          {filteredScores.length > 0 && (
            <div style={{ padding: '12px 20px', background: '#f0f4ff', borderTop: '1px solid #dbe3ef', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <strong style={{ color: '#6675ff' }}>{filteredScores.length}</strong> students
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total commits: <strong style={{ color: '#1e293b' }}>{filteredScores.reduce((s, c) => s + number(c.totalCommits), 0)}</strong>
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total lines added: <strong style={{ color: '#2ecc71' }}>+{filteredScores.reduce((s, c) => s + number(c.linesAdded), 0).toLocaleString()}</strong>
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total lines deleted: <strong style={{ color: '#e05c5c' }}>-{filteredScores.reduce((s, c) => s + number(c.linesDeleted), 0).toLocaleString()}</strong>
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Avg commits/student: <strong style={{ color: '#8c4fff' }}>{filteredScores.length ? (filteredScores.reduce((s, c) => s + number(c.totalCommits), 0) / filteredScores.length).toFixed(1) : '0'}</strong>
              </span>
            </div>
          )}
        </div>
        <RepositoryEvidence project={selectedProject} scores={scores} revision={scores} />
      </>}
    </TeacherLayout>
  );
}