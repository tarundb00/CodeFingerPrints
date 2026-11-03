import jsPDF from 'jspdf';

/**
 * Generate a PDF contribution report for a project.
 * @param {string} projectName - Name of the project
 * @param {Array} scores - Array of contribution score objects
 * @param {Array} bugAlerts - Array of bug alert strings
 * @param {Array} aiAlerts - Array of AI detection alert strings
 */
export async function generatePDF(projectName, scores, bugAlerts = [], aiAlerts = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = margin;

  // ── HEADER ──
  doc.setFillColor(40, 44, 80);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CodeFingerPrint', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Contribution Analysis Report', margin, 22);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
  y = 46;

  // ── PROJECT NAME ──
  doc.setTextColor(40, 44, 80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Project: ${projectName}`, margin, y);
  y += 8;

  doc.setDrawColor(102, 117, 255);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── SUMMARY ──
  const total = scores.length;
  const active = scores.filter(s => s.status === 'ACTIVE').length;
  const atRisk = scores.filter(s => s.status === 'AT_RISK').length;
  const inactive = scores.filter(s => s.status === 'INACTIVE' || s.status === 'NOT_CONTRIBUTING').length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Total Students: ${total}   |   Active: ${active}   |   At Risk: ${atRisk}   |   Inactive: ${inactive}`, margin, y);
  y += 10;

  // ── TABLE HEADER ──
  const cols = ['Student', 'USN', 'Commits', 'Score', 'Status'];
  const colW = [50, 40, 25, 25, 35];
  let x = margin;

  doc.setFillColor(102, 117, 255);
  doc.rect(margin, y - 5, pageW - margin * 2, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  cols.forEach((col, i) => {
    doc.text(col, x + 1, y);
    x += colW[i];
  });
  y += 7;

  // ── TABLE ROWS ──
  const sorted = [...scores].sort((a, b) => (b.score || 0) - (a.score || 0));
  sorted.forEach((s, idx) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(245, 246, 255);
      doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F');
    }

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    x = margin;
    const statusColor = s.status === 'ACTIVE' ? [46, 204, 113] : s.status === 'AT_RISK' ? [243, 156, 18] : [224, 92, 92];
    const row = [
      (s.studentName || '—').substring(0, 22),
      (s.studentUsn || '—').substring(0, 16),
      String(s.totalCommits || 0),
      `${Math.round(s.score || 0)}/100`,
      s.status || 'UNKNOWN',
    ];
    row.forEach((val, i) => {
      if (i === 4) {
        doc.setTextColor(...statusColor);
      } else {
        doc.setTextColor(30, 30, 30);
      }
      doc.text(String(val), x + 1, y);
      x += colW[i];
    });
    y += 7;
  });

  y += 6;

  // ── FOOTER ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CodeFingerPrint - Page ${i} of ${pageCount}`, pageW / 2, 290, { align: 'center' });
  }

  const filename = `${projectName.replace(/\s+/g, '_')}_contribution_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
