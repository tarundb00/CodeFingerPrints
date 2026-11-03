const API_BASE = process.env.REACT_APP_API_BASE || '/api';
const FALLBACK_API_BASE = 'http://localhost:8080/api';

/* ── TOKEN HELPERS ── */
const getToken = () => localStorage.getItem('token');
const isStudentSession = () => Boolean(getToken()?.startsWith('student-'));

/* ── SAFE JSON ── */
async function safeJson(response) {
  const text = await response.text();
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function normalizeStudentPayload(data, fallback = {}) {
  if (!data || typeof data !== 'object') return fallback;
  const usn = (data.usn || fallback.usn || '').toString().toUpperCase();
  const email = (data.email || fallback.email || '').toString().toLowerCase();
  return { ...fallback, ...data, usn, email };
}

/* ── AUTH HEADERS ── */
function authHeaders(extra = {}) {
  const token = getToken();
  const isStudentToken = token && token.startsWith('student-');
  return {
    'Content-Type': 'application/json',
    ...(token && !isStudentToken ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function authenticatedFetch(path, options = {}) {
  const headers = new Headers(authHeaders(options.headers || {}));
  const requestOptions = {
    ...options,
    headers,
  };

  const urls = [API_BASE, FALLBACK_API_BASE].filter(Boolean);
  let lastError;

  for (const base of urls) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${base}${path}`, requestOptions);
        const data = await safeJson(response);
        if (response.ok) return data;
        if (response.status === 401) {
          const authError = new Error('Your session is no longer valid. Please sign in again.');
          authError.code = 'AUTH_EXPIRED';
          throw authError;
        }
        lastError = new Error(data?.message || data?.error || `HTTP ${response.status}`);
        if (response.status !== 404) throw lastError;
      } catch (err) {
        if (err.code === 'AUTH_EXPIRED') throw err;
        lastError = err;
        if (attempt === 1) break;
        await new Promise(resolve => setTimeout(resolve, 750));
      }
    }
  }

  throw lastError || new Error('Request failed');
}

/* ── HANDLE RESPONSE ── */
async function handle(response) {
  const data = await safeJson(response);
  if (!response.ok) {
    const msg = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

async function requestWithFallback(path, options = {}) {
  const urls = [API_BASE, FALLBACK_API_BASE].filter(Boolean);
  let lastError;

  for (const base of urls) {
    try {
      const response = await fetch(`${base}${path}`, options);
      const data = await safeJson(response);
      if (response.ok) return data;
      const isPublicAuthRequest = path === '/auth/login' || path === '/auth/register' || path === '/students/login';
      if (response.status === 401 && !isPublicAuthRequest) {
        const authError = new Error('Your session is no longer valid. Please sign in again.');
        authError.code = 'AUTH_EXPIRED';
        throw authError;
      }
      lastError = new Error(data?.message || data?.error || `HTTP ${response.status}`);
      if (response.status !== 404) throw lastError;
    } catch (err) {
      if (err.code === 'AUTH_EXPIRED') throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Request failed');
}

export async function login(credentials) {
  const data = await requestWithFallback('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (data?.accessToken) localStorage.setItem('token', data.accessToken);
  return data;
}

export async function getMe() {
  return requestWithFallback('/auth/me', { headers: authHeaders() });
}

export async function validateTeacherSession() {
  const token = getToken();
  if (!token || isStudentSession()) {
    const error = new Error('Please sign in with a teacher account before analyzing.');
    error.code = 'AUTH_EXPIRED';
    throw error;
  }
  return getMe();
}

export async function updateMe(payload) {
  return requestWithFallback('/auth/me', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function registerTeacher(payload) {
  return requestWithFallback('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* ══════════════════════════════════════
   TEACHERS
══════════════════════════════════════ */
export async function fetchTeachers() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await authenticatedFetch('/teachers');
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('Unable to load teachers');
}

export async function createTeacher(payload) {
  return authenticatedFetch('/teachers', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateTeacher(id, payload) {
  return authenticatedFetch(`/teachers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteTeacher(id) {
  return authenticatedFetch(`/teachers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const response = await fetch(`${API_BASE}/teachers/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handle(response);
}

/* ══════════════════════════════════════
   TEACHER REGISTRATION REQUESTS
══════════════════════════════════════ */
export async function submitTeacherRegistrationRequest(payload) {
  return requestWithFallback('/teacher-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchPendingTeacherRequests() {
  return authenticatedFetch('/teacher-requests/pending');
}

export async function approveTeacherRequest(id) {
  return authenticatedFetch(`/teacher-requests/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

export async function declineTeacherRequest(id, reason = '') {
  return authenticatedFetch(`/teacher-requests/${id}/decline`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
}

/* ══════════════════════════════════════
   TEAMS
══════════════════════════════════════ */
export async function fetchTeams() {
  return authenticatedFetch('/teams');
}

export async function createTeam(payload) {
  return authenticatedFetch('/teams', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateTeam(id, payload) {
  return authenticatedFetch(`/teams/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(id) {
  return authenticatedFetch(`/teams/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

/* ══════════════════════════════════════
   GITHUB CONFIGS
══════════════════════════════════════ */
export async function fetchGithubConfigs() {
  if (isStudentSession()) return [];
  return requestWithFallback('/github', { headers: authHeaders() });
}

export async function createGithubConfig(payload) {
  return requestWithFallback('/github', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
}

export async function updateGithubConfig(id, payload) {
  return requestWithFallback(`/github/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
}

export async function deleteGithubConfig(id) {
  return requestWithFallback(`/github/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  });
}

export async function testGithubConfig(id) {
  return requestWithFallback(`/github/${id}/test`, {
    method: 'POST', headers: authHeaders(),
  });
}

export async function createGithubRepo(payload) {
  return requestWithFallback('/github/create-repo', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
}

/* ══════════════════════════════════════
   PROJECTS
══════════════════════════════════════ */
export async function fetchProjects() {
  return authenticatedFetch('/projects');
}

export async function fetchProject(id) {
  return authenticatedFetch(`/projects/${id}`);
}

export async function createProject(payload) {
  return authenticatedFetch('/projects', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
}

export async function updateProject(id, payload) {
  return authenticatedFetch(`/projects/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  });
}

export async function finalizeProject(id) {
  return authenticatedFetch(`/projects/${id}/finalize`, {
    method: 'POST', headers: authHeaders(),
  });
}

export async function fetchProjectAudits(id) {
  return authenticatedFetch(`/projects/${id}/audits`);
}

export async function deleteProject(id, { deleteGithubRepo = false } = {}) {
  const params = new URLSearchParams();
  if (deleteGithubRepo) params.set('deleteGithubRepo', 'true');
  const query = params.toString();
  return authenticatedFetch(`/projects/${id}${query ? `?${query}` : ''}`, {
    method: 'DELETE', headers: authHeaders(),
  });
}

/* ══════════════════════════════════════
   STUDENTS
══════════════════════════════════════ */
export async function fetchStudents() {
  return handle(await fetch(`${API_BASE}/students`, { headers: authHeaders() }));
}

export async function fetchStudentsByTeam(teamId) {
  return handle(await fetch(`${API_BASE}/students/team/${teamId}`, { headers: authHeaders() }));
}

export async function syncStudentsFromTeam(teamId) {
  return handle(await fetch(`${API_BASE}/students/sync/team/${teamId}`, {
    method: 'POST', headers: authHeaders(),
  }));
}

export async function syncAllStudents() {
  return handle(await fetch(`${API_BASE}/students/sync/all`, {
    method: 'POST', headers: authHeaders(),
  }));
}

/* ══════════════════════════════════════
   CONTRIBUTIONS
══════════════════════════════════════ */
export async function fetchAllContributions() {
  return authenticatedFetch('/contributions/all');
}

export async function fetchContributions(projectId) {
  return authenticatedFetch(`/contributions/project/${projectId}`);
}

export async function fetchTeamContributions(teamId) {
  return authenticatedFetch(`/contributions/team/${teamId}`);
}

export async function fetchInactiveStudents() {
  return authenticatedFetch('/contributions/inactive');
}

export async function analyzeContributions(projectId) {
  if (isStudentSession()) return { message: 'Contribution analysis is managed by the teacher.' };
  return authenticatedFetch(`/contributions/analyze/${projectId}`, {
    method: 'POST', headers: authHeaders(),
  });
}

export async function updateContribution(id, payload) {
  return handle(await fetch(`${API_BASE}/contributions/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}

export async function deleteContribution(id) {
  return handle(await fetch(`${API_BASE}/contributions/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  }));
}

/* ══════════════════════════════════════
   STUDENT PORTAL
══════════════════════════════════════ */
export async function fetchStudentDashboard(usn) {
  const data = await handle(await fetch(`${API_BASE}/students/dashboard/${usn}`, { headers: authHeaders() }));
  if (data?.student) {
    data.student = normalizeStudentPayload(data.student);
  }
  return data;
}

export async function fetchStudentByUsn(usn) {
  const data = await handle(await fetch(`${API_BASE}/students/usn/${usn}`, { headers: authHeaders() }));
  return normalizeStudentPayload(data);
}

export async function updateStudentProfile(id, payload) {
  return handle(await fetch(`${API_BASE}/students/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}

export async function studentLogin(credentials) {
  const payload = {
    usn: credentials.usn.toUpperCase().trim(),
    email: credentials.email.trim().toLowerCase(),
  };
  const data = await requestWithFallback('/students/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const normalized = normalizeStudentPayload(data, {
    usn: payload.usn,
    email: payload.email,
  });
  localStorage.removeItem('user');
  localStorage.setItem('student', JSON.stringify(normalized));
  localStorage.setItem('token', 'student-' + normalized.usn);
  window.dispatchEvent(new Event('cfp-session-changed'));
  return normalized;
}

export async function checkStudentExists(usn, email) {
  const params = new URLSearchParams();
  if (usn)   params.append('usn',   usn.toUpperCase());
  if (email) params.append('email', email.toLowerCase());
  return handle(await fetch(`${API_BASE}/students/check?${params}`, { headers: authHeaders() }));
}

/* ══════════════════════════════════════
   BUG TRACKER
══════════════════════════════════════ */
export async function fetchBugsByProject(projectId) {
  if (isStudentSession()) return [];
  return handle(await fetch(`${API_BASE}/bugs/project/${projectId}`, { headers: authHeaders() }));
}
export async function fetchBugsByStudent(usn) {
  if (isStudentSession()) return [];
  return handle(await fetch(`${API_BASE}/bugs/my/${usn}`, { headers: authHeaders() }));
}
export async function fetchAllBugs() {
  return handle(await fetch(`${API_BASE}/bugs`, { headers: authHeaders() }));
}
export async function createBug(payload) {
  return handle(await fetch(`${API_BASE}/bugs`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}
export async function updateBug(id, payload) {
  return handle(await fetch(`${API_BASE}/bugs/${id}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}
export async function deleteBug(id) {
  return handle(await fetch(`${API_BASE}/bugs/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  }));
}

export async function publishMarks(id) {
  return handle(await fetch(`${API_BASE}/projects/${id}/publish-marks`, { method: 'PUT', headers: authHeaders() }));
}

/* ══════════════════════════════════════
   GITHUB WORKFLOW — BRANCH MANAGEMENT
══════════════════════════════════════ */
export async function setupBranches(projectId) {
  return handle(await fetch(`${API_BASE}/github/workflow/setup-branches/${projectId}`, {
    method: 'POST', headers: authHeaders(),
  }));
}
export async function listBranches(projectId) {
  return handle(await fetch(`${API_BASE}/github/workflow/branches/${projectId}`, { headers: authHeaders() }));
}
export async function getBranchAssignments(projectId) {
  return handle(await fetch(`${API_BASE}/github/workflow/assignments/${projectId}`, { headers: authHeaders() }));
}
export async function getMyBranch(projectId, usn) {
  return handle(await fetch(`${API_BASE}/github/workflow/my-branch/${projectId}/${usn}`, { headers: authHeaders() }));
}
export async function getBranchCommits(projectId, branch) {
  return handle(await fetch(`${API_BASE}/github/workflow/commits/${projectId}/${encodeURIComponent(branch)}`, { headers: authHeaders() }));
}
export async function compareBranch(projectId, branch) {
  return handle(await fetch(`${API_BASE}/github/workflow/compare/${projectId}/${encodeURIComponent(branch)}`, { headers: authHeaders() }));
}
export async function createPullRequest(projectId, payload) {
  return handle(await fetch(`${API_BASE}/github/workflow/pull-request/${projectId}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}
export async function listPullRequests(projectId, state = 'open') {
  return handle(await fetch(`${API_BASE}/github/workflow/pull-requests/${projectId}?state=${state}`, { headers: authHeaders() }));
}
export async function mergePullRequest(projectId, prNumber, payload = {}) {
  return handle(await fetch(`${API_BASE}/github/workflow/merge/${projectId}/${prNumber}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  }));
}
export async function rejectPullRequest(projectId, prNumber) {
  return handle(await fetch(`${API_BASE}/github/workflow/reject/${projectId}/${prNumber}`, {
    method: 'POST', headers: authHeaders(),
  }));
}
export async function protectMainBranch(projectId) {
  return handle(await fetch(`${API_BASE}/github/workflow/protect-main/${projectId}`, {
    method: 'POST', headers: authHeaders(),
  }));
}
export async function getBranchDetail(projectId, branch) {
  return handle(await fetch(`${API_BASE}/github/workflow/branch-detail/${projectId}/${encodeURIComponent(branch)}`, { headers: authHeaders() }));
}

/* ══════════════════════════════════════
   PEER REVIEWS
══════════════════════════════════════ */
export async function submitPeerReview(payload) {
  return handle(await fetch(`${API_BASE}/peer-reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function fetchPeerReviewsByProject(projectId) {
  return handle(await fetch(`${API_BASE}/peer-reviews/project/${projectId}`, { headers: authHeaders() }));
}

export async function fetchMyPeerReviews(reviewerUsn, projectId) {
  return handle(await fetch(`${API_BASE}/peer-reviews/my/${reviewerUsn}/project/${projectId}`, { headers: authHeaders() }));
}

/* ══════════════════════════════════════
   MEETINGS & DISCUSSION LOGS
══════════════════════════════════════ */
export async function fetchMeetingsByProject(projectId) {
  return handle(await fetch(`${API_BASE}/meetings/project/${projectId}`, { headers: authHeaders() }));
}

export async function fetchMeetingsByTeam(teamId) {
  return handle(await fetch(`${API_BASE}/meetings/team/${teamId}`, { headers: authHeaders() }));
}

export async function createMeeting(payload) {
  return handle(await fetch(`${API_BASE}/meetings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function updateMeeting(id, payload) {
  return handle(await fetch(`${API_BASE}/meetings/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function deleteMeeting(id) {
  return handle(await fetch(`${API_BASE}/meetings/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}

/* ══════════════════════════════════════
   MANUAL GRADING
══════════════════════════════════════ */
export async function updateManualGrading(scoreId, payload) {
  return handle(await fetch(`${API_BASE}/contributions/${scoreId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));
}
export async function getNotifications(usn) {
  return authenticatedFetch(`/notifications/${usn}`);
}
export async function markNotificationRead(id) {
  return authenticatedFetch(`/notifications/${id}/read`, { method: 'PUT' });
}
export async function markAllNotificationsRead(usn) {
  return authenticatedFetch(`/notifications/${usn}/read-all`, { method: 'PUT' });
}

export async function sendTestEmail(payload) {
  return authenticatedFetch('/notifications/test', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
