import React, { useEffect, useState } from 'react';
import { fetchRepositoryReport } from '../services/api';
import { downloadStudentReport } from '../utils/studentReport';
import './RepositoryEvidence.css';

const tabs = ['Activity', 'Code ownership', 'Pull requests', 'Issues', 'Bug fixes', 'Code quality'];
const day = value => value?.slice(0, 10) || '—';

function Table({ title, columns, rows }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(rows.length / 12);
  const current = Math.max(0, Math.min(page, pages - 1));
  return <section><h3>{title} <small>({rows.length})</small></h3>
    {rows.length === 0 ? <p>None recorded.</p> : <div className="evidence-table-wrap"><table aria-label={title}>
      <thead><tr>{columns.map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.slice(current * 12, current * 12 + 12).map((cells, i) =>
        <tr key={i}>{cells.map((value, k) => <td key={k}>{value ?? '—'}</td>)}</tr>)}</tbody>
    </table></div>}
    {pages > 1 && <div className="evidence-pagination">
      <button disabled={!current} onClick={() => setPage(current - 1)}>Previous</button>
      <span>Page {current + 1} of {pages}</span>
      <button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next</button>
    </div>}
  </section>;
}

function Metrics({ values }) {
  return <dl className="evidence-metrics">{values.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>;
}

function Calendar({ row, report }) {
  const end = day(report.analyzed_at);
  const [month, setMonth] = useState(end.slice(0, 7));
  const first = new Date(month + '-01T00:00:00Z');
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return <section><h3>Contribution calendar</h3>
    <input type="month" aria-label="Calendar month" value={month} min={report.period_start.slice(0, 7)}
      max={end.slice(0, 7)} onChange={e => { if (e.target.value && e.target.validity.valid) setMonth(e.target.value); }} />
    <div className="evidence-calendar">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => <span key={w}>{w}</span>)}
      {Array.from({length: (first.getUTCDay() + 6) % 7}, (_, i) => <span key={'pad' + i} />)}
      {Array.from({length}, (_, i) => {
        const date = month + '-' + String(i + 1).padStart(2, '0');
        const count = row.daily[date] || 0;
        const inRange = date >= report.period_start && date <= end;
        const label = date + (inRange ? ' · ' + count + ' events · ' + (row.daily_commits?.[date] || 0) + ' commits' : ' · outside reporting period');
        return <span key={date} title={label} aria-label={label} data-level={inRange ? Math.min(3, count) : undefined}>{i + 1}</span>;
      })}
    </div>
    <Table title="Weekly activity" columns={['Week starting (UTC)', 'Events', 'Commits']}
      rows={Object.entries(row.weekly).sort(([a], [b]) => b.localeCompare(a)).map(([week, count]) => [week, count, row.weekly_commits?.[week] || 0])} />
  </section>;
}

