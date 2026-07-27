import axios from 'axios';

// Dynamically set API URL. Uses VITE_API_URL if provided, else falls back to '/api' for Vite dev proxy.
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getKPIs = () => api.get('/analytics/kpis').then(res => res.data);
export const getSectors = () => api.get('/analytics/sectors').then(res => res.data);
export const getTrends = () => api.get('/analytics/trends').then(res => res.data);
export const getFunnel = () => api.get('/analytics/funnel').then(res => res.data);
export const getTopCustomers = () => api.get('/analytics/top-customers').then(res => res.data);
export const getWorkload = () => api.get('/analytics/workload').then(res => res.data);
export const getAlerts = () => api.get('/analytics/alerts').then(res => res.data);
export const getTimeline = () => api.get('/analytics/timeline').then(res => res.data);
export const getInsight = () => api.get('/analytics/insight-of-the-day').then(res => res.data);

export const runWhatIf = (data) => api.post('/analytics/what-if', data).then(res => res.data);

export const getMondayStatus = () => api.get('/monday/status').then(res => res.data);
export const getQualityReport = () => api.get('/monday/quality').then(res => res.data);
export const clearCache = () => api.post('/monday/clear-cache').then(res => res.data);

export const getSettings = () => api.get('/settings').then(res => res.data);
export const updateSettings = (data) => api.post('/settings/update', data).then(res => res.data);

export const queryChat = (query, history) => api.post('/chat/query', { query, history }).then(res => res.data);
export const generateBrief = (brief_type) => api.post('/briefs/generate', { brief_type }).then(res => res.data);

export default api;
