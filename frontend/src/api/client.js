import axios from 'axios';

/**
 * Single axios instance: attaches the JWT from localStorage and unwraps the
 * {success, data, meta} envelope so pages work with plain data.
 *
 * VITE_API_URL switches the app from dev (Vite proxy, '/api') to a deployed
 * backend (absolute URL). Socket clients need the bare server origin, since
 * WebSockets can't ride the Vite proxy in production.
 */
export const apiUrl = import.meta.env.VITE_API_URL || '/api';
export const socketOrigin = apiUrl.replace(/\/api\/?$/, '');

export const api = axios.create({ baseURL: apiUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/')) {
      localStorage.removeItem('cp_token');
      window.location.href = '/login';
    }
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export const endpoints = {
  auth: {
    register: (body) => api.post('/auth/register', body),
    login: (body) => api.post('/auth/login', body),
    me: () => api.get('/auth/me'),
    changePassword: (body) => api.post('/auth/change-password', body),
  },
  dashboard: { stats: () => api.get('/dashboard/stats') },
  profile: {
    get: () => api.get('/profile'),
    update: (body) => api.put('/profile', body),
  },
  skills: { search: (q, category) => api.get('/skills', { params: { q, category } }) },
  jobs: {
    list: (params) => api.get('/jobs', { params }),
    get: (id) => api.get(`/jobs/${id}`),
    create: (body) => api.post('/jobs', body),
    match: (id) => api.get(`/jobs/${id}/match`),
    archive: (id) => api.delete(`/jobs/${id}`),
  },
  resumes: {
    upload: (file, onProgress) => {
      const form = new FormData();
      form.append('resume', file);
      return api.post('/resumes', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
    },
    list: (params) => api.get('/resumes', { params }),
    remove: (id) => api.delete(`/resumes/${id}`),
  },
  analysis: {
    list: (params) => api.get('/analysis', { params }),
    status: (id) => api.get(`/analysis/${id}`),
    latest: (type) => api.get(`/analysis/latest/${type}`),
    requestSkillGap: (jobId) => api.post('/analysis/skill-gap', { jobId }),
    requestRoadmap: (body) => api.post('/analysis/roadmap', body || {}),
  },
  plan: {
    active: () => api.get('/plan'),
    tasks: (params) => api.get('/plan/tasks', { params }),
    updateTask: (id, status) => api.patch(`/plan/tasks/${id}`, { status }),
  },
  dsa: {
    topics: () => api.get('/dsa/topics'),
    stats: () => api.get('/dsa/stats'),
    list: (params) => api.get('/dsa/problems', { params }),
    add: (body) => api.post('/dsa/problems', body),
    update: (id, body) => api.patch(`/dsa/problems/${id}`, body),
    remove: (id) => api.delete(`/dsa/problems/${id}`),
  },
  interviews: {
    rounds: () => api.get('/interviews/rounds'),
    create: (body) => api.post('/interviews', body),
    list: (params) => api.get('/interviews', { params }),
    get: (id) => api.get(`/interviews/${id}`),
    report: (id) => api.get(`/interviews/${id}/report`),
    abandon: (id) => api.post(`/interviews/${id}/abandon`),
  },
  notifications: {
    list: (params) => api.get('/notifications', { params }),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/read-all'),
  },
  ai: {
    explain: (topic) => api.post('/ai/explain', { topic }),
    status: () => api.get('/ai/status'),
  },
};
