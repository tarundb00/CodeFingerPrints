import { jsPDF } from 'jspdf';
import { rubric } from '../components/ScoreBreakdown';

export function studentReport(project, report, row, name) {
  const doc = new jsPDF();
  const margin = 18, width = 174, bottom = 278;
  let y = 21;
  function line(value, size = 10, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const height = size * 0.45 + 1;
    for (const text of doc.splitTextToSize(String(value), width)) {
      if (y + height > bottom) { doc.addPage(); y = 20; }
      doc.text(text, margin, y);
      y += height;
    }
  }
  function section(title, values) {
    y += 4;
    if (y > bottom - 15) { doc.addPage(); y = 20; }
    line(title, 13, true);
    if (!values.length) line('No recorded activity.');
    values.forEach(value => line(value));
  }
  line('Student contribution report', 19, true);
  line(name || row.author, 15, true);
  line([row.usn, project.name, report.owner + '/' + report.repo].filter(Boolean).join(' | '));
  line('Ownership branch ' + report.branch + ' | Analyzed ' + report.analyzed_at);
  section('Contribution', [
    'Final automatic contribution score ' + row.score + ' / 100',
    row.code_share + '% of repository line changes (additions plus deletions)',
    row.commits + ' commits | +' + row.additions + ' / -' + row.deletions + ' lines',
    ...rubric.map(([key, label, max]) => label + '  ' + row.score_parts[key] + ' / ' + max),
  ]);
  section('Commit history', row.commit_history.map(c => c.date + '  ' + c.sha.slice(0, 12) + '  ' + c.title + '  (+' + c.additions + ' / -' + c.deletions + ')'));
  section('Pull requests', row.pr_history.map(p => p.date + '  #' + p.number + '  ' + p.title + '  [' + p.state + ']'));
  section('Submitted reviews', row.review_history.map(r => r.date + '  #' + r.number + ' ' + r.title + '  ' + r.state));
  section('Code ownership', row.ownership.map(o => o.kind + '  ' + o.path + (o.kind === 'file' ? '' : '  ' + o.name) + '  lines ' + o.start + '-' + o.end + '  |  ' + o.lines + ' attributed (' + o.share + '%)'));
  section('Activity timeline (UTC)', [
    report.period_start + ' to ' + report.analyzed_at.slice(0, 10) + '  |  ' + row.active_days + ' active days, ' + row.inactive_days + ' inactive days',
    'Last contribution ' + (row.last_activity || 'None'),
    ...Object.entries(row.daily).sort().map(([day, count]) => day + '  ' + count + (count === 1 ? ' event' : ' events')),
  ]);
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i); doc.setFontSize(9); doc.setTextColor(80);
    doc.text('CodeFingerPrint  |  ' + i + ' / ' + doc.getNumberOfPages(), margin, 288);
  }
  return doc;
}

export function downloadStudentReport(project, report, row, name) {
  const file = [project.name, row.usn || row.author, 'contribution'].join('-').replace(/[^a-z0-9_-]+/gi, '-');
  studentReport(project, report, row, name).save(file + '.pdf');
}
