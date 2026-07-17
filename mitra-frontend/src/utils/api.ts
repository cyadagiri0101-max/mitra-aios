import axios from 'axios';

/**
 * Axios instance pre-configured for the MITRA v2 backend.
 * CRITICAL FIX C-1: Access token stored in memory (module-level), NOT localStorage.
 * CRITICAL FIX C-3: CSRF token attached to all mutating requests.
 * MEDIUM FIX M-3: Exponential backoff retry on 5xx errors.
 */

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request interceptor: attach JWT + CSRF + Request ID ─────────────────
api.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }

  // CRITICAL FIX C-3: CSRF token for state-changing methods
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() ?? '')) {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1];
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }

  // Request tracing
  config.headers['X-Request-ID'] = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return config;
});

// ── Response interceptor: 5xx retry + 401 refresh ─────────────────────
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}
function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { config, response } = err;
    const retryCount = config?.__retryCount || 0;

    // MEDIUM FIX M-3: Retry on 5xx with exponential backoff (max 3 retries)
    if (response?.status >= 500 && retryCount < 3) {
      config.__retryCount = retryCount + 1;
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(r => setTimeout(r, delay));
      return api(config);
    }

    // 401 on non-refresh endpoint → attempt silent refresh once
    if (response?.status === 401 && !config._retry && config.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(api(config));
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true } // httpOnly cookie sent automatically
        );
        const { access_token } = res.data;
        setAccessToken(access_token);
        onRefreshed(access_token);
        config.headers.Authorization = `Bearer ${access_token}`;
        return api(config);
      } catch {
        clearAuth();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

function clearAuth() {
  setAccessToken(null);
  localStorage.removeItem('mitra_user');
  window.location.href = '/login';
}

// ── BOM Analysis API ───────────────────────────────────────────────────

export function analyzeBOM(projectId: string, bomData: string | object) {
  return api.post('/bom-analysis/analyze', { projectId, bomData });
}

export function getBOMAnalysis(id: string) {
  return api.get(`/bom-analysis/${id}`);
}

export function getBOMAnalysisByProject(projectId: string) {
  return api.get(`/bom-analysis/project/${projectId}`);
}

// ── Drawing Analysis API ─────────────────────────────────────────────────

export function uploadDrawing(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('file', file);
  return api.post('/drawing-analysis/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getDrawingAnalysis(id: string) {
  return api.get(`/drawing-analysis/${id}`);
}

export function getDrawingAnalysisByProject(projectId: string) {
  return api.get(`/drawing-analysis/project/${projectId}`);
}

// ── Machine Status API ───────────────────────────────────────────────────

export function getMachineStatus() {
  return api.get('/machine-status');
}

export function getMachineStatusById(machineId: string) {
  return api.get(`/machine-status/${machineId}`);
}

export function postMachineTelemetry(telemetry: object) {
  return api.post('/machine-status/telemetry', telemetry);
}

export function getMachineStatusSummary() {
  return api.get('/machine-status/summary/dashboard');
}

// ── AI Usage Tracking API ────────────────────────────────────────────────

export function getAIUsageStats() {
  return api.get('/ai-usage/stats');
}

export function getAIUsageByUser(userId: string) {
  return api.get(`/ai-usage/user/${userId}`);
}

export function trackAIUsage(data: { prompt: string; modelName: string; responseTimeMs: number; tokenEstimate?: number }) {
  return api.post('/ai-usage/track', data);
}

export function searchEkl(query: string) {
  return api.get('/ekl/search', { params: { q: query } });
}

export function getEklProjects() {
  return api.get('/ekl/projects');
}

export function getEklProject(id: string) {
  return api.get(`/ekl/projects/${encodeURIComponent(id)}`);
}

export function getEklDocuments() {
  return api.get('/ekl/documents');
}

export function getEklDocument(id: string) {
  return api.get(`/ekl/documents/${encodeURIComponent(id)}`);
}

export function getEklDashboard() {
  return api.get('/ekl/dashboard/widgets');
}

export function syncEkl() {
  return api.post('/ekl/sync');
}

export function getEklSyncStatus() {
  return api.get('/ekl/sync/status');
}