export default function RepositoryEvidence({ project, scores = [], usn, revision }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState('');
  const [tab, setTab] = useState('Activity');
  const id = project?.id;
  useEffect(() => {
    let current = true;
    setError(''); setLoading(true); setReport(null);
    if (id) fetchRepositoryReport(id, usn).then(value => { if (current) setReport(value); })
      .catch(err => { if (current) setError(err.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, usn, revision]);
  if (!id) return null;
  if (!report?.contributors?.length) return <section className="repo-evidence"><h2>Repository evidence</h2>
    <p role="status">{loading ? 'Loading report…' : error || 'Run a project analysis to generate the contribution report.'}</p></section>;
  const key = entry => entry.usn ? 'student/' + entry.usn : 'git/' + entry.author;
  const row = report.contributors.find(entry => key(entry) === selection) || report.contributors.find(entry => entry.usn) || report.contributors[0];
  const display = entry => scores.find(s => s.studentUsn && s.studentUsn === entry.usn)?.studentName || entry.author;
  const base = 'https://github.com/' + encodeURIComponent(report.owner) + '/' + encodeURIComponent(report.repo);
  const link = (type, target, label) => <a href={base + '/' + type + '/' + encodeURIComponent(target)} target="_blank" rel="noreferrer">{label}</a>;
  const quality = report.quality || [];
  return <section className="repo-evidence">
    <header><div><h2>Repository evidence</h2><small>{report.owner}/{report.repo} · {report.branch} · Analyzed {day(report.analyzed_at)} UTC</small></div>
      <div className="evidence-controls">{!usn && <label>Contributor{' '}
        <select value={key(row)} onChange={e => setSelection(e.target.value)}>
          {report.contributors.map(r => <option value={key(r)} key={key(r)}>{display(r)}{r.usn ? ' · ' + r.usn : ' · outside roster'}</option>)}
        </select></label>}
        <button onClick={() => downloadStudentReport(project, report, row, display(row))}>{row.usn ? 'Download student PDF' : 'Download contributor PDF'}</button>
      </div>
    </header>
    <Metrics values={[[ 'Contribution score', row.score + ' / 100'], ['Share of repository line changes', row.code_share + '%'],
      ['Lines added / deleted', '+' + row.additions + ' / −' + row.deletions], ['Files touched / created', row.files_modified.length + ' / ' + row.files_created.length],
      ['Last contribution', day(row.last_activity)]]} />
    <nav aria-label="Repository metrics" className="evidence-tabs">{tabs.map(t =>
      <button key={t} aria-pressed={t === tab} onClick={() => setTab(t)}>{t}</button>)}</nav>
    <div key={key(row) + tab}>
      {tab === 'Activity' && <>
        <Metrics values={[[ 'Commits', row.commits], ['Active days', row.active_days], ['Inactive days', row.inactive_days],
          ['Reporting period (UTC)', report.period_start + ' – ' + day(report.analyzed_at)]]} />
        <Calendar row={row} report={report} />
        <Table title="Commit history" columns={['Date (UTC)', 'Commit', 'Message', 'Added / deleted']}
          rows={row.commit_history.map(c => [day(c.date), link('commit', c.sha, c.sha.slice(0, 8)), c.title, '+' + c.additions + ' / −' + c.deletions])} />
      </>}
      {tab === 'Code ownership' && <>
        {!usn && <Table title="Contributors by line changes" columns={['Contributor', 'Added', 'Deleted', 'Repository share']}
          rows={[...report.contributors].sort((a, b) => b.code_share - a.code_share).map(r => [display(r), r.additions, r.deletions, r.code_share + '%'])} />}
        <Table title="Current line ownership" columns={['File', 'Symbol', 'Range', 'Owned lines', 'Share', 'Primary owner']}
          rows={row.ownership.map(o => [o.path, o.kind === 'file' ? 'Whole file' : o.kind + ' ' + o.name, o.start + '–' + o.end, o.lines, o.share + '%', o.primary ? 'Yes' : ''])} />
        <Table title="Files touched" columns={['Path', 'Created by contributor']} rows={row.files_modified.map(p => [p, row.files_created.includes(p) ? 'Yes' : ''])} />
      </>}
      {tab === 'Pull requests' && <>
        <Metrics values={[[ 'Created', row.pull_requests], ['Merged', row.merged], ['Closed unmerged', row.rejected], ['Reviews submitted', row.reviews], ['Approvals', row.approvals]]} />
        <Table title="Authored pull requests" columns={['PR', 'Title', 'Opened', 'Outcome', 'Submitted through', 'Reviewers and decisions']}
          rows={row.pr_history.map(p => [link('pull', p.number, '#' + p.number), p.title, day(p.date), p.state, p.github_author ? 'Student portal · ' + p.github_author : 'GitHub',
            p.reviews.map(r => (r.author || 'Deleted account') + ' · ' + r.state).join(', ') || '—'])} />
        <Table title="Submitted reviews" columns={['PR', 'Title', 'Date', 'Decision']}
          rows={row.review_history.map(r => [link('pull', r.number, '#' + r.number), r.title, day(r.date), r.state])} />
      </>}
      {tab === 'Issues' && <>
        <Metrics values={[[ 'Created', row.issues_created], ['Resolved', row.issues_closed], ['Assigned', row.assigned_issues],
          ['Bugs resolved', row.bugs_resolved], ['Mean bug resolution', row.mean_bug_resolution_hours == null ? '—' : row.mean_bug_resolution_hours + ' h'], ['Mean resolution', row.mean_resolution_hours == null ? '—' : row.mean_resolution_hours + ' h']]} />
        <Table title="Issue history and assignments" columns={['Issue', 'Title', 'Opened by', 'Assigned to', 'State', 'Closed by', 'Resolution (h)']}
          rows={row.issue_history.map(i => [link('issues', i.number, '#' + i.number), i.title, i.author, i.assignees.join(', '), i.reason || i.state, i.closer, i.resolution_hours])} />
      </>}
      {tab === 'Bug fixes' && <>
        <p>Fix messages identify candidate fixes. Parent-revision blame identifies commits that last changed the removed lines.</p>
        <Metrics values={[[ 'Candidate fixes by contributor', row.bug_events.filter(e => e.fixer === row.author).length],
          ['Candidate introductions', row.bug_risk], ['Bug issues resolved', row.bugs_resolved]]} />
        <Table title="Fix evidence" columns={['Fix', 'Fixer', 'Message', 'Candidate introducing commit and lines', 'Age at fix']}
          rows={row.bug_events.flatMap(e => (e.candidates.length ? e.candidates : [null]).map(c => [
            link('commit', e.sha, e.sha.slice(0, 8)), e.fixer, e.title,
            c ? <>{link('commit', c.sha, c.sha.slice(0, 8))} · {c.author} · {c.path} · lines {c.lines.join(', ')}</> : 'No attributable removed lines',
            c?.age_hours == null ? '—' : c.age_hours + ' h']))} />
      </>}
      {tab === 'Code quality' && <>
        <p>{usn ? 'Files you contributed to' : 'Repository files'} on {report.branch}. Symbol and maintainability analysis covers Python, Java, JavaScript and TypeScript.</p>
        <Table title="Maintainability by file" columns={['File', 'Estimated index / 100', 'Findings']} rows={quality.filter(q => q.parsed != null).map(q => [q.path, q.maintainability, q.findings.length])} />
        <Table title="Quality findings" columns={['File', 'Line', 'Finding', 'Evidence']}
          rows={quality.flatMap(q => q.findings.map(f => [q.path, f.line, f.kind, f.detail]))} />
      </>}
    </div></section>;
}
