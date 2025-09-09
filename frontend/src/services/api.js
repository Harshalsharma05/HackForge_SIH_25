import axios from 'axios';

// API base configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authority Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/authority/login', credentials),
  logout: () => api.post('/auth/authority/logout'),
  verifyToken: () => api.get('/auth/verify'),
};

// Tourist Location APIs
export const locationAPI = {
  getActiveTourists: () => api.get('/location/active'),
  getTouristById: (id) => api.get(`/location/tourist/${id}`),
};

// Geofence APIs
export const geofenceAPI = {
  getAllGeofences: () => api.get('/geofence/'),
  getByJurisdiction: (jurisdictionId) => api.get(`/geofence/jurisdiction/${jurisdictionId}`),
};

// Alerts APIs
export const alertsAPI = {
  getRecentAlerts: () => api.get('/alerts/recent'),
  markResolved: (alertId) => api.patch(`/alerts/${alertId}/resolve`),
  createAlert: (alertData) => api.post('/alerts/', alertData),
};

// Digital ID APIs
export const digitalIdAPI = {
  verifyId: (digitalId) => api.get(`/trips/verify/${digitalId}`),
  getTripDetails: (digitalId) => api.get(`/trips/details/${digitalId}`),
};

export default api;