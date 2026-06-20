import axios from 'axios';

// We configure it to use relative paths because Vite handles proxying of /api in dev mode
const API = axios.create({
  baseURL: ''
});

export const getDashboardStats = async (filters = {}) => {
  const { data } = await API.get('/api/stats', { params: filters });
  return data;
};

export const getSessions = async (filters = {}) => {
  const { data } = await API.get('/api/sessions', { params: filters });
  return data;
};

export const getSessionDetails = async (sessionId) => {
  const { data } = await API.get(`/api/sessions/${sessionId}`);
  return data;
};

export const getSessionReplay = async (sessionId) => {
  const { data } = await API.get(`/api/replay/${sessionId}`);
  return data;
};

export const getHeatmapData = async (page) => {
  const { data } = await API.get('/api/heatmap', { params: { page } });
  return data;
};

export const clearAllEventsData = async () => {
  const { data } = await API.delete('/api/events');
  return data;
};

export default {
  getDashboardStats,
  getSessions,
  getSessionDetails,
  getSessionReplay,
  getHeatmapData,
  clearAllEventsData
};
