import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Login from './pages/Login';
import AddTeacher from './admin/AddTeacher';
import AdminDashboard from './admin/AdminDashboard';
import AdminProfile from './admin/AdminProfile';
import GitHubSettings from './admin/GitHubSettings';
import AdminEmailSettings from './admin/AdminEmailSettings';
import AdminNotifications from './admin/AdminNotifications';
import ResetPassword from './teacher/ResetPassword';
import TeacherDashboard from './teacher/TeacherDashboard';
import TeacherProfile from './teacher/TeacherProfile';
import Projects from './teacher/Projects';
import CreateProject from './teacher/CreateProject';
import ProjectDetail from './teacher/ProjectDetail';
import ProjectAnalyse from './teacher/ProjectAnalyse';
import CreateTeam from './teacher/CreateTeam';
import ContributionDashboard from './teacher/ContributionDashboard';
import GitHubWorkflow from './teacher/GitHubWorkflow';
import NotificationSettings from './teacher/NotificationSettings';
import TeacherNotifications from './teacher/TeacherNotifications';
import Alerts from './teacher/Alerts';
import HodDashboard from './admin/HodDashboard';
import StudentDashboard from './student/StudentDashboard';
import StudentProject from './student/StudentProject';
import StudentTeam from './student/StudentTeam';
import StudentContribution from './student/StudentContribution';
import StudentProfile from './student/StudentProfile';
import StudentGitHub from './student/StudentGitHub';
import StudentNotifications from './student/StudentNotifications';
import GlobalWebSocket from './components/GlobalWebSocket';
import TeacherRegisterRequest from './pages/TeacherRegisterRequest';
import './App.css';

function normalizeUserRoles(roles = []) {
  return (roles || [])
    .map(role => String(role).toUpperCase().replace(/^ROLE_/, '').trim())
    .filter(Boolean);
}

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token || token.startsWith('student-')) return <Navigate to="/login" replace />;
  if (role) {
    const userRoles = normalizeUserRoles(user.roles);
    const expectedRole = role.toUpperCase().replace(/^ROLE_/, '');
    if (userRoles.length > 0 && !userRoles.includes(expectedRole)) return <Navigate to="/login" replace />;
  }
  return children;
}

function StudentRoute({ children }) {
  const token = localStorage.getItem('token') || '';
  let student = null;
  try { student = JSON.parse(localStorage.getItem('student') || 'null'); } catch { student = null; }
  if (token !== `student-${student?.usn || ''}`) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div>
      <GlobalWebSocket />
      <BrowserRouter>
        <Routes>
        <Route path="/"     element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teacher/register-request" element={<TeacherRegisterRequest />} />
        <Route path="/teacher/auth/reset-password" element={<ResetPassword />} />

        {/* ADMIN routes */}
        <Route path="/admin/dashboard"       element={<PrivateRoute role="ADMIN"><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/add-teacher"     element={<PrivateRoute role="ADMIN"><AddTeacher /></PrivateRoute>} />
        <Route path="/admin/profile"         element={<PrivateRoute role="ADMIN"><AdminProfile /></PrivateRoute>} />
        <Route path="/admin/github-settings" element={<PrivateRoute role="ADMIN"><GitHubSettings /></PrivateRoute>} />
        <Route path="/admin/email-settings"  element={<PrivateRoute role="ADMIN"><AdminEmailSettings /></PrivateRoute>} />
        <Route path="/admin/notifications"   element={<PrivateRoute role="ADMIN"><AdminNotifications /></PrivateRoute>} />

        {/* TEACHER routes */}
        <Route path="/teacher/dashboard"                    element={<PrivateRoute role="TEACHER"><TeacherDashboard /></PrivateRoute>} />
        <Route path="/teacher/profile"                      element={<PrivateRoute role="TEACHER"><TeacherProfile /></PrivateRoute>} />
        <Route path="/teacher/projects"                     element={<PrivateRoute role="TEACHER"><Projects /></PrivateRoute>} />
        <Route path="/teacher/projects/create"              element={<PrivateRoute role="TEACHER"><CreateProject /></PrivateRoute>} />
        <Route path="/teacher/projects/edit/:projectId"      element={<PrivateRoute role="TEACHER"><CreateProject /></PrivateRoute>} />
        <Route path="/teacher/projects/:projectId"          element={<PrivateRoute role="TEACHER"><ProjectDetail /></PrivateRoute>} />
        <Route path="/teacher/projects/:projectId/analyse"  element={<PrivateRoute role="TEACHER"><ProjectAnalyse /></PrivateRoute>} />
        <Route path="/teacher/teams"                        element={<PrivateRoute role="TEACHER"><CreateTeam /></PrivateRoute>} />
        <Route path="/teacher/teams/create"                 element={<PrivateRoute role="TEACHER"><CreateTeam /></PrivateRoute>} />
        <Route path="/teacher/contributions"                element={<PrivateRoute role="TEACHER"><ContributionDashboard /></PrivateRoute>} />
        <Route path="/teacher/github-workflow"              element={<PrivateRoute role="TEACHER"><GitHubWorkflow /></PrivateRoute>} />
        <Route path="/teacher/notifications"                element={<PrivateRoute role="TEACHER"><NotificationSettings /></PrivateRoute>} />
        <Route path="/teacher/notifications/list"            element={<PrivateRoute role="TEACHER"><TeacherNotifications /></PrivateRoute>} />
        <Route path="/teacher/alerts"                      element={<PrivateRoute role="TEACHER"><Alerts /></PrivateRoute>} />

        <Route path="/student/dashboard"    element={<StudentRoute><StudentDashboard /></StudentRoute>} />
        <Route path="/student/project"      element={<StudentRoute><StudentProject /></StudentRoute>} />
        <Route path="/student/team"         element={<StudentRoute><StudentTeam /></StudentRoute>} />
        <Route path="/student/contribution" element={<StudentRoute><StudentContribution /></StudentRoute>} />
        <Route path="/student/schedule"      element={<StudentRoute><Navigate to="/student/project" replace /></StudentRoute>} />
        <Route path="/student/profile"      element={<StudentRoute><StudentProfile /></StudentRoute>} />
        <Route path="/student/github"       element={<StudentRoute><StudentGitHub /></StudentRoute>} />
        <Route path="/student/notifications" element={<StudentRoute><StudentNotifications /></StudentRoute>} />

        <Route path="/hod/dashboard" element={<PrivateRoute role="HOD"><HodDashboard /></PrivateRoute>} />

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;
