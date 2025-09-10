import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useRealTimeUpdates } from "../hooks/useRealTimeUpdates";
import InteractiveMap from "../components/InteractiveMap";
import NotificationSystem from "../components/NotificationSystem";
import TestControls from "../components/TestControls";
import "leaflet/dist/leaflet.css";
import "./AuthorityDashboard.css";

const AuthorityDashboard = () => {
  const { user, logout } = useAuth();
  const [geofences, setGeofences] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Real-time updates
  const [ws, setWs] = useState(null);

  useEffect(() => {
    fetchInitialData();
    // setupWebSocket();

    // Set up polling for real-time updates
    const interval = setInterval(fetchLiveData, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchActiveTourists(),
        fetchGeofences(),
        fetchRecentAlerts(),
      ]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      await Promise.all([fetchActiveTourists(), fetchRecentAlerts()]);
    } catch (error) {
      console.error("Error fetching live data:", error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setDashboardStats(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const fetchActiveTourists = async () => {
    try {
      const response = await api.get("/dashboard/active-tourists");
      console.log("Active tourists response:", response.data);
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

      console.log("Valid tourists:", validTourists);
      setTourists(validTourists);
    } catch (error) {
      console.error("Error fetching active tourists:", error);
      setTourists([]);
    }
  };

  const fetchGeofences = async () => {
    try {
      const response = await api.get("/dashboard/geofences");
      console.log("Geofences response:", response.data);
      const geofencesData = response.data.data?.geofences || [];

      // Filter out geofences with invalid coordinates
      const validGeofences = geofencesData.filter((fence) => {
        const lat = fence.center_lat || fence.latitude;
        const lng = fence.center_lng || fence.longitude;
        return (
          lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
        );
      });

      console.log("Valid geofences:", validGeofences);
      setGeofences(validGeofences);
    } catch (error) {
      console.error("Error fetching geofences:", error);
      setGeofences([]);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const response = await api.get("/dashboard/alerts");
      console.log("Alerts response:", response.data);
      setAlerts(response.data.data?.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts([]);
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

  const handleTouristSelect = async (tourist) => {
    setSelectedTourist(tourist);

    // Fetch additional details if needed
    try {
      const details = await fetchTouristDetails(tourist.tourist._id);
      if (details) {
        setSelectedTourist((prev) => ({ ...prev, ...details }));
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

  const generateQRCode = (digitalId) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${digitalId}`;
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
      <div className="authority-dashboard">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="authority-dashboard">
      <NotificationSystem
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <div className="dashboard-header">
        <h1>Authority Dashboard</h1>
        <div className="stats">
          <span>Active Tourists: {tourists.length}</span>
          <span>Active Alerts: {alerts.filter((a) => !a.resolved).length}</span>
          {dashboardStats && (
            <>
              <span>
                High Priority:{" "}
                {dashboardStats.overview?.high_priority_alerts || 0}
              </span>
              <span>
                Geofence Violations:{" "}
                {dashboardStats.overview?.geofence_violations || 0}
              </span>
            </>
          )}
          <button
            onClick={logout}
            style={{
              marginLeft: "20px",
              padding: "8px 16px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="map-section">
          <InteractiveMap
            tourists={tourists}
            geofences={geofences}
            selectedTourist={selectedTourist}
            onTouristSelect={handleTouristSelect}
            center={[28.6139, 77.209]}
            zoom={10}
          />
        </div>

        <div className="sidebar">
          <div className="alerts-section">
            <h3>Recent Alerts</h3>
            <div className="alerts-list">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className={`alert-item ${alert.type}`}>
                  <div className="alert-header">
                    <span className="alert-type">{alert.type}</span>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{alert.description}</p>
                  {!alert.resolved && (
                    <button className="resolve-btn">Mark Resolved</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedTourist && (
            <div className="tourist-details">
              <h3>Tourist Details</h3>
              <div className="tourist-info">
                <p>
                  <strong>Name:</strong>{" "}
                  {selectedTourist.tourist?.name || "N/A"}
                </p>
                <p>
                  <strong>Trip:</strong> {selectedTourist.trip_name || "N/A"}
                </p>
                <p>
                  <strong>Digital ID:</strong>{" "}
                  {selectedTourist.digital_id?.[0]?.digital_id || "N/A"}
                </p>
                <p>
                  <strong>Destination:</strong>{" "}
                  {selectedTourist.destination || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {selectedTourist.status || "N/A"}
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  {selectedTourist.tourist?.phone || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {selectedTourist.tourist?.email || "N/A"}
                </p>
                <p>
                  <strong>Nationality:</strong>{" "}
                  {selectedTourist.tourist?.nationality || "N/A"}
                </p>

                {selectedTourist.location && (
                  <>
                    <p>
                      <strong>Location:</strong>{" "}
                      {selectedTourist.location.latitude?.toFixed(4)},{" "}
                      {selectedTourist.location.longitude?.toFixed(4)}
                    </p>
                    <p>
                      <strong>Last Update:</strong>{" "}
                      {new Date(
                        selectedTourist.location.timestamp
                      ).toLocaleString()}
                    </p>
                  </>
                )}

                <div className="qr-section">
                  <h4>Digital ID QR Code</h4>
                  <img
                    src={generateQRCode(
                      selectedTourist.digital_id?.[0]?.digital_id ||
                        selectedTourist.trip_id
                    )}
                    alt="QR Code"
                    className="qr-code"
                  />
                </div>

                <div className="emergency-contacts">
                  <h4>Emergency Contacts</h4>
                  {selectedTourist.tourist?.emergency_contacts?.map(
                    (contact, index) => (
                      <div key={index} className="contact-item">
                        <p>
                          <strong>Name:</strong> {contact.name}
                        </p>
                        <p>
                          <strong>Relationship:</strong> {contact.relationship}
                        </p>
                        <p>
                          <strong>Phone:</strong> {contact.phone}
                        </p>
                        {contact.email && (
                          <p>
                            <strong>Email:</strong> {contact.email}
                          </p>
                        )}
                      </div>
                    )
                  ) || <p>No emergency contacts available</p>}
                </div>

                <div className="actions">
                  <button className="emergency-btn">
                    Send Emergency Alert
                  </button>
                  <button
                    className="contact-btn"
                    onClick={() =>
                      window.open(`tel:${selectedTourist.tourist?.phone}`)
                    }
                  >
                    Call Tourist
                  </button>
                  <button
                    className="location-btn"
                    onClick={() => fetchActiveTourists()}
                  >
                    Refresh Location
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TestControls
        onSimulateAlert={handleSimulateAlert}
        onSimulateLocationUpdate={handleSimulateLocationUpdate}
      />
    </div>
  );
};

export default AuthorityDashboard;
