import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const getTouristMarkerColor = (status) => {
  switch (status) {
    case "emergency":
      return "#f44336";
    case "warning":
      return "#ff9800";
    default:
      return "#4caf50";
  }
};

const getAlertMarkerColor = (severity) => {
  switch (severity) {
    case "critical":
      return "#d32f2f"; // red
    case "high":
      return "#ff5722"; // orange
    case "medium":
      return "#ffb300"; // yellow
    default:
      return "#1976d2"; // blue for low
  }
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const InteractiveMap = ({
  tourists = [],
  geofences = [],
  alerts = [],
  selectedTourist,
  onTouristSelect,
  onMapClick,
  center = [28.6139, 77.209],
  zoom = 10,
}) => {
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);

  const getGeofenceColor = (riskLevel) => {
    switch (riskLevel) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      default:
        return "#4caf50";
    }
  };

  const handleTouristClick = (tourist) => {
    onTouristSelect(tourist);
    if (tourist.location) {
      setMapCenter([tourist.location.latitude, tourist.location.longitude]);
      setMapZoom(15);
    }
  };

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: "100%", width: "100%" }}
      key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      {/* Render geofences */}
      {geofences
        .filter((fence) => {
          const lat = fence.center_lat || fence.latitude;
          const lng = fence.center_lng || fence.longitude;
          return (
            lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
          );
        })
        .map((fence) => (
          <Circle
            key={fence._id}
            center={[
              fence.center_lat || fence.latitude,
              fence.center_lng || fence.longitude,
            ]}
            radius={(fence.radius || fence.radius_km || 1) * 1000}
            pathOptions={{
              color: getGeofenceColor(fence.risk_level),
              fillColor: getGeofenceColor(fence.risk_level),
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div>
                <h4>{fence.zone_name || fence.name}</h4>
                <p>
                  <strong>Risk Level:</strong> {fence.risk_level}
                </p>
                <p>
                  <strong>Type:</strong> {fence.zone_type}
                </p>
                <p>
                  <strong>Radius:</strong> {fence.radius || fence.radius_km} km
                </p>
                {fence.description && (
                  <p>
                    <strong>Description:</strong> {fence.description}
                  </p>
                )}
              </div>
            </Popup>
          </Circle>
        ))}

      {/* Render tourists */}
      {tourists
        .filter((tourist) => {
          return (
            tourist.location &&
            tourist.location.latitude !== undefined &&
            tourist.location.longitude !== undefined &&
            !isNaN(tourist.location.latitude) &&
            !isNaN(tourist.location.longitude)
          );
        })
        .map((tourist) => (
          <Marker
            key={tourist.trip_id}
            position={[tourist.location.latitude, tourist.location.longitude]}
            icon={createCustomIcon(getTouristMarkerColor(tourist.status))}
            eventHandlers={{
              click: () => handleTouristClick(tourist),
            }}
          >
            <Popup>
              <div>
                <h4>{tourist.tourist?.name || "Tourist"}</h4>
                <p>
                  <strong>Trip:</strong> {tourist.trip_name}
                </p>
                <p>
                  <strong>Status:</strong> {tourist.status || "active"}
                </p>
                <p>
                  <strong>Destination:</strong> {tourist.destination}
                </p>
                <p>
                  <strong>Last Update:</strong>{" "}
                  {new Date(tourist.location.timestamp).toLocaleString()}
                </p>
                <button
                  onClick={() => handleTouristClick(tourist)}
                  style={{
                    background: "#2196f3",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      {/* Render alerts */}
      {alerts
        .filter((alert) => alert.latitude && alert.longitude)
        .map((alert) => (
          <Marker
            key={alert._id}
            position={[alert.latitude, alert.longitude]}
            icon={createCustomIcon(getAlertMarkerColor(alert.severity))}
          >
            <Popup>
              <div>
                <h4>{alert.title}</h4>
                <p>
                  <strong>Type:</strong> {alert.type}
                </p>
                <p>
                  <strong>Severity:</strong> {alert.severity}
                </p>
                <p>
                  <strong>Status:</strong> {alert.status}
                </p>
                <p>
                  <strong>Reported At:</strong>{" "}
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
                {alert.tourist_id?.name && (
                  <p>
                    <strong>Tourist:</strong> {alert.tourist_id.name} (
                    {alert.tourist_id.phone})
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
};

export default InteractiveMap;
