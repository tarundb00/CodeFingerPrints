import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentLayout from './StudentLayout';
import { fetchStudentByUsn } from '../services/api';

jest.mock('../services/api', () => ({
  fetchStudentByUsn: jest.fn(),
}));

describe('StudentLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('hydrates the logged-in student from the backend and shows the latest profile name', async () => {
    localStorage.setItem('student', JSON.stringify({ name: 'Old Name', usn: '1RV21CS001' }));
    fetchStudentByUsn.mockResolvedValue({
      name: 'Alice Kumar',
      usn: '1RV21CS001',
      email: 'alice@example.com',
    });

    render(
      <MemoryRouter>
        <StudentLayout title="Dashboard" subtitle="Welcome back">
          <div>Student content</div>
        </StudentLayout>
      </MemoryRouter>
    );

    expect(screen.getByText('Old Name')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice Kumar')).toBeInTheDocument();
    });

    expect(localStorage.getItem('student')).toContain('Alice Kumar');
  });
});
