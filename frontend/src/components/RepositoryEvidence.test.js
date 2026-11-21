import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RepositoryEvidence from './RepositoryEvidence';
import { studentReport } from '../utils/studentReport';
import { fetchRepositoryReport } from '../services/api';

jest.mock('../services/api', () => ({ fetchRepositoryReport: jest.fn() }));

const student = {
  author: 'sam', usn: 'S1', score: 27.5, code_share: 10, commits: 1, additions: 20, deletions: 1,
  files_modified: ['a.py'], files_created: ['a.py'], active_days: 1, inactive_days: 1,
  daily: {'2026-07-02': 3}, weekly: {'2026-06-29': 3}, last_activity: '2026-07-02T12:00:00Z',
  score_parts: { code: 2, commits: 3, pull_requests: 7.5, reviews: 15, issues: 0 },
  commit_history: [{sha: 'abc12345', date: '2026-07-02', title: 'Add billing', additions: 20, deletions: 1}],
  pr_history: [{number: 2, title: 'Billing PR', state: 'merged', date: '2026-07-02',
    reviews: [{author: 'reviewer', state: 'APPROVED'}]}], review_history: [], issue_history: [],
  bugs_resolved: 0, bug_events: [], ownership: [{path: 'a.py', name: 'total', kind: 'function', start: 1, end: 4, lines: 4, share: 100}],
};
const report = { owner: 'class', repo: 'demo', branch: 'main', period_start: '2026-07-01',
  analyzed_at: '2026-07-02T12:00:00Z', contributors: [student], quality: [] };
const project = {id: 1, name: 'Assignment'};

it('opens a student report, calendar and linked PR review from saved evidence', async () => {
  fetchRepositoryReport.mockResolvedValue(report);
  render(<RepositoryEvidence project={project} usn="S1" />);
  expect(await screen.findByRole('table', {name: 'Commit history'})).toBeInTheDocument();
  expect(fetchRepositoryReport).toHaveBeenCalledWith(1, 'S1');
  expect(screen.getByLabelText(/2026-07-02 · 3 events/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Pull requests'}));
  const prs = screen.getByRole('table', {name: 'Authored pull requests'});
  expect(within(prs).getByText('reviewer · APPROVED')).toBeInTheDocument();
  expect(within(prs).getByRole('link')).toHaveAttribute('href', 'https://github.com/class/demo/pull/2');
});

it('exports the full commit history, PRs, ownership, timeline and score across PDF pages', () => {
  const many = Array.from({length: 90}, (_, i) => ({...student.commit_history[0], title: 'Change number ' + i}));
  const pdf = studentReport(project, report, {...student, commit_history: many}, 'Sam');
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  const output = pdf.output();
  for (const text of ['Change number 89', 'Billing PR', 'a.py', 'Activity timeline', '27.5 / 100', '10% of repository'])
    expect(output).toContain(text);
});
