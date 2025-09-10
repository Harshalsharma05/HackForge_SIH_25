import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaRoute,
  FaShieldAlt,
  FaQrcode,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaBell,
  FaPhone,
  FaCog,
  FaSignOutAlt,
  FaPlus,
  FaEye,
  FaHistory,
  FaLocationArrow,
  FaUserShield,
  FaHeartbeat,
  FaWifi,
  FaBatteryFull,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import EmergencyPanel from "../components/EmergencyPanel";
import TripPlanner from "../components/TripPlanner";
import QRCodeGenerator from "../components/QRCodeGenerator";
// import LocationTracker from '../components/LocationTracker';
// import SafetyAlerts from '../components/SafetyAlerts';
// import TripHistory from '../components/TripHistory';
import api, { tripAPI, alertsAPI } from "../services/api";
import "./TouristDashboard.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const TouristDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalTrips: 0,
    activeTrip: null,
    safetyScore: 95,
    lastUpdate: new Date(),
  });
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [locationStatus, setLocationStatus] = useState({
    enabled: false,
    accuracy: 0,
    lastUpdate: null,
  });

  // Navigation tabs configuration
  const navigationTabs = [
    { id: "overview", label: "Overview", icon: FaUser },
    { id: "trips", label: "My Trips", icon: FaRoute },
    { id: "safety", label: "Safety Center", icon: FaShieldAlt },
    { id: "digital-id", label: "Digital ID", icon: FaQrcode },
    { id: "emergency", label: "Emergency", icon: FaExclamationTriangle },
    { id: "settings", label: "Settings", icon: FaCog },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load current trip
      const currentTripResponse = await tripAPI.getCurrentTrip();
      if (currentTripResponse.data.success && currentTripResponse.data.data) {
        setCurrentTrip(currentTripResponse.data.data);
      }

      // Load trip history count
      const tripsResponse = await tripAPI.getTouristTrips({ limit: 100 });
      if (tripsResponse.data.success) {
        setDashboardStats((prev) => ({
          ...prev,
          totalTrips: tripsResponse.data.data.trips?.length || 0,
          activeTrip: currentTripResponse.data.data,
        }));
      }

      // Set emergency contacts from user data
      if (user?.emergency_contacts) {
        setEmergencyContacts(user.emergency_contacts);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePanicClick = async () => {
    if (!user) {
      toast.error("❌ User not logged in");
      return;
    }

    if (!currentTrip || !currentTrip.digital_id) {
      toast.error("❌ Digital ID not available for current trip");
      return;
    }

    let latitude = null;
    let longitude = null;

    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        );
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        console.warn("Geolocation not available or denied:", error);
        toast.warning("⚠️ Geolocation not available");
      }
    }

    try {
      const payload = { smart_contract_id: currentTrip.digital_id };
      if (latitude && longitude) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }

      const response = await axios.post(
        "http://localhost:3000/api/v1/alert/panic",
        payload
      );

      console.log("SOS Alert Response:", response.data);
      toast.success("🚨 SOS Alert triggered successfully!");
    } catch (error) {
      console.error(
        "Error triggering SOS:",
        error.response?.data || error.message
      );
      toast.error("❌ Failed to trigger SOS");
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="welcome-header">
        <div className="user-avatar">
          <FaUser />
        </div>
        <div className="welcome-text">
          <h2>Welcome back, {user?.name || "Tourist"}!</h2>
          <p>Stay safe and enjoy your travels with SafeTour</p>
        </div>
        <div className="status-indicators">
          <div
            className={`status-item ${
              locationStatus.enabled ? "active" : "inactive"
            }`}
          >
            <FaLocationArrow />
            <span>Location</span>
          </div>
          <div className="status-item active">
            <FaWifi />
            <span>Connected</span>
          </div>
          <div className="status-item active">
            <FaBatteryFull />
            <span>Battery OK</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaRoute />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.totalTrips}</h3>
            <p>Total Trips</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon safety">
            <FaShieldAlt />
          </div>
          <div className="stat-content">
            <h3>{dashboardStats.safetyScore}%</h3>
            <p>Safety Score</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emergency">
            <FaHeartbeat />
          </div>
          <div className="stat-content">
            <h3>{emergencyContacts.length}</h3>
            <p>Emergency Contacts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon location">
            <FaMapMarkerAlt />
          </div>
          <div className="stat-content">
            <h3>{locationStatus.enabled ? "Active" : "Inactive"}</h3>
            <p>Location Tracking</p>
          </div>
        </div>
      </div>

      {currentTrip && (
        <div className="current-trip-card">
          <div className="trip-header">
            <h3>Current Trip</h3>
            <span className={`trip-status ${currentTrip.status}`}>
              {currentTrip.status}
            </span>
          </div>
          <div className="trip-details">
            <div className="trip-info">
              <h4>{currentTrip.destination}</h4>
              <p>{currentTrip.purpose}</p>
              <div className="trip-dates">
                <span>
                  Start:{" "}
                  {new Date(
                    currentTrip.planned_start_date
                  ).toLocaleDateString()}
                </span>
                <span>
                  End:{" "}
                  {new Date(currentTrip.planned_end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="trip-actions">
              <button
                className="btn-primary"
                onClick={() => setActiveTab("digital-id")}
              >
                <FaQrcode /> View Digital ID
              </button>
              <button
                className="btn-secondary"
                onClick={() => setActiveTab("trips")}
              >
                <FaEye /> Trip Details
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button
            className="action-btn plan-trip"
            onClick={() => setActiveTab("trips")}
          >
            <FaPlus />
            <span>Plan New Trip</span>
          </button>

          <button
            className="action-btn emergency"
            onClick={() => setActiveTab("emergency")}
          >
            <FaExclamationTriangle />
            <span>Emergency Help</span>
          </button>

          <button
            className="action-btn digital-id"
            onClick={() => setActiveTab("digital-id")}
          >
            <FaQrcode />
            <span>Show Digital ID</span>
          </button>

          <button
            className="action-btn safety"
            onClick={() => setActiveTab("safety")}
          >
            <FaShieldAlt />
            <span>Safety Center</span>
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">
              <FaRoute />
            </div>
            <div className="activity-content">
              <p>Trip to {currentTrip?.destination || "Jaipur"} started</p>
              <span>2 hours ago</span>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon safety">
              <FaShieldAlt />
            </div>
            <div className="activity-content">
              <p>Safety check completed successfully</p>
              <span>1 day ago</span>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon location">
              <FaMapMarkerAlt />
            </div>
            <div className="activity-content">
              <p>Location shared with emergency contacts</p>
              <span>1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "trips":
        return (
          <TripPlanner
            currentTrip={currentTrip}
            onTripUpdate={loadDashboardData}
          />
        );
      case "safety":
        return (
          <div className="safety-section">
            <h2>Safety Alerts</h2>
            <div className="alert-placeholder">
              <FaShieldAlt className="placeholder-icon" />
              <p>Safety alerts component coming soon...</p>
            </div>
          </div>
        );
      case "digital-id":
        return <QRCodeGenerator currentTrip={currentTrip} user={user} />;
      case "emergency":
        return (
          <div className="emergency-section">
            <h2>Emergency Center</h2>
            <div className="emergency-placeholder">
              <FaExclamationTriangle className="placeholder-icon" />
              <p>Emergency management coming soon...</p>
              <button
                className="btn-danger"
                onClick={() => setShowEmergencyPanel(true)}
              >
                <FaExclamationTriangle /> Activate Emergency Alert
              </button>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="settings-section">
            <h2>Settings</h2>
            <div className="settings-grid">
              <div className="setting-group">
                <h3>Privacy & Security</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Share location with emergency contacts
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable automatic safety alerts
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" />
                    Allow family tracking
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>Notifications</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Emergency notifications
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Trip reminders
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" />
                    Marketing notifications
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>Account</h3>
                <button className="btn-secondary">Update Profile</button>
                <button className="btn-secondary">Change Password</button>
                <button className="btn-danger">Delete Account</button>
              </div>
            </div>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="tourist-dashboard">
      {/* Location Tracker Component - Coming Soon */}
      {/* <LocationTracker 
        onLocationUpdate={setLocationStatus}
        isEnabled={currentTrip?.status === 'active'}
      /> */}

      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="header-left">
            <h1>SafeTour Dashboard</h1>
            <span className="user-status">Tourist • {user?.name || "User"}</span>
          </div>

          <div className="header-right">
            <button className="notification-btn">
              <FaBell />
              <span className="notification-badge">3</span>
            </button>

            <div className="user-menu">
              <button className="user-avatar-btn">
                <FaUser />
              </button>
              <div className="user-dropdown">
                <a href="#profile">Profile</a>
                <a href="#settings" onClick={() => setActiveTab("settings")}>
                  Settings
                </a>
                <a href="#help">Help</a>
                <button onClick={logout}>
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="dashboard-nav">
        <div className="nav-tabs">
          {navigationTabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">{renderContent()}</main>

      {/* Emergency Quick Access */}
      <div className="dashboard">
        {/* Your other components */}

        <div className="emergency-fab">
          <button className="emergency-btn" onClick={handlePanicClick}>
            <FaExclamationTriangle />
          </button>
        </div>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>

      {/* Emergency Panel Modal */}
      <EmergencyPanel
        isOpen={showEmergencyPanel}
        onClose={() => setShowEmergencyPanel(false)}
      />
    </div>
  );
};

export default TouristDashboard;
