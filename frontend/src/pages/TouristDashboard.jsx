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
  const [allTrips, setAllTrips] = useState([]);
  const [locationStatus, setLocationStatus] = useState({
    enabled: false,
    accuracy: 0,
    lastUpdate: null,
  });

  // Format date helper function
  const formatDate = (date) => {
    if (!date) return "Not set";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Not set";
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Not set";
    }
  };

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
        const trips = tripsResponse.data.data.trips || [];
        setAllTrips(trips);
        setDashboardStats((prev) => ({
          ...prev,
          totalTrips: trips.length,
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
          <p>Stay safe and enjoy your travels with Trayana</p>
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
          {/* <div className="status-item active">
            <FaBatteryFull />
            <span>Battery OK</span>
          </div> */}
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
            <h3>{dashboardStats.safetyScore}</h3>
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

        {/* <div className="stat-card">
          <div className="stat-icon location">
            <FaMapMarkerAlt />
          </div>
          <div className="stat-content">
            <h3>{locationStatus.enabled ? "Active" : "Inactive"}</h3>
            <p>Location Tracking</p>
          </div>
        </div> */}
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
                <span>Start: {formatDate(currentTrip.planned_start_date)}</span>
                <span>End: {formatDate(currentTrip.planned_end_date)}</span>
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

      {/* <div className="quick-actions">
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
      </div> */}

      {/* Trips Preview Section */}
      <div className="trips-preview">
        <div className="trips-preview-header">
          <h3>Your Trips</h3>
          <button
            className="view-all-btn"
            onClick={() => setActiveTab("trips")}
          >
            View All
          </button>
        </div>
        <div className="trips-horizontal-scroll">
          {allTrips.length > 0 ? (
            allTrips.slice(0, 5).map((trip) => (
              <div key={trip._id} className="trip-preview-card">
                <div className="trip-preview-header">
                  <h4>{trip.destination}</h4>
                  <span className={`trip-status-small ${trip.status}`}>
                    {trip.status}
                  </span>
                </div>
                <div className="trip-preview-content">
                  <p className="trip-purpose">{trip.purpose}</p>
                  <div className="trip-preview-dates">
                    <span>{formatDate(trip.planned_start_date)}</span>
                    <span>to</span>
                    <span>{formatDate(trip.planned_end_date)}</span>
                  </div>
                  <button
                    className="trip-preview-action"
                    onClick={() => setActiveTab("trips")}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-trips-preview">
              <FaRoute className="no-trips-icon" />
              <p>No trips planned yet</p>
              <button
                className="plan-first-trip-btn"
                onClick={() => setActiveTab("trips")}
              >
                Plan Your First Trip
              </button>
            </div>
          )}
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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Location Tracker Component - Coming Soon */}
      {/* <LocationTracker 
        onLocationUpdate={setLocationStatus}
        isEnabled={currentTrip?.status === 'active'}
      /> */}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left side - Logo and title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FaRoute className="text-white text-xl" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Trayana Dashboard
                </h1>
                <p className="text-white/80 text-sm">
                  Tourist • {user?.name || "User"}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-white">Trayana</h1>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 sm:p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 hover:scale-105 group">
                  <FaBell className="text-white text-lg sm:text-xl" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold animate-pulse">
                    3
                  </span>
                </button>
              </div>

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 sm:p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 hover:scale-105">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/30 rounded-lg flex items-center justify-center">
                    <FaUser className="text-white text-sm sm:text-base" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-white font-medium text-sm">
                      {user?.name || "User"}
                    </p>
                    <p className="text-white/70 text-xs">Tourist</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <FaUser className="text-gray-400" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <FaCog className="text-gray-400" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={logout}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <FaSignOutAlt className="text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-16 sm:top-20 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-4 min-w-[80px] sm:min-w-[100px] transition-all duration-200 border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-indigo-600 border-indigo-600 bg-indigo-50"
                    : "text-gray-600 border-transparent hover:text-indigo-600 hover:border-indigo-300 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon
                  className={`text-lg sm:text-xl mb-1 ${
                    activeTab === tab.id ? "text-indigo-600" : "text-gray-500"
                  }`}
                />
                <span className="text-xs sm:text-sm font-medium">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {renderContent()}
      </main>

      {/* Emergency Quick Access */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handlePanicClick}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-110 active:scale-95"
        >
          <FaExclamationTriangle className="text-xl sm:text-2xl animate-pulse group-hover:animate-none" />
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
        className="mt-20"
      />

      {/* Emergency Panel Modal */}
      <EmergencyPanel
        isOpen={showEmergencyPanel}
        onClose={() => setShowEmergencyPanel(false)}
      />
    </div>
  );
};

export default TouristDashboard;
