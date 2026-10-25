// API Client Wrapper for TeamConnect
const API_BASE = 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('teamconnect_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('teamconnect_token', token);
    } else {
      localStorage.removeItem('teamconnect_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('teamconnect_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || (data.errors && data.errors[0]?.msg) || 'Something went wrong');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Auth
  getInstitutions() {
    return this.request('/auth/institutions');
  }

  register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  login(payload) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  adminLogin(payload) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Profile & Onboarding
  completeOnboarding(payload) {
    return this.request('/users/onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getProfile(userId) {
    return this.request(`/users/${userId}/profile`);
  }

  updateProfile(payload) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  updateSkills(skills) {
    return this.request('/users/skills', {
      method: 'PUT',
      body: JSON.stringify({ skills }),
    });
  }

  // Skills
  getSkills() {
    return this.request('/skills');
  }

  // Notifications
  getNotifications() {
    return this.request('/notifications');
  }

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  // ── Projects ──────────────────────────────────
  getProjects(params = {}) {
    const query = new URLSearchParams();
    if (params.domain) query.set('domain', params.domain);
    if (params.status) query.set('status', params.status);
    if (params.skill) query.set('skill', params.skill);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    return this.request(`/projects${queryString ? `?${queryString}` : ''}`);
  }

  getProject(id) {
    return this.request(`/projects/${id}`);
  }

  createProject(payload) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateProject(id, payload) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  getMyProjects() {
    return this.request('/projects/my');
  }

  // ── Team Workspace ──────────────────────────
  getTeamWorkspace(projectId) {
    return this.request(`/teams/${projectId}`);
  }

  getTeamMessages(projectId) {
    return this.request(`/teams/${projectId}/messages`);
  }

  sendTeamMessage(projectId, content) {
    return this.request(`/teams/${projectId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
  }

  createTeamTask(projectId, payload) {
    return this.request(`/teams/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
  }

  updateTeamTask(projectId, taskId, payload) {
    return this.request(`/teams/${projectId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  deleteTeamTask(projectId, taskId) {
    return this.request(`/teams/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
  }

  createTeamMilestone(projectId, payload) {
    return this.request(`/teams/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(payload) });
  }

  updateTeamMilestone(projectId, milestoneId, payload) {
    return this.request(`/teams/${projectId}/milestones/${milestoneId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  deleteTeamMilestone(projectId, milestoneId) {
    return this.request(`/teams/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });
  }

  createTeamAnnouncement(projectId, payload) {
    return this.request(`/teams/${projectId}/announcements`, { method: 'POST', body: JSON.stringify(payload) });
  }

  getTeamAnnouncements(projectId) {
    return this.request(`/teams/${projectId}/announcements`);
  }

  updateTeamAnnouncement(projectId, announcementId, payload) {
    return this.request(`/teams/${projectId}/announcements/${announcementId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  deleteTeamAnnouncement(projectId, announcementId) {
    return this.request(`/teams/${projectId}/announcements/${announcementId}`, { method: 'DELETE' });
  }

  submitPeerReview(projectId, payload) {
    return this.request(`/teams/${projectId}/reviews`, { method: 'POST', body: JSON.stringify(payload) });
  }

  completeTeamProject(projectId) {
    return this.request(`/teams/${projectId}/complete`, { method: 'PATCH' });
  }

  removeTeamMember(projectId, memberId) {
    return this.request(`/teams/${projectId}/members/${memberId}`, { method: 'DELETE' });
  }

  // ── Admin Projects ───────────────────────────
  getAdminProjects(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.domain) query.set('domain', params.domain);
    const queryString = query.toString();
    return this.request(`/admin/projects${queryString ? `?${queryString}` : ''}`);
  }

  approveProject(id) {
    return this.request(`/admin/projects/${id}/approve`, { method: 'PATCH' });
  }

  rejectProject(id, reason = '') {
    return this.request(`/admin/projects/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  archiveProject(id) {
    return this.request(`/admin/projects/${id}/archive`, { method: 'PATCH' });
  }

  // ── Applications ─────────────────────────────
  applyToRole(roleId, message = '') {
    return this.request(`/applications/roles/${roleId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  getMyApplications() {
    return this.request('/applications/my');
  }

  withdrawApplication(id) {
    return this.request(`/applications/${id}/withdraw`, { method: 'PATCH' });
  }

  getProjectApplications(projectId) {
    return this.request(`/applications/projects/${projectId}`);
  }

  getRoleApplications(roleId) {
    return this.request(`/applications/roles/${roleId}`);
  }

  updateApplicationStatus(id, status) {
    return this.request(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ── Suggestions & Invitations ────────────────
  getSuggestedStudents(roleId) {
    return this.request(`/projects/roles/${roleId}/suggestions`);
  }

  sendInvitation(payload) {
    return this.request('/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getMyInvitations() {
    return this.request('/invitations/my');
  }

  respondToInvitation(id, status) {
    return this.request(`/invitations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new ApiClient();
