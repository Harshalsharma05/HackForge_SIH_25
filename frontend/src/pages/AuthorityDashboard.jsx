"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import InteractiveMap from "../components/InteractiveMap";
import NotificationSystem from "../components/NotificationSystem";
import TestControls from "../components/TestControls";
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
      const response = await fetch("http://localhost:3000/api/v1/fetchalerts", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      console.log("Recent alerts response:", data);

      // Correctly extract alerts array
      const alertsArray = Array.isArray(data?.data?.alerts)
        ? data.data.alerts
        : [];
      setAlerts(alertsArray);
    } catch (error) {
      console.error("Error fetching recent alerts:", error);
      setAlerts([]);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/fetchalerts/${alertId}/resolve`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();

      if (data.success) {
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
            Loading dashboard...
          </p>
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
              {/* Stats Pills */}
              <div className="hidden md:flex items-center gap-3">
                {/* Active Tourists */}
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-full text-sm font-medium">
                  <Users className="w-4 h-4" />
                  {tourists.length} Active
                </div>

                {/* Active Alerts */}
                <div className="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-2 rounded-full text-sm font-medium shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]"></div>
                  <AlertTriangle className="w-4 h-4" />
                  {alerts.filter((a) => a.status !== "resolved").length} Active
                  Alerts
                </div>

                {/* Solved Alerts */}
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  {alerts.filter((a) => a.status === "resolved").length} Solved
                </div>

                {dashboardStats && (
                  <>
                    <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Zap className="w-4 h-4" />
                      {dashboardStats.overview?.high_priority_alerts || 0} High
                      Priority
                    </div>
                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
                      <MapPin className="w-4 h-4" />
                      {dashboardStats.overview?.geofence_violations || 0}{" "}
                      Violations
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Map Section */}
        <div className="flex-1 p-6">
          <div className="h-full bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <InteractiveMap
              tourists={tourists}
              geofences={geofences}
              alerts={alerts}
              selectedTourist={selectedTourist}
              onTouristSelect={handleTouristSelect}
              center={[28.6139, 77.209]}
              zoom={10}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 p-6 pl-0 flex flex-col gap-6">
          {/* Alerts Section */}
          <div className="bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
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

            <div className="p-6 max-h-80 overflow-y-auto">
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
                                <span className="font-semibold">Tourist: </span>
                                {alert.tourist_id.name || "N/A"} (
                                {alert.tourist_id.phone || "N/A"})
                              </div>
                              <div className="text-sm text-gray-500">
                                <span className="font-semibold">Email: </span>
                                {alert.tourist_id.email || "N/A"}
                              </div>
                            </>
                          )}

                          {/* Emergency contacts */}
                          {alert.tourist_id?.emergency_contacts?.length > 0 && (
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
                        <span className="text-xs opacity-75">
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
                      {/* Resolve button / Resolved status */}
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

          {/* Tourist Details */}
          {selectedTourist && (
            <div className="bg-card rounded-xl shadow-sm border border-border flex-1">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  Tourist Details
                </h3>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-3">
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
                        {selectedTourist.digital_id?.[0]?.digital_id || "N/A"}
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
                    <h4 className="font-medium text-foreground mb-3">
                      Contact Information
                    </h4>
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

                  {/* Location */}
                  {selectedTourist.location && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">
                        Current Location
                      </h4>
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
                    <h4 className="font-medium text-foreground mb-3">
                      Digital ID QR Code
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={generateQRCode(
                          selectedTourist.digital_id?.[0]?.digital_id ||
                            selectedTourist.trip_id
                        )}
                        alt="QR Code"
                        className="border border-border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  {selectedTourist.tourist?.emergency_contacts && (
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">
                        Emergency Contacts
                      </h4>
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
