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
  const [locationInfo, setLocationInfo] = useState({}); // Store location info for each tourist
  const [loadingLocation, setLoadingLocation] = useState({}); // Track loading state for each tourist

  // Function to fetch location info using reverse geocoding
  const fetchLocationInfo = async (lat, lng, touristId) => {
    try {
      setLoadingLocation((prev) => ({ ...prev, [touristId]: true }));

      // Using OpenStreetMap's Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`
      );
      const data = await response.json();

      if (data && data.address) {
        const locationData = {
          area:
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.locality ||
            data.address.village ||
            data.address.town ||
            data.address.city_district ||
            data.address.city ||
            "Unknown Area",
          city:
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.municipality ||
            "Unknown City",
          state:
            data.address.state ||
            data.address.state_district ||
            "Unknown State",
          country: data.address.country || "Unknown Country",
          postcode: data.address.postcode || "",
          display_name: data.display_name || "Unknown Location",
        };

        setLocationInfo((prev) => ({
          ...prev,
          [touristId]: locationData,
        }));

        return locationData;
      }
    } catch (error) {
      console.error("Error fetching location info:", error);
      const fallbackData = {
        area: "Unknown Area",
        city: "Unknown City",
        state: "Unknown State",
        country: "Unknown Country",
        postcode: "",
        display_name: "Location unavailable",
      };

      setLocationInfo((prev) => ({
        ...prev,
        [touristId]: fallbackData,
      }));

      return fallbackData;
    } finally {
      setLoadingLocation((prev) => ({ ...prev, [touristId]: false }));
    }
  };

  // Preload location information for all tourists when they change
  useEffect(() => {
    const loadLocationInfo = async () => {
      const touristsToProcess = tourists.filter(
        (tourist) =>
          tourist.location &&
          tourist.location.latitude &&
          tourist.location.longitude &&
          !locationInfo[tourist.trip_id] && // Only fetch if not already cached
          !loadingLocation[tourist.trip_id] // Don't fetch if already loading
      );

      // Process tourists with a small delay between requests to avoid rate limiting
      for (let i = 0; i < touristsToProcess.length; i++) {
        const tourist = touristsToProcess[i];
        await fetchLocationInfo(
          tourist.location.latitude,
          tourist.location.longitude,
          tourist.trip_id
        );

        // Add a small delay between requests (except for the last one)
        if (i < touristsToProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
        }
      }
    };

    if (tourists.length > 0) {
      loadLocationInfo();
    }
  }, [tourists]); // Re-run when tourists data changes

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

  const handleTouristClick = async (tourist) => {
    onTouristSelect(tourist);
    if (tourist.location) {
      setMapCenter([tourist.location.latitude, tourist.location.longitude]);
      setMapZoom(15);

      // Fetch location info if not already cached
      if (!locationInfo[tourist.trip_id]) {
        await fetchLocationInfo(
          tourist.location.latitude,
          tourist.location.longitude,
          tourist.trip_id
        );
      }
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
              <div style={{ minWidth: "250px" }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#333",
                    fontSize: "16px",
                  }}
                >
                  {tourist.tourist?.name || "Tourist"}
                </h4>

                {/* Location Information */}
                {loadingLocation[tourist.trip_id] ? (
                  <div
                    style={{
                      background: "#f8f9fa",
                      padding: "8px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      border: "1px solid #e9ecef",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#6c757d" }}>
                      🔄 Loading location details...
                    </div>
                  </div>
                ) : locationInfo[tourist.trip_id] ? (
                  <div
                    style={{
                      background: "#f8f9fa",
                      padding: "8px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <h5
                      style={{
                        margin: "0 0 6px 0",
                        color: "#495057",
                        fontSize: "14px",
                      }}
                    >
                      📍 Current Location
                    </h5>
                    <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                      <div>
                        <strong>Area:</strong>{" "}
                        {locationInfo[tourist.trip_id].area}
                      </div>
                      <div>
                        <strong>City:</strong>{" "}
                        {locationInfo[tourist.trip_id].city}
                      </div>
                      <div>
                        <strong>State:</strong>{" "}
                        {locationInfo[tourist.trip_id].state}
                      </div>
                      {locationInfo[tourist.trip_id].postcode && (
                        <div>
                          <strong>Pincode:</strong>{" "}
                          {locationInfo[tourist.trip_id].postcode}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#fff3cd",
                      padding: "8px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      border: "1px solid #ffeaa7",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#856404" }}>
                      📍 Click to load location details
                    </div>
                  </div>
                )}

                {/* Trip Information */}
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Trip:</strong> {tourist.trip_name}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Status:</strong>
                    <span
                      style={{
                        background:
                          tourist.status === "emergency"
                            ? "#ffebee"
                            : "#e8f5e8",
                        color:
                          tourist.status === "emergency"
                            ? "#c62828"
                            : "#2e7d32",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        marginLeft: "4px",
                        fontSize: "12px",
                      }}
                    >
                      {tourist.status || "active"}
                    </span>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "13px" }}>
                    <strong>Destination:</strong> {tourist.destination}
                  </p>
                </div>

                {/* Coordinates */}
                <div
                  style={{
                    background: "#f1f3f4",
                    padding: "6px",
                    borderRadius: "4px",
                    marginBottom: "8px",
                  }}
                >
                  <p
                    style={{
                      margin: "2px 0",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  >
                    <strong>Coordinates:</strong>
                    <br />
                    {tourist.location.latitude.toFixed(6)},{" "}
                    {tourist.location.longitude.toFixed(6)}
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "12px" }}>
                    <strong>Last Update:</strong>
                    <br />
                    {new Date(tourist.location.timestamp).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleTouristClick(tourist)}
                  style={{
                    background: "#2196f3",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    width: "100%",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  View Full Details
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
