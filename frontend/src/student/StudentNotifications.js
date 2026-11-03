import React from 'react';
import StudentLayout from './StudentLayout';
import NotificationsPage from '../components/NotificationsPage';

export default function StudentNotifications() {
  const student = JSON.parse(localStorage.getItem('student') || '{}');
  return <StudentLayout title="Notifications" subtitle="Your contribution and project updates"><NotificationsPage recipientKey={student.usn} /></StudentLayout>;
}