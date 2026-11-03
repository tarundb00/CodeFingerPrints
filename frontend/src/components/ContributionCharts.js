import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const COLORS = ['#6675ff', '#8c4fff', '#2ecc71', '#f39c12', '#e05c5c', '#1abc9c', '#e74c3c', '#9b59b6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        padding: '10px 14px',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      }}>
        {label && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || 'var(--text-primary)', fontSize: 13, margin: '2px 0' }}>
            {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ContributionCharts({ scores }) {
  if (!scores || scores.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, opacity: 0.5, color: 'var(--text-muted)' }}>No data to display charts.</div>;
  }

  const pieData = scores.map(s => ({
    name: s.studentName || s.studentUsn || 'Unknown',
    value: Math.round(s.score || 0),
  }));

  const barData = scores.map(s => ({
    name: (s.studentName || s.studentUsn || '?').split(' ')[0],
    Additions: s.linesAdded || 0,
    Deletions: s.linesDeleted || 0,
  }));

  const radarData = [
    { metric: 'Score', ...Object.fromEntries(scores.map(s => [s.studentName?.split(' ')[0] || s.studentUsn, Math.round(s.score || 0)])) },
    { metric: 'Commits', ...Object.fromEntries(scores.map(s => [s.studentName?.split(' ')[0] || s.studentUsn, Math.min(s.totalCommits || 0, 100)])) },
    { metric: 'Active Days', ...Object.fromEntries(scores.map(s => [s.studentName?.split(' ')[0] || s.studentUsn, Math.min((s.activeDays || 0) * 5, 100)])) },
    { metric: 'Lines Added', ...Object.fromEntries(scores.map(s => [s.studentName?.split(' ')[0] || s.studentUsn, Math.min((s.linesAdded || 0) / 10, 100)])) },
  ];

  const chartCard = {
    background: 'var(--bg-card)',
    borderRadius: 16,
    padding: '20px 16px',
    border: '1px solid var(--border-color)',
    marginBottom: 20,
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  };
  const chartTitle = { fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Pie — Contribution Share */}
        <div style={chartCard}>
          <div style={chartTitle}>🥧 Contribution Share (by Score)</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar — Lines of Code */}
        <div style={chartCard}>
          <div style={chartTitle}>📊 Lines of Code per Student</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="Additions" fill="#2ecc71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Deletions" fill="#e05c5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar — Multi-metric */}
        <div style={chartCard}>
          <div style={chartTitle}>🕷️ Multi-Metric Comparison</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
              {scores.slice(0, 5).map((s, i) => (
                <Radar
                  key={i}
                  name={s.studentName?.split(' ')[0] || s.studentUsn}
                  dataKey={s.studentName?.split(' ')[0] || s.studentUsn}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.15}
                />
              ))}
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Leaderboard Bar */}
        <div style={chartCard}>
          <div style={chartTitle}>🏆 Score Ranking</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              layout="vertical"
              data={scores.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map(s => ({ name: s.studentName?.split(' ')[0] || s.studentUsn, Score: Math.round(s.score || 0) }))}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Score" radius={[0, 6, 6, 0]}>
                {scores.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
