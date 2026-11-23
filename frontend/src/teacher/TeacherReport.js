import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import TeacherLayout from './TeacherLayout';
import ContributionCharts from '../components/ContributionCharts';
import {
  fetchProjects,
  fetchContributions,
  fetchTeams,
  fetchStudents,
  fetchBugsByProject,
  fetchMeetingsByProject,
} from '../services/api';
import {
  FaDownload, FaFileAlt, FaSpinner, FaProjectDiagram,
  FaUsers, FaCodeBranch, FaBug, FaCalendarAlt, FaChartBar,
  FaCheckCircle, FaExclamationTriangle, FaTrophy,
} from 'react-icons/fa';

const number = v => Number(v) || 0;

const STATUS_COLORS = {
  ACTIVE: '#2ecc71',
  AT_RISK: '#f39c12',
  INACTIVE: '#e05c5c',
  NOT_CONTRIBUTING: '#94a3b8',
};

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', flex: 1, minWidth: 160,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, color, display: 'grid', placeItems: 'center', fontSize: 18 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function TeacherReport() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const reqRef = useRef(0);
  const chartsRef = useRef(null);

  const loadProjectData = useCallback(async (project) => {
    if (!project) return;
    const id = ++reqRef.current;
    setSelectedProject(project);
    setLoading(true);
    setError('');
    try {
      const [contribs, teamsData, bugsData, meetingsData] = await Promise.allSettled([
        fetchContributions(project.id),
        fetchTeams(),
        fetchBugsByProject(project.id),
        fetchMeetingsByProject(project.id),
      ]);
      if (id !== reqRef.current) return;
      setContributions(contribs.status === 'fulfilled' ? contribs.value || [] : []);
      setTeams(teamsData.status === 'fulfilled' ? teamsData.value || [] : []);
      setBugs(bugsData.status === 'fulfilled' ? bugsData.value || [] : []);
      setMeetings(meetingsData.status === 'fulfilled' ? meetingsData.value || [] : []);
    } catch (err) {
      if (id === reqRef.current) setError(err.message || 'Failed to load data');
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects()
      .then(data => {
        const all = data || [];
        setProjects(all);
        if (all[0]) loadProjectData(all[0]);
        else setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [loadProjectData]);

  const metrics = useMemo(() => ({
    totalStudents: contributions.length,
    active: contributions.filter(c => c.status === 'ACTIVE').length,
    atRisk: contributions.filter(c => c.status === 'AT_RISK').length,
    inactive: contributions.filter(c => c.status === 'INACTIVE' || c.status === 'NOT_CONTRIBUTING').length,
    totalCommits: contributions.reduce((s, c) => s + number(c.totalCommits), 0),
    totalLines: contributions.reduce((s, c) => s + number(c.linesAdded), 0),
    avgScore: contributions.length
      ? (contributions.reduce((s, c) => s + number(c.score), 0) / contributions.length).toFixed(1)
      : '0.0',
    openBugs: bugs.filter(b => b.status === 'OPEN').length,
    resolvedBugs: bugs.filter(b => b.status === 'RESOLVED').length,
    totalBugs: bugs.length,
    totalMeetings: meetings.length,
    teamCount: teams.length,
  }), [contributions, bugs, meetings, teams]);

  const projectTeam = useMemo(
    () => teams.find(t => t.projectId === selectedProject?.id || t.project?.id === selectedProject?.id),
    [teams, selectedProject]
  );

  /* ═══════════════════════════════════════
     PDF GENERATION
  ═══════════════════════════════════════ */
  const generatePDF = useCallback(async () => {
    if (!selectedProject) return;
    setGenerating(true);
    try {
      const chartsCanvas = contributions.length > 0 && chartsRef.current
        ? await html2canvas(chartsRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 1100,
          onclone: clonedDocument => {
            const chartElement = clonedDocument.getElementById('teacher-report-contribution-charts');
            if (chartElement) {
              chartElement.style.opacity = '1';
              chartElement.style.zIndex = '9999';
            }
          },
        })
        : null;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 16;
      let y = 0;

      const checkPage = (need = 12) => {
        if (y + need > pageH - 16) { doc.addPage(); y = 20; }
      };

      // ── PAGE 1: COVER ──
      doc.setFillColor(24, 35, 61);
      doc.rect(0, 0, pageW, pageH, 'F');

      // Gradient overlay
      doc.setFillColor(40, 50, 100);
      doc.rect(0, 0, pageW, 60, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('CodeFingerPrint', margin, 32);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 190, 220);
      doc.text('Complete Project Report', margin, 42);

      // Project box
      doc.setFillColor(40, 55, 110);
      doc.roundedRect(margin, 70, pageW - margin * 2, 55, 6, 6, 'F');
      doc.setTextColor(180, 190, 255);
      doc.setFontSize(10);
      doc.text('PROJECT', margin + 8, 83);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const pNameLines = doc.splitTextToSize(selectedProject.name || 'Untitled Project', pageW - margin * 2 - 16);
      doc.text(pNameLines, margin + 8, 92);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 170, 210);
      if (selectedProject.description) {
        const descLines = doc.splitTextToSize(selectedProject.description, pageW - margin * 2 - 16);
        doc.text(descLines.slice(0, 2), margin + 8, 106);
      }

      // Metrics grid on cover
      const coverMetrics = [
        ['Students', contributions.length],
        ['Active', metrics.active],
        ['Total Commits', metrics.totalCommits],
        ['Avg Score', `${metrics.avgScore}/100`],
        ['Total Bugs', metrics.totalBugs],
        ['Meetings', metrics.totalMeetings],
      ];
      const colCount = 3;
      const boxW = (pageW - margin * 2 - (colCount - 1) * 6) / colCount;
      coverMetrics.forEach((m, i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const bx = margin + col * (boxW + 6);
        const by = 140 + row * 30;
        doc.setFillColor(50, 65, 130);
        doc.roundedRect(bx, by, boxW, 24, 4, 4, 'F');
        doc.setTextColor(180, 200, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(String(m[0]), bx + boxW / 2, by + 8, { align: 'center' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(m[1]), bx + boxW / 2, by + 18, { align: 'center' });
      });

      // GitHub info
      if (selectedProject.githubRepoName) {
        doc.setTextColor(130, 160, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`GitHub: ${selectedProject.githubRepoName}`, margin, 215);
      }

      // Generated date
      doc.setTextColor(100, 110, 150);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageH - 20);
      doc.text('Confidential — Teacher use only', pageW - margin, pageH - 20, { align: 'right' });

      // ── PAGE 2: PROJECT OVERVIEW ──
      doc.addPage();
      y = margin;

      const sectionHeader = (title, color = [102, 117, 255]) => {
        checkPage(16);
        doc.setFillColor(...color);
        doc.rect(margin, y, pageW - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 4, y + 7);
        y += 15;
        doc.setTextColor(30, 30, 50);
      };

      const field = (label, value, indent = 0) => {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 90, 120);
        doc.text(label + ':', margin + indent, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 50);
        const valLines = doc.splitTextToSize(String(value || '—'), pageW - margin * 2 - 50);
        doc.text(valLines, margin + indent + 42, y);
        y += Math.max(7, valLines.length * 5.5);
      };

      sectionHeader('PROJECT OVERVIEW');
      field('Project Name', selectedProject.name);
      field('Description', selectedProject.description || '—');
      field('GitHub Repo', selectedProject.githubRepoName || 'Not linked');
      field('Status', selectedProject.status || '—');
      field('Start Date', selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : '—');
      field('End Date', selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : '—');
      if (projectTeam) {
        y += 4;
        field('Team Name', projectTeam.name);
        field('Team Size', `${projectTeam.members?.length || 0} members`);
      }

      // ── CONTRIBUTION SUMMARY TABLE ──
      y += 6;
      sectionHeader('CONTRIBUTION SUMMARY');

      if (contributions.length > 0) {
        const sorted = [...contributions].sort((a, b) => number(b.score) - number(a.score));
        autoTable(doc, {
          startY: y,
          head: [['Rank', 'Student Name', 'USN', 'Score', 'Commits', 'Lines Added', 'Active Days', 'Status']],
          body: sorted.map((c, i) => [
            i + 1,
            c.studentName || '—',
            c.studentUsn || '—',
            `${number(c.score).toFixed(1)}/100`,
            number(c.totalCommits),
            number(c.linesAdded).toLocaleString(),
            number(c.activeDays),
            c.status || 'UNKNOWN',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [102, 117, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [245, 246, 255] },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'center' },
            7: {
              halign: 'center',
              fontStyle: 'bold',
            },
          },
          willDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 7) {
              const colorMap = { ACTIVE: [46, 204, 113], AT_RISK: [243, 156, 18], INACTIVE: [224, 92, 92], NOT_CONTRIBUTING: [148, 163, 184] };
              data.cell.styles.textColor = colorMap[data.cell.text[0]] || [100, 100, 100];
            }
          },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
      } else {
        checkPage(10);
        doc.setTextColor(100, 100, 120);
        doc.setFontSize(9);
        doc.text('No contribution data available.', margin, y);
        y += 12;
      }

      // ── CONTRIBUTION CHARTS ──
      doc.addPage();
      y = margin;
      sectionHeader('CONTRIBUTION CHARTS', [52, 152, 219]);

      if (chartsCanvas) {
        const chartImage = chartsCanvas.toDataURL('image/png');
        const availableWidth = pageW - margin * 2;
        const availableHeight = pageH - y - margin - 16;
        const scale = Math.min(
          availableWidth / chartsCanvas.width,
          availableHeight / chartsCanvas.height
        );
        const imageWidth = chartsCanvas.width * scale;
        const imageHeight = chartsCanvas.height * scale;
        doc.addImage(chartImage, 'PNG', (pageW - imageWidth) / 2, y, imageWidth, imageHeight);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 120);
        doc.text('No contribution data is available to chart.', margin, y);
        y += 12;
      }

      doc.addPage();
      y = margin;
      sectionHeader('INDIVIDUAL STUDENT ANALYSIS', [80, 50, 160]);

      const sorted = [...contributions].sort((a, b) => number(b.score) - number(a.score));
      sorted.forEach((c, idx) => {
        checkPage(60);
        // Student header
        doc.setFillColor(240, 242, 255);
        doc.rect(margin, y - 2, pageW - margin * 2, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 120);
        doc.text(`${idx + 1}. ${c.studentName || '—'}  (${c.studentUsn || '—'})`, margin + 2, y + 5);
        const statusColor = STATUS_COLORS[c.status] || '#94a3b8';
        const hexToRgb = hex => { const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return [r, g, b]; };
        doc.setTextColor(...hexToRgb(statusColor));
        doc.text(`● ${c.status || 'UNKNOWN'}`, pageW - margin - 30, y + 5);
        y += 14;

        // Stats row
        const stats = [
          ['Score', `${number(c.score).toFixed(1)}/100`],
          ['Commits', number(c.totalCommits)],
          ['Lines Added', number(c.linesAdded).toLocaleString()],
          ['Lines Deleted', number(c.linesDeleted).toLocaleString()],
          ['Active Days', number(c.activeDays)],
          ['Pull Requests', number(c.pullRequests)],
          ['Issues Closed', number(c.issuesClosed)],
        ];
        const statW = (pageW - margin * 2) / stats.length;
        stats.forEach((s, si) => {
          const sx = margin + si * statW;
          doc.setFillColor(250, 251, 255);
          doc.rect(sx, y, statW - 1, 16, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(40, 40, 100);
          doc.text(String(s[1]), sx + statW / 2, y + 7, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 110, 140);
          doc.text(s[0], sx + statW / 2, y + 13, { align: 'center' });
        });
        y += 20;

        if (c.lastCommitDate) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 110, 140);
          doc.text(`Last commit: ${new Date(c.lastCommitDate).toLocaleDateString()}  |  Analyzed: ${c.lastAnalyzedAt ? new Date(c.lastAnalyzedAt).toLocaleDateString() : '—'}`, margin, y);
          y += 7;
        }

        // Manual grades if available
        if (c.presentationScore != null || c.reportScore != null || c.documentationScore != null) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 70);
          doc.text('Manual Grades:', margin, y);
          doc.setFont('helvetica', 'normal');
          const grades = [];
          if (c.presentationScore != null) grades.push(`Presentation: ${c.presentationScore}/25`);
          if (c.reportScore != null) grades.push(`Report: ${c.reportScore}/25`);
          if (c.documentationScore != null) grades.push(`Documentation: ${c.documentationScore}/25`);
          if (c.teacherAiPenalty) grades.push(`AI Penalty: ${c.teacherAiPenalty}%`);
          doc.text(grades.join('   '), margin + 32, y);
          y += 7;
        }

        if (c.manualFeedback) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(90, 90, 110);
          const fb = doc.splitTextToSize(`Feedback: "${c.manualFeedback}"`, pageW - margin * 2 - 4);
          doc.text(fb, margin, y);
          y += fb.length * 5 + 2;
        }

        y += 6;
        // Separator
        doc.setDrawColor(220, 225, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      });

      // ── BUG TRACKER SECTION ──
      checkPage(20);
      sectionHeader('BUG TRACKER REPORT', [224, 92, 92]);

      if (bugs.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['#', 'Title', 'Severity', 'Type', 'Status', 'Reported By', 'Date']],
          body: bugs.map((b, i) => [
            i + 1,
            (b.title || '—').substring(0, 30),
            b.severity || '—',
            b.type || '—',
            (b.status || '—').replace('_', ' '),
            b.reportedByName || b.reportedByUsn || '—',
            b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [224, 92, 92], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [255, 248, 248] },
          columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center' }, 4: { halign: 'center' } },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;

        // Bug summary
        checkPage(14);
        const bSummary = [
          ['Open', bugs.filter(b => b.status === 'OPEN').length, '#e05c5c'],
          ['In Progress', bugs.filter(b => b.status === 'IN_PROGRESS').length, '#f39c12'],
          ['Resolved', bugs.filter(b => b.status === 'RESOLVED').length, '#2ecc71'],
          ['Closed', bugs.filter(b => b.status === 'CLOSED').length, '#94a3b8'],
        ];
        const bW = (pageW - margin * 2) / bSummary.length;
        bSummary.forEach(([label, count, hex], i) => {
          const bx = margin + i * bW;
          doc.setFillColor(240, 242, 255);
          doc.rect(bx, y, bW - 2, 14, 'F');
          const rgb = [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...rgb);
          doc.text(String(count), bx + bW / 2, y + 7, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(90, 100, 130);
          doc.text(label, bx + bW / 2, y + 12, { align: 'center' });
        });
        y += 20;
      } else {
        doc.setTextColor(100, 100, 120);
        doc.setFontSize(9);
        doc.text('No bugs reported for this project.', margin, y);
        y += 12;
      }

      // ── MEETINGS / DISCUSSION LOGS ──
      if (meetings.length > 0) {
        checkPage(20);
        sectionHeader('MEETINGS & DISCUSSION LOGS', [26, 188, 156]);

        autoTable(doc, {
          startY: y,
          head: [['#', 'Title', 'Date', 'Attendees', 'Notes']],
          body: meetings.map((m, i) => [
            i + 1,
            (m.title || m.agenda || '—').substring(0, 25),
            m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : '—',
            m.attendeeCount || m.attendees?.length || '—',
            (m.notes || m.summary || '—').substring(0, 40),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [26, 188, 156], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [240, 255, 252] },
          columnStyles: { 0: { halign: 'center', cellWidth: 10 } },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── CONTRIBUTION STATISTICS ──
      checkPage(30);
      sectionHeader('CONTRIBUTION STATISTICS & ANALYTICS', [52, 152, 219]);

      if (contributions.length > 0) {
        // Score distribution
        const ranges = [
          { label: '90-100 (Excellent)', min: 90, max: 100 },
          { label: '75-89 (Good)', min: 75, max: 90 },
          { label: '50-74 (Average)', min: 50, max: 75 },
          { label: '25-49 (Below avg)', min: 25, max: 50 },
          { label: '0-24 (Poor)', min: 0, max: 25 },
        ];
        const dist = ranges.map(r => ({
          ...r,
          count: contributions.filter(c => number(c.score) >= r.min && number(c.score) < r.max).length,
        }));

        checkPage(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(50, 60, 100);
        doc.text('Score Distribution', margin, y);
        y += 6;

        dist.forEach(r => {
          checkPage(8);
          const barW = pageW - margin * 2 - 80;
          const fillW = contributions.length ? (r.count / contributions.length) * barW : 0;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(70, 80, 110);
          doc.text(r.label, margin, y);
          doc.setFillColor(230, 232, 245);
          doc.rect(margin + 50, y - 4, barW, 6, 'F');
          doc.setFillColor(102, 117, 255);
          if (fillW > 0) doc.rect(margin + 50, y - 4, fillW, 6, 'F');
          doc.setTextColor(50, 60, 100);
          doc.text(`${r.count}`, margin + 50 + barW + 4, y);
          y += 8;
        });

        y += 4;

        // Commit frequency table
        const topContributors = [...contributions]
          .sort((a, b) => number(b.totalCommits) - number(a.totalCommits))
          .slice(0, 10);

        autoTable(doc, {
          startY: y,
          head: [['Rank', 'Student', 'USN', 'Commits', 'Lines Added', 'Lines Deleted', 'Active Days', 'Score']],
          body: topContributors.map((c, i) => [
            i + 1,
            c.studentName || '—',
            c.studentUsn || '—',
            number(c.totalCommits),
            number(c.linesAdded).toLocaleString(),
            number(c.linesDeleted).toLocaleString(),
            number(c.activeDays),
            `${number(c.score).toFixed(1)}/100`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'center' },
            7: { halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── FOOTER ON EVERY PAGE ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(40, 50, 100);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setTextColor(180, 190, 220);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`CodeFingerPrint — ${selectedProject.name} — Page ${i} of ${pageCount}`, pageW / 2, pageH - 4, { align: 'center' });
      }

      const filename = `${(selectedProject.name || 'project').replace(/[^a-z0-9]+/gi, '_')}_complete_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      setError('PDF generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }, [selectedProject, contributions, bugs, meetings, teams, metrics]);

  return (
    <TeacherLayout title="Project Report" subtitle="Generate a complete downloadable PDF report for any project">

      {/* Header banner */}
      <section style={{ background: 'linear-gradient(135deg,#18233d,#293b68)', borderRadius: 16, padding: 24, color: '#fff', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Teacher workspace</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800 }}>Complete Project Report</h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: 13 }}>
              Select a project to preview its metrics and download a comprehensive PDF report.
            </p>
          </div>
          <div style={{ minWidth: 260 }}>
            <label style={{ display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 6 }}>PROJECT</label>
            <select
              value={selectedProject?.id || ''}
              onChange={e => {
                const p = projects.find(p => p.id === Number(e.target.value));
                if (p) loadProjectData(p);
              }}
              style={{ width: '100%', padding: 11, borderRadius: 9, border: 0, color: '#17213a', fontSize: 13 }}
            >
              <option value="">Select a project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={generatePDF}
            disabled={!selectedProject || loading || generating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 24px', borderRadius: 10,
              background: generating ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#6675ff,#8c4fff)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              opacity: (!selectedProject || loading || generating) ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {generating ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF...</> : <><FaDownload /> Download PDF Report</>}
          </button>
        </div>
      </section>

      {error && (
        <div style={{ padding: '12px 18px', borderRadius: 10, background: '#fee2e2', color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {!selectedProject ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <FaFileAlt style={{ fontSize: 42, color: '#6675ff', marginBottom: 14 }} />
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Select a Project</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Choose a project above to preview its data and generate a PDF report.</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16 }}>
          <FaSpinner style={{ fontSize: 28, color: '#6675ff', animation: 'spin 1s linear infinite', marginBottom: 10 }} />
          <div style={{ color: '#64748b', fontSize: 13 }}>Loading project data...</div>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            <StatCard icon={<FaUsers />}       label="Total Students"  value={metrics.totalStudents}  color="#6675ff" />
            <StatCard icon={<FaCheckCircle />}  label="Active"          value={metrics.active}          color="#2ecc71" />
            <StatCard icon={<FaExclamationTriangle />} label="At Risk"  value={metrics.atRisk}          color="#f39c12" />
            <StatCard icon={<FaCodeBranch />}   label="Total Commits"   value={metrics.totalCommits}    color="#8c4fff" />
            <StatCard icon={<FaTrophy />}       label="Avg Score"       value={`${metrics.avgScore}/100`} color="#e67e22" />
            <StatCard icon={<FaBug />}          label="Total Bugs"      value={metrics.totalBugs}       color="#e05c5c" />
            <StatCard icon={<FaCalendarAlt />}  label="Meetings"        value={metrics.totalMeetings}   color="#1abc9c" />
            <StatCard icon={<FaChartBar />}     label="Lines Added"     value={metrics.totalLines.toLocaleString()} color="#3498db" />
          </div>

          {/* Contributions preview table */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 22, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FaChartBar style={{ color: '#6675ff' }} />
              <strong style={{ fontSize: 15, color: '#1e293b' }}>Student Contributions — {selectedProject.name}</strong>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{contributions.length} students</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Student', 'USN', 'Score', 'Commits', 'Lines Added', 'Lines Deleted', 'Active Days', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Student' || h === 'USN' ? 'left' : 'center', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '1px solid #eef2f7' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...contributions].sort((a, b) => number(b.score) - number(a.score)).map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #eef2f7' }}>
                      <td style={{ padding: '11px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>{c.studentName || '—'}</strong>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{c.studentUsn || '—'}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 800, color: '#6675ff', fontSize: 14 }}>{number(c.score).toFixed(1)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>{number(c.totalCommits)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', color: '#2ecc71', fontWeight: 600 }}>+{number(c.linesAdded).toLocaleString()}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center', color: '#e05c5c', fontWeight: 600 }}>-{number(c.linesDeleted).toLocaleString()}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>{number(c.activeDays)}</td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: `${STATUS_COLORS[c.status] || '#94a3b8'}18`,
                          color: STATUS_COLORS[c.status] || '#94a3b8',
                        }}>
                          {c.status || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {contributions.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No contribution data yet. Run analysis first.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bug summary */}
          {bugs.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 22, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaBug style={{ color: '#e05c5c' }} />
                <strong style={{ fontSize: 15, color: '#1e293b' }}>Bug Tracker Summary</strong>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{bugs.length} total</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: 16, gap: 12 }}>
                {[
                  { label: 'Open', count: bugs.filter(b => b.status === 'OPEN').length, color: '#e05c5c' },
                  { label: 'In Progress', count: bugs.filter(b => b.status === 'IN_PROGRESS').length, color: '#f39c12' },
                  { label: 'Resolved', count: bugs.filter(b => b.status === 'RESOLVED').length, color: '#2ecc71' },
                  { label: 'Closed', count: bugs.filter(b => b.status === 'CLOSED').length, color: '#94a3b8' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '14px 10px', borderRadius: 10, background: `${s.color}10` }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download call-to-action */}
          <div style={{
            background: 'linear-gradient(135deg,#6675ff15,#8c4fff15)',
            border: '1px solid rgba(102,117,255,0.2)',
            borderRadius: 16, padding: '24px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1e293b' }}>📄 Ready to generate your report?</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                The PDF includes project overview, student analysis, the contribution charts, bug tracker, and meetings.
              </p>
            </div>
            <button
              onClick={generatePDF}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '12px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg,#6675ff,#8c4fff)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><FaDownload /> Download PDF</>}
            </button>
          </div>
        </>
      )}

      <div
        id="teacher-report-contribution-charts"
        ref={chartsRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 1000,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <ContributionCharts scores={contributions} animated={false} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </TeacherLayout>
  );
}

