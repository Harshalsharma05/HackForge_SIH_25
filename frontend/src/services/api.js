import axios from "axios";

// API base configuration - Updated to match your backend
const API_BASE_URL = "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for cookies
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token && token !== "mock-token") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const userType = localStorage.getItem("userType");
        const refreshToken = localStorage.getItem("refreshToken");

        // Don't try to refresh if no refresh token or if this is already a refresh request
        if (!refreshToken || originalRequest.url?.includes("/refresh-token")) {
          throw new Error("No refresh token available");
        }

        let response;

        if (userType === "tourist") {
          // Create a new axios instance to avoid interceptor loop
          const refreshApi = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          });

          response = await refreshApi.post("/auth/refresh-token", {
            refreshToken,
          });

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } =
              response.data.data;
            localStorage.setItem("authToken", accessToken);
            if (newRefreshToken) {
              localStorage.setItem("refreshToken", newRefreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } else if (userType === "authority") {
          // Create a new axios instance to avoid interceptor loop
          const refreshApi = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          });

          // Admin refresh might use cookies instead
          response = await refreshApi.post("/admin/refresh-token");

          if (response.data.success) {
            const { accessToken } = response.data.data;
            localStorage.setItem("authToken", accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Refresh failed, logout user
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userType");
        // Don't reload immediately, let the app handle the logout state
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authority Authentication APIs (Based on your adminRoutes.js)
export const authAPI = {
  login: (credentials) => api.post("/admin/login", credentials),
  logout: () => api.post("/admin/logout"),
  verifyToken: () => api.get("/admin/current"),
  refreshToken: () => api.post("/admin/refresh-token"),
  createAdmin: (adminData) => api.post("/admin/create", adminData),
  getAllAdmins: (params) => api.get("/admin/all", { params }),
  updateAdminStatus: (adminId, status) =>
    api.patch(`/admin/${adminId}/status`, status),
};

// Tourist Authentication APIs (Based on your authRoutes.js)
export const touristAuthAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  getCurrentTourist: () => api.get("/auth/current-tourist"),
  refreshToken: (refreshToken) =>
    api.post("/auth/refresh-token", { refreshToken }),
  changePassword: (passwords) => api.post("/auth/change-password", passwords),
};

// Trip APIs (Based on your tripRoutes.js)
export const tripAPI = {
  createTrip: (tripData) => api.post("/trips/create", tripData),
  getTouristTrips: (params) => api.get("/trips/my-trips", { params }),
  getTripById: (tripId) => api.get(`/trips/${tripId}`),
  getCurrentTrip: () => api.get("/trips/current"),
  updateTrip: (tripId, tripData) =>
    api.patch(`/trips/${tripId}/update`, tripData),
  activateTrip: (tripId) => api.post(`/trips/${tripId}/activate`),
  completeTrip: (tripId) => api.post(`/trips/${tripId}/complete`),
  verifyDigitalId: (digitalId) => api.get(`/trips/verify/${digitalId}`),
  getBlockchainDigitalId: (tripId) => api.get(`/trips/${tripId}/blockchain`),
};

// Location APIs (Based on your locationRoutes.js)
export const locationAPI = {
  startTracking: (tripId) =>
    api.post("/location/start-tracking", { trip_id: tripId }),
  stopTracking: (tripId) =>
    api.post("/location/stop-tracking", { trip_id: tripId }),
  updateLocation: (locationData) => api.post("/location/update", locationData),
  getCurrentLocation: (tripId) => api.get(`/location/current/${tripId}`),
  getLocationHistory: (tripId, params) =>
    api.get(`/location/history/${tripId}`, { params }),
  checkNearbyGeofences: (params) =>
    api.get("/location/check-geofences", { params }),
  getHeatmapData: () => api.get("/location/heatmap"),
  getActiveTourists: () => api.get("/dashboard/active-tourists"),
};

// Geofence APIs (Based on your geofenceRoutes.js)
export const geofenceAPI = {
  getAllGeofences: () => api.get("/geofence/"),
  createGeofence: (geofenceData) => api.post("/geofence/create", geofenceData),
  updateGeofence: (geofenceId, geofenceData) =>
    api.put(`/geofence/${geofenceId}`, geofenceData),
  deleteGeofence: (geofenceId) => api.delete(`/geofence/${geofenceId}`),
  getByJurisdiction: (jurisdictionId) =>
    api.get(`/geofence/jurisdiction/${jurisdictionId}`),
};

// Alerts APIs (Based on your sosRoutes.js)
export const alertsAPI = {
  sosAlert: (alertData) => api.post("/alert/sos", alertData),
  panicNotifyAdmin: (alertData) => api.post("/alert/panic-notify", alertData),
  getRecentAlerts: () => api.get("/dashboard/recent-alerts"),
  markResolved: (alertId) => api.patch(`/alerts/${alertId}/resolve`),
  createAlert: (alertData) => api.post("/alerts/", alertData),
};

// Dashboard APIs (Based on your dashboardRoutes.js)
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
  getActiveTourists: (params) =>
    api.get("/dashboard/active-tourists", { params }),
  getRecentAlerts: (params) => api.get("/dashboard/recent-alerts", { params }),
  getGeofenceData: () => api.get("/dashboard/geofences"),
  getLiveMapData: () => api.get("/dashboard/live-map"),
};

// KYC APIs (Based on your kycRoutes.js)
export const kycAPI = {
  sendOtp: (touristId) => api.post("/kyc/send-otp", { touristId }),
  verifyOtp: (touristId, otp) =>
    api.post("/kyc/verify-otp", { touristId, otp }),
};

// Blockchain APIs (Based on your blockchainRoutes.js)
export const blockchainAPI = {
  getDigitalIds: (params) => api.get("/blockchain/digital-ids", { params }),
  getDigitalIdById: (digitalIdId) =>
    api.get(`/blockchain/digital-ids/${digitalIdId}`),
  verifyOnBlockchain: (digitalId) => api.get(`/blockchain/verify/${digitalId}`),
  getNetworkStatus: () => api.get("/blockchain/network-status"),
  resyncDigitalId: (digitalIdId) =>
    api.post(`/blockchain/digital-ids/${digitalIdId}/resync`),
  getIpfsMetadata: (ipfsHash) => api.get(`/blockchain/ipfs/${ipfsHash}`),
};

export default api;
