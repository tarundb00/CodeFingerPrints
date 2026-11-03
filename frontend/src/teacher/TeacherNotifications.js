import React from 'react';
import TeacherLayout from './TeacherLayout';
import NotificationsPage from '../components/NotificationsPage';

export default function TeacherNotifications() {
  return <TeacherLayout title="Notifications" subtitle="Contribution, project, and deadline alerts"><NotificationsPage recipientKey="TEACHER" /></TeacherLayout>;
}