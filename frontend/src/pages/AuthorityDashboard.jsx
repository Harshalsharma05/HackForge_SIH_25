"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api, { dashboardAPI } from "../services/api";
import InteractiveMap from "../components/InteractiveMap";
import NotificationSystem from "../components/NotificationSystem";
// import TestControls from "../components/TestControls";
import {
  MapPin,
  Users,
  AlertTriangle,
  Shield,
  Phone,
  RefreshCw,
  LogOut,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const AuthorityDashboard = () => {
  const { user, logout } = useAuth();
  const [geofences, setGeofences] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]); // Add heatmap data state
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedQRType, setSelectedQRType] = useState("digital_id"); // For QR code type selection
  const [showTouristDetails, setShowTouristDetails] = useState(true); // For mobile toggle
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // "connected", "connecting", "error"
  const [retryCount, setRetryCount] = useState(0);

  // Real-time updates
  const [ws, setWs] = useState(null);

  // WebSocket setup for real-time updates
  const setupWebSocket = () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Use fetch-based approach for now instead of WebSocket to avoid dependency issues
      // Set up more frequent polling for near real-time updates
      const realTimeInterval = setInterval(fetchActiveTourists, 5000); // Update every 5 seconds
      
      return () => {
        clearInterval(realTimeInterval);
      };
    } catch (error) {
      console.error('Real-time setup error:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const cleanupRealTime = setupWebSocket();

    // Set up polling for other data
    const interval = setInterval(fetchLiveData, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      if (cleanupRealTime) cleanupRealTime();
      if (ws) ws.close();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setConnectionStatus("connecting");

      // Fetch data sequentially instead of simultaneously to reduce server load
      await fetchDashboardStats();
      await fetchActiveTourists();
      await fetchGeofences();
      await fetchRecentAlerts();

      setConnectionStatus("connected");
      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setConnectionStatus("error");

      // Show user-friendly error message
      if (error.code === "ECONNABORTED") {
        console.warn("Request timeout - retrying in 5 seconds...");
        setRetryCount((prev) => prev + 1);

        if (retryCount < 3) {
          setTimeout(() => {
            fetchInitialData();
          }, 5000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      // Only fetch if we're currently connected
      if (connectionStatus === "connected") {
        await fetchActiveTourists();
        await fetchRecentAlerts();
        setConnectionStatus("connected");
      }
    } catch (error) {
      console.error("Error fetching live data:", error);
      if (error.code === "ECONNABORTED") {
        console.warn("Live data fetch timed out");
        // Don't change connection status to error for live data timeouts
        // Just skip this update cycle
      } else {
        setConnectionStatus("error");
      }
    }
  };

  const fetchDashboardStats = async () => {
    try {
      console.log("Fetching dashboard stats...");
      const response = await api.get("/dashboard/stats");
      console.log("Dashboard stats response:", response.data);
      setDashboardStats(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);

      if (error.code === "ECONNABORTED") {
        console.warn("Dashboard stats request timed out");
        return;
      }

      console.error("Error details:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        auth: localStorage.getItem("authToken") ? "Token exists" : "No token",
        userType: localStorage.getItem("userType"),
      });
    }
  };

  const fetchActiveTourists = async () => {
    try {
      console.log("🔍 Fetching active tourists...");
      const response = await dashboardAPI.getActiveTourists();
      console.log("✅ Active tourists response:", response.data);
      const touristsData = response.data.data?.tourists || [];

      // Filter out tourists with invalid location data
      const validTourists = touristsData.filter((tourist) => {
        if (!tourist.location) return false;
        const lat = tourist.location.latitude;
        const lng = tourist.location.longitude;
        return (
          lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
        );
      });

      console.log("👥 Valid tourists:", validTourists);
      setTourists(validTourists);

      // Generate heatmap data from tourist locations
      const heatmapPoints = validTourists
        .filter(tourist => tourist.location && tourist.location.latitude && tourist.location.longitude)
        .map(tourist => ({
          lat: tourist.location.latitude,
          lng: tourist.location.longitude,
          intensity: 1, // Basic intensity, can be enhanced based on risk level, time spent, etc.
        }));
      
      console.log("🔥 Heatmap points:", heatmapPoints);
      setHeatmapData(heatmapPoints);
    } catch (error) {
      console.error("❌ Error fetching active tourists:", error);

      if (error.code === "ECONNABORTED") {
        console.warn("⏰ Active tourists request timed out");
        // Don't clear existing tourists data on timeout
        return;
      }

      console.error("Error details:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        auth: localStorage.getItem("authToken") ? "Token exists" : "No token",
        userType: localStorage.getItem("userType"),
      });

      // Only clear tourists data if it's not a timeout
      if (error.code !== "ECONNABORTED") {
        setTourists([]);
      }
    }
  };

  const fetchGeofences = async () => {
    try {
      console.log("🗺️ Fetching geofences...");
      const response = await dashboardAPI.getGeofenceData();
      console.log("✅ Geofences response:", response);
      
      // Debug: Log the actual structure
      console.log("📍 Raw geofence data:", response.data);
      
      const geofencesData = response.data.data?.geofences || [];
      console.log("🗺️ Geofences array:", geofencesData);
      
      // Remove strict filtering - accept any geofence with basic location data
      const validGeofences = geofencesData.filter(geofence => {
        const hasLatLng = (geofence.latitude || geofence.center_lat) && 
                         (geofence.longitude || geofence.center_lng);
        
        if (!hasLatLng) {
          console.log("❌ Invalid geofence (no coordinates):", geofence);
        }
        
        return hasLatLng;
      });
      
      console.log("🗺️ Valid geofences after filtering:", validGeofences);
      setGeofences(validGeofences);
    } catch (error) {
      console.error("❌ Error fetching geofences:", error);
      setGeofences([]);
    }
  };

  const fetchTouristDetails = async (touristId) => {
    try {
      const response = await api.get(`/trips/tourist/${touristId}/details`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching tourist details:", error);
      return null;
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      // Use the API service instead of direct fetch
      const response = await api.get("/fetchalerts");
      console.log("Recent alerts response:", response.data);

      // Correctly extract alerts array
      const alertsArray = Array.isArray(response.data?.data?.alerts)
        ? response.data.data.alerts
        : Array.isArray(response.data?.alerts)
        ? response.data.alerts
        : [];

      console.log(`🚨 Total alerts fetched: ${alertsArray.length}`);
      setAlerts(alertsArray);
    } catch (error) {
      console.error("Error fetching recent alerts:", error);

      if (error.code === "ECONNABORTED") {
        console.warn("Recent alerts request timed out");
        // Don't clear existing alerts data on timeout
        return;
      }

      // Only clear alerts data if it's not a timeout
      if (error.code !== "ECONNABORTED") {
        setAlerts([]);
      }
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      // Use the API service instead of direct fetch
      const response = await api.put(`/fetchalerts/${alertId}/resolve`);

      if (response.data.success) {
        // update alert status in local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert._id === alertId
              ? { ...alert, status: "resolved", resolved_at: new Date() }
              : alert
          )
        );
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const handleTouristSelect = async (tourist) => {
    console.log("Initial tourist object:", tourist);
    setSelectedTourist(tourist);
    setSelectedQRType("digital_id"); // Reset QR type selection
    setShowTouristDetails(true); // Show details when selecting a new tourist

    // Fetch additional details if needed
    try {
      const details = await fetchTouristDetails(tourist.tourist._id);
      if (details) {
        console.log("Fetched tourist details:", details);
        console.log("QR codes from backend:", details.qr_codes);
        console.log("Digital ID from backend:", details.digital_id);
        console.log("Current trip from backend:", details.current_trip);
        const mergedData = { ...tourist, ...details };
        console.log("Merged tourist data:", mergedData);
        setSelectedTourist(mergedData);
      }
    } catch (error) {
      console.error("Error fetching tourist details:", error);
    }
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getMarkerColor = (riskLevel) => {
    switch (riskLevel) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      default:
        return "green";
    }
  };

  const generateQRCode = (digitalId, qrCodesObject, qrType = "digital_id") => {
    console.log("generateQRCode called with:", {
      digitalId,
      qrCodesObject,
      qrType,
    });

    // First try to use the QR code from the trip's qr_codes object
    if (qrCodesObject && typeof qrCodesObject === "object") {
      console.log("QR codes object found:", Object.keys(qrCodesObject));
      // Try to get the requested QR code type
      if (qrCodesObject[qrType]) {
        console.log(`Using ${qrType} QR code from trip`);
        return qrCodesObject[qrType];
      }
      // Fallback to any available QR code
      if (qrCodesObject.digital_id) {
        console.log("Using digital_id QR code as fallback");
        return qrCodesObject.digital_id;
      } else if (qrCodesObject.emergency) {
        console.log("Using emergency QR code as fallback");
        return qrCodesObject.emergency;
      } else if (qrCodesObject.verification) {
        console.log("Using verification QR code as fallback");
        return qrCodesObject.verification;
      }
    }

    // Fallback to generating QR code URL
    if (digitalId) {
      console.log("Using generated QR code URL");
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${digitalId}`;
    }

    // Default fallback
    console.log("Using default fallback QR code");
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=No-Digital-ID`;
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "panic":
        return <Zap className="w-4 h-4" />;
      case "geo_fence":
        return <MapPin className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case "panic":
        return "bg-red-50 border-red-200 text-red-800";
      case "geo_fence":
        return "bg-amber-50 border-amber-200 text-amber-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  // Test functions for simulating real-time events
  const handleSimulateAlert = (alert) => {
    setAlerts((prev) => [alert, ...prev]);

    // Simulate notification
    const notification = {
      id: Date.now(),
      type: alert.type,
      title: `New ${alert.type} Alert`,
      message: alert.description,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [notification, ...prev]);

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
      });
    }
  };

  const handleSimulateLocationUpdate = (update) => {
    setTourists((prev) =>
      prev.map((t) =>
        t.tourist._id === update.tourist_id
          ? {
              ...t,
              location: {
                ...t.location,
                latitude: update.latitude,
                longitude: update.longitude,
                timestamp: update.timestamp,
              },
            }
          : t
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="text-muted-foreground font-medium">
            {connectionStatus === "connecting"
              ? "Connecting to server..."
              : "Loading dashboard..."}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-yellow-600">
              Retry attempt {retryCount}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Shield className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Authority Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time tourist monitoring system
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500 animate-pulse"
                      : connectionStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {connectionStatus === "connected" && "Connected"}
                  {connectionStatus === "connecting" && "Connecting..."}
                  {connectionStatus === "error" &&
                    `Connection Error ${
                      retryCount > 0 ? `(Retry ${retryCount}/3)` : ""
                    }`}
                </span>
              </div>

              {/* Retry Button for connection errors */}
              {connectionStatus === "error" && (
                <button
                  onClick={() => {
                    setRetryCount(0);
                    fetchInitialData();
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}

              {/* Stats Pills */}
              <div className="hidden lg:flex items-center gap-3">
                {/* Active Tourists */}
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-full text-sm font-medium">
                  <Users className="w-4 h-4" />
                  <span className="hidden xl:inline">
                    {tourists.length} Active
                  </span>
                  <span className="xl:hidden">{tourists.length}</span>
                </div>

                {/* Active Alerts */}
                <div className="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-2 rounded-full text-sm font-medium shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]"></div>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden xl:inline">
                    {alerts.filter((a) => a.status !== "resolved").length}{" "}
                    Active Alerts
                  </span>
                  <span className="xl:hidden">
                    {alerts.filter((a) => a.status !== "resolved").length}
                  </span>
                </div>

                {/* Solved Alerts */}
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden xl:inline">
                    {alerts.filter((a) => a.status === "resolved").length}{" "}
                    Solved
                  </span>
                  <span className="xl:hidden">
                    {alerts.filter((a) => a.status === "resolved").length}
                  </span>
                </div>

                {dashboardStats && (
                  <>
                    <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Zap className="w-4 h-4" />
                      <span className="hidden xl:inline">
                        {dashboardStats.overview?.high_priority_alerts || 0}{" "}
                        High Priority
                      </span>
                      <span className="xl:hidden">
                        {dashboardStats.overview?.high_priority_alerts || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
                      <MapPin className="w-4 h-4" />
                      <span className="hidden xl:inline">
                        {dashboardStats.overview?.geofence_violations || 0}{" "}
                        Violations
                      </span>
                      <span className="xl:hidden">
                        {dashboardStats.overview?.geofence_violations || 0}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Top Section: Map and Alerts Side by Side on desktop, stacked on mobile */}
        <div className="flex flex-col lg:flex-row p-6 gap-6">
          {/* Map Section */}
          <div className="flex-1 h-[300px] lg:h-[400px]">
            <div className="h-full bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <InteractiveMap
                tourists={tourists}
                geofences={geofences}
                alerts={alerts}
                heatmapData={heatmapData} // Add heatmap data
                selectedTourist={selectedTourist}
                onTouristSelect={handleTouristSelect}
                center={[20.5937, 78.9629]} // Center of India coordinates
                zoom={5} // Zoomed out to show entire India
              />
            </div>
          </div>

          {/* Alerts Section */}
          <div className="w-full lg:w-96 flex flex-col h-[300px] lg:h-[400px]">
            <div className="bg-card rounded-xl shadow-sm border border-border h-full flex flex-col">
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Recent Alerts
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Live
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="h-full p-6 overflow-y-auto">
                  <div className="space-y-3">
                    {alerts.length > 0 ? (
                      alerts.slice(0, 10).map((alert) => (
                        <div
                          key={alert._id}
                          className={`p-4 rounded-lg border ${getAlertColor(
                            alert.type
                          )} transition-all hover:shadow-sm`}
                        >
                          {/* Alert header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-col gap-1">
                              {/* Type + Icon */}
                              <div className="flex items-center gap-2">
                                {getAlertIcon(alert.type)}
                                <span className="font-medium capitalize">
                                  {alert.type?.replace("_", " ") || "Unknown"}
                                </span>
                              </div>

                              {/* Tourist info */}
                              {alert.tourist_id && (
                                <>
                                  <div className="text-sm text-gray-600">
                                    <span className="font-semibold">
                                      Tourist:{" "}
                                    </span>
                                    {alert.tourist_id.name || "N/A"} (
                                    {alert.tourist_id.phone || "N/A"})
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    <span className="font-semibold">
                                      Email:{" "}
                                    </span>
                                    {alert.tourist_id.email || "N/A"}
                                  </div>
                                </>
                              )}

                              {/* Emergency contacts */}
                              {alert.tourist_id?.emergency_contacts?.length >
                                0 && (
                                <div className="mt-2">
                                  <span className="font-semibold text-gray-700">
                                    Emergency Contacts:
                                  </span>
                                  <ul className="ml-4 list-disc text-gray-600 text-sm">
                                    {alert.tourist_id.emergency_contacts.map(
                                      (c, idx) => (
                                        <li key={idx}>
                                          {c.name || "Unknown"} (
                                          {c.relationship || "N/A"}) -{" "}
                                          {c.phone || "N/A"}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-xs opacity-75 flex-shrink-0">
                              {alert.timestamp
                                ? new Date(alert.timestamp).toLocaleTimeString()
                                : "—"}
                            </span>
                          </div>

                          {/* Alert description */}
                          {alert.description && (
                            <p className="text-sm mb-3 leading-relaxed">
                              {alert.description}
                            </p>
                          )}

                          {/* Resolve button / status */}
                          {alert.status !== "resolved" ? (
                            <button
                              className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                              onClick={() => handleResolveAlert(alert._id)}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Resolved
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent alerts</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Tourist Details (Horizontal on desktop, stacked on mobile) */}
        {selectedTourist && (
          <div className="px-6 pb-6">
            <div className="bg-card rounded-xl shadow-sm border border-border">
              <div className="p-4 lg:p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Tourist Details
                  </h3>
                  {/* Mobile toggle button */}
                  <button
                    onClick={() => setShowTouristDetails(!showTouristDetails)}
                    className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Toggle tourist details"
                  >
                    {showTouristDetails ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Show details based on toggle state or always show on desktop */}
              <div
                className={`${
                  showTouristDetails ? "block" : "hidden"
                } lg:block p-4 lg:p-6`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {/* Debug Info - Remove in production */}
                  {/* {process.env.NODE_ENV === "development" && (
                    <div className="p-3 bg-gray-100 rounded-lg col-span-full">
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">
                          Debug: Tourist Data Structure
                        </summary>
                        <pre className="mt-2 overflow-auto max-h-32">
                          {JSON.stringify(
                            {
                              digitalId: selectedTourist.digital_id,
                              currentTrip: selectedTourist.current_trip,
                              qrCodes: selectedTourist.qr_codes,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </div>
                  )} */}

                  {/* Basic Info Column */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground text-lg border-b border-border pb-2">
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Name
                        </label>
                        <p className="text-foreground font-medium">
                          {selectedTourist.tourist?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Trip
                        </label>
                        <p className="text-foreground">
                          {selectedTourist.trip_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Digital ID
                        </label>
                        <p className="text-foreground font-mono text-sm">
                          {selectedTourist.digital_id?.[0]?.digital_id ||
                            selectedTourist.current_trip?.digital_id ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status
                        </label>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {selectedTourist.status || "Active"}
                        </span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="pt-4 border-t border-border">
                      <h5 className="font-medium text-foreground mb-3">
                        Contact Information
                      </h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedTourist.tourist?.phone || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-4 h-4 text-center text-muted-foreground">
                            @
                          </span>
                          <span>{selectedTourist.tourist?.email || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location & QR Code Column */}
                  <div className="space-y-4">
                    {/* Location */}
                    {selectedTourist.location && (
                      <div>
                        <h5 className="font-medium text-foreground mb-3 border-b border-border pb-2">
                          Current Location
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono">
                              {selectedTourist.location.latitude?.toFixed(4)},{" "}
                              {selectedTourist.location.longitude?.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {new Date(
                                selectedTourist.location.timestamp
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QR Code */}
                    <div className="pt-4 border-t border-border">
                      <h5 className="font-medium text-foreground mb-3">
                        Digital ID QR Code
                      </h5>

                      {/* QR Code Type Selector */}
                      {selectedTourist.qr_codes &&
                        Object.keys(selectedTourist.qr_codes).length > 1 && (
                          <div className="flex flex-wrap justify-center gap-2 mb-3">
                            {Object.keys(selectedTourist.qr_codes).map(
                              (qrType) => (
                                <button
                                  key={qrType}
                                  onClick={() => setSelectedQRType(qrType)}
                                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                    selectedQRType === qrType
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {qrType.replace("_", " ").toUpperCase()}
                                </button>
                              )
                            )}
                          </div>
                        )}

                      <div className="flex justify-center">
                        <img
                          src={generateQRCode(
                            selectedTourist.digital_id?.[0]?.digital_id ||
                              selectedTourist.current_trip?.digital_id ||
                              selectedTourist.trip_id,
                            selectedTourist.qr_codes,
                            selectedQRType
                          )}
                          alt="QR Code"
                          className="border border-border rounded-lg max-w-[150px] max-h-[150px]"
                          onError={(e) => {
                            // Fallback if QR code fails to load
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${
                              selectedTourist.digital_id?.[0]?.digital_id ||
                              selectedTourist.current_trip?.digital_id ||
                              "No-ID"
                            }`;
                          }}
                        />
                      </div>
                      {selectedTourist.qr_codes &&
                        Object.keys(selectedTourist.qr_codes).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground text-center">
                              Blockchain-generated QR Code (
                              {selectedQRType.replace("_", " ")})
                            </p>
                            {/* Show available QR code types */}
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                              {selectedTourist.qr_codes.digital_id && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Digital ID Available
                                </span>
                              )}
                              {selectedTourist.qr_codes.emergency && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                  Emergency Available
                                </span>
                              )}
                              {selectedTourist.qr_codes.verification && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Verification Available
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Emergency Contacts & Actions Column */}
                  <div className="space-y-4">
                    {/* Emergency Contacts */}
                    {selectedTourist.tourist?.emergency_contacts && (
                      <div>
                        <h5 className="font-medium text-foreground mb-3 border-b border-border pb-2">
                          Emergency Contacts
                        </h5>
                        <div className="space-y-3">
                          {selectedTourist.tourist.emergency_contacts.map(
                            (contact, index) => (
                              <div
                                key={index}
                                className="bg-muted p-3 rounded-lg"
                              >
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <strong>Name:</strong> {contact.name}
                                  </div>
                                  <div>
                                    <strong>Relationship:</strong>{" "}
                                    {contact.relationship}
                                  </div>
                                  <div>
                                    <strong>Phone:</strong> {contact.phone}
                                  </div>
                                  {contact.email && (
                                    <div>
                                      <strong>Email:</strong> {contact.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-border">
                      <h5 className="font-medium text-foreground mb-3">
                        Quick Actions
                      </h5>
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg hover:bg-destructive/90 transition-colors font-medium">
                          <Zap className="w-4 h-4" />
                          Send Emergency Alert
                        </button>
                        <button
                          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                          onClick={() =>
                            window.open(`tel:${selectedTourist.tourist?.phone}`)
                          }
                        >
                          <Phone className="w-4 h-4" />
                          Call Tourist
                        </button>
                        <button
                          className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-3 rounded-lg hover:bg-accent/90 transition-colors font-medium"
                          onClick={() => fetchActiveTourists()}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh Location
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* <TestControls
        onSimulateAlert={handleSimulateAlert}
        onSimulateLocationUpdate={handleSimulateLocationUpdate}
      /> */}
    </div>
  );
};

export default AuthorityDashboard;
