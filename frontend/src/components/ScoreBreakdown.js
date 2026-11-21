import React from 'react';

export const rubric = [
  ['code', 'Code changes', 35], ['commits', 'Commits', 20],
  ['pull_requests', 'Pull requests', 15], ['reviews', 'Code reviews', 15],
  ['issues', 'Issue resolution', 15],
];

export default function ScoreBreakdown({ contribution }) {
  let parts;
  try { parts = JSON.parse(contribution?.scoreBreakdown || 'null'); } catch { parts = null; }
  if (!parts) return <p>Run the updated analysis to see the score breakdown.</p>;
  return <div className="s-breakdown-grid">{rubric.map(([key, label, max]) => (
    <div className="s-breakdown-factor" key={key}>
      <div className="s-factor-header"><span>{label}</span><strong>{parts[key] ?? 0} / {max}</strong></div>
      <progress aria-label={label} max={max} value={parts[key] ?? 0} style={{ width: '100%', accentColor: '#6675ff' }} />
    </div>
  ))}</div>;
}
