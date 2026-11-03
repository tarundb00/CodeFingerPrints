import React, { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaSearch, FaSync, FaDownload, FaTable, FaChartBar, FaUsers, FaCodeBranch, FaClock, FaTrophy, FaSave } from 'react-icons/fa';
import TeacherLayout from './TeacherLayout';
import Toast from '../components/Toast';
import useToast from '../components/useToast';
import ContributionCharts from '../components/ContributionCharts';
import { fetchProjects, fetchContributions, analyzeContributions, updateContribution, validateTeacherSession } from '../services/api';

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
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { toasts, removeToast, toast } = useToast();

  const loadScores = async project => {
    if (!project) return;
    setSelectedProject(project);
    setLoading(true);
    try {
      setScores(await fetchContributions(project.id) || []);
    } catch (error) {
      setScores([]);
      toast.error(error.message || 'Unable to load contribution data');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProjects()
      .then(data => {
        const available = (data || []).filter(project => project.githubRepoName);
        setProjects(available);
        if (available[0]) loadScores(available[0]);
        else setLoading(false);
      })
      .catch(error => { setLoading(false); toast.error(error.message || 'Unable to load projects'); });
  }, []);

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
    active: scores.filter(item => number(item.totalCommits) > 0).length,
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
          <div style={{ minWidth: 260 }}><label style={{ display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 6 }}>PROJECT</label><select value={selectedProject?.id || ''} onChange={event => loadScores(projects.find(project => project.id === Number(event.target.value)))} style={{ width: '100%', padding: 11, borderRadius: 9, border: 0, color: '#17213a' }}><option value="">Select a GitHub-linked project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}><button className="t-btn-primary" onClick={analyze} disabled={!selectedProject || analyzing}><FaSync /> {analyzing ? 'Analyzing GitHub...' : 'Analyze now'}</button>{selectedProject && <button className="t-btn-ghost" onClick={downloadCsv} style={{ color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}><FaDownload /> Export CSV</button>}</div>
      </section>

      {!selectedProject ? <div className="t-card" style={{ padding: 42, textAlign: 'center' }}><FaChartLine style={{ fontSize: 34, color: '#6675ff', marginBottom: 12 }} /><h3 style={{ margin: 0 }}>Select a project to begin</h3><p style={{ color: '#64748b', fontSize: 13 }}>Only projects with a linked GitHub repository can be analyzed.</p></div> : loading ? <div className="t-card" style={{ padding: 42, textAlign: 'center' }}>Loading contribution records...</div> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 22 }}>{statCards.map(card => <div className="t-card" key={card.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 17 }}><div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: `${card.color}18`, color: card.color }}>{card.icon}</div><div><strong style={{ display: 'block', fontSize: 19 }}>{card.value}</strong><span style={{ color: '#64748b', fontSize: 11 }}>{card.label}</span></div></div>)}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}><div style={{ position: 'relative', flex: 1, minWidth: 220 }}><FaSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student or USN" style={{ width: '100%', padding: '10px 12px 10px 34px', border: '1px solid #dbe3ef', borderRadius: 9, boxSizing: 'border-box' }} /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={{ padding: 10, border: '1px solid #dbe3ef', borderRadius: 9 }}><option value="ALL">All statuses</option>{Object.keys(STATUS).map(key => <option key={key}>{key}</option>)}</select><button className="t-btn-ghost" onClick={() => setView(view === 'table' ? 'charts' : 'table')}>{view === 'table' ? <><FaChartBar /> Charts</> : <><FaTable /> Table</>}</button></div>
        {view === 'charts' ? <ContributionCharts scores={filteredScores} /> : <div className="t-card" style={{ overflowX: 'auto', padding: 0 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}><thead><tr style={{ background: '#f8fafc' }}>{['Student', 'Score', 'Commits', 'Lines added', 'Active days', 'Status', 'Marks'].map(label => <th key={label} style={{ padding: 13, textAlign: label === 'Student' ? 'left' : 'center', fontSize: 11, color: '#64748b' }}>{label}</th>)}</tr></thead><tbody>{filteredScores.map(score => { const badge = STATUS[score.status] || STATUS.NOT_CONTRIBUTING; const editing = editingId === score.id; return <React.Fragment key={score.id}><tr style={{ borderTop: '1px solid #eef2f7' }}><td style={{ padding: 13 }}><strong style={{ display: 'block', fontSize: 13 }}>{score.studentName || 'Unknown student'}</strong><span style={{ fontSize: 11, color: '#64748b' }}>{score.studentUsn || 'No USN'}</span></td><td style={{ textAlign: 'center', fontWeight: 800, color: '#6675ff' }}>{number(score.score).toFixed(1)}</td><td style={{ textAlign: 'center' }}>{number(score.totalCommits)}</td><td style={{ textAlign: 'center' }}>{number(score.linesAdded).toLocaleString()}</td><td style={{ textAlign: 'center' }}>{number(score.activeDays)}</td><td style={{ textAlign: 'center' }}><span style={{ color: badge.color, background: badge.bg, padding: '5px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{badge.label}</span></td><td style={{ textAlign: 'center' }}><button className="t-btn-ghost" onClick={() => editing ? saveEdit(score) : startEdit(score)}>{editing ? <><FaSave /> Save</> : 'Edit marks'}</button></td></tr>{editing && <tr><td colSpan="7" style={{ padding: 15, background: '#f8fafc' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>{[['presentationScore','Presentation /25'],['reportScore','Report /25'],['documentationScore','Documentation /25'],['teacherAiPenalty','AI penalty %']].map(([key, label]) => <label key={key} style={{ fontSize: 11, color: '#64748b' }}>{label}<input type="number" value={editForm[key]} onChange={event => setEditForm(form => ({ ...form, [key]: event.target.value }))} style={{ width: '100%', marginTop: 5, padding: 8, boxSizing: 'border-box' }} /></label>)}</div><textarea value={editForm.manualFeedback} onChange={event => setEditForm(form => ({ ...form, manualFeedback: event.target.value }))} placeholder="Manual feedback" style={{ width: '100%', marginTop: 12, padding: 9, boxSizing: 'border-box', minHeight: 55 }} /></td></tr>}</React.Fragment>; })}</tbody></table>{filteredScores.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>No students match the current filters.</div>}</div>}
      </>}
    </TeacherLayout>
  );
}