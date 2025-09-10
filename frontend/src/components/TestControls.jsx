import { useState } from "react";
import locationService from "../services/locationService";

const TestControls = ({ onSimulateAlert, onSimulateLocationUpdate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTouristId, setSelectedTouristId] = useState("");
  const [latInput, setLatInput] = useState("28.6139");
  const [lngInput, setLngInput] = useState("77.2090");

  const simulateEmergencyAlert = () => {
    const alert = {
      _id: `alert_${Date.now()}`,
      type: "panic",
      severity: "critical",
      description:
        "Tourist pressed panic button - immediate assistance required",
      timestamp: new Date().toISOString(),
      resolved: false,
      tourist_id: "tourist_001",
    };
    onSimulateAlert(alert);
  };

  const simulateGeofenceAlert = () => {
    const alert = {
      _id: `alert_${Date.now()}`,
      type: "geofence_violation",
      severity: "high",
      description: "Tourist entered high-risk danger zone",
      timestamp: new Date().toISOString(),
      resolved: false,
      tourist_id: "tourist_002",
    };
    onSimulateAlert(alert);
  };

  const simulateLocationUpdate = () => {
    const update = {
      tourist_id: "tourist_001",
      latitude: 28.6139 + (Math.random() - 0.5) * 0.01,
      longitude: 77.209 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString(),
    };
    onSimulateLocationUpdate(update);
  };

  const simulateSpecificLocationUpdate = async () => {
    if (!selectedTouristId || !latInput || !lngInput) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const lat = parseFloat(latInput);
      const lng = parseFloat(lngInput);

      // Simulate location update via backend
      await locationService.simulateLocationUpdate(selectedTouristId, lat, lng);

      // Also update the frontend immediately
      const update = {
        tourist_id: selectedTouristId,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
      };

      onSimulateLocationUpdate(update);

      alert("Location updated successfully!");
    } catch (error) {
      console.error("Error simulating location update:", error);
      alert("Error updating location. Check console for details.");
    }
  };

  const presetLocations = [
    { name: "Delhi - India Gate", lat: 28.6129, lng: 77.2295 },
    { name: "Delhi - Red Fort", lat: 28.6562, lng: 77.241 },
    { name: "Delhi - Lotus Temple", lat: 28.5535, lng: 77.2588 },
    { name: "Mumbai - Gateway of India", lat: 18.922, lng: 72.8347 },
    { name: "Goa - Beach Area", lat: 15.2993, lng: 74.124 },
  ];

  const setPresetLocation = (lat, lng) => {
    setLatInput(lat.toString());
    setLngInput(lng.toString());
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          background: "#2196f3",
          color: "white",
          border: "none",
          padding: "10px 15px",
          borderRadius: "50px",
          cursor: "pointer",
          zIndex: 1000,
          fontSize: "12px",
        }}
      >
        🧪 Test Controls
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
        minWidth: "300px",
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <strong>Test Controls</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
          Simulate Alerts
        </h4>
        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
          <button
            onClick={simulateEmergencyAlert}
            style={{
              background: "#f44336",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Emergency Alert
          </button>

          <button
            onClick={simulateGeofenceAlert}
            style={{
              background: "#ff9800",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Geofence Alert
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
          Random Location Update
        </h4>
        <button
          onClick={simulateLocationUpdate}
          style={{
            width: "100%",
            background: "#4caf50",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Random Location Update
        </button>
      </div>

      <div>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
          Specific Location Update
        </h4>

        <div style={{ marginBottom: "8px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}
          >
            Tourist/Trip ID:
          </label>
          <input
            type="text"
            value={selectedTouristId}
            onChange={(e) => setSelectedTouristId(e.target.value)}
            placeholder="Enter trip ID"
            style={{
              width: "100%",
              padding: "6px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
              }}
            >
              Latitude:
            </label>
            <input
              type="number"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              step="0.0001"
              style={{
                width: "100%",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
              }}
            >
              Longitude:
            </label>
            <input
              type="number"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              step="0.0001"
              style={{
                width: "100%",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "8px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontSize: "12px" }}
          >
            Quick Locations:
          </label>
          <select
            onChange={(e) => {
              const [lat, lng] = e.target.value.split(",");
              if (lat && lng)
                setPresetLocation(parseFloat(lat), parseFloat(lng));
            }}
            style={{
              width: "100%",
              padding: "6px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select a location...</option>
            {presetLocations.map((loc, index) => (
              <option key={index} value={`${loc.lat},${loc.lng}`}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={simulateSpecificLocationUpdate}
          style={{
            width: "100%",
            background: "#673ab7",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Update Specific Location
        </button>
      </div>
    </div>
  );
};

export default TestControls;
