import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import heatmap plugin
import "leaflet.heat";

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Smaller alert icons to match geofence scale
const createAlertIcon = (color, alertType) => {
  const iconSymbol = alertType === 'panic' ? '⚠️' : alertType === 'anomaly' ? '🚨' : '🔔';
  return L.divIcon({
    className: "alert-marker",
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 8px;">${iconSymbol}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

// Heatmap Component
const HeatmapLayer = ({ heatmapData }) => {
  const map = useMap();

  useEffect(() => {
    console.log('🔥 Heatmap useEffect called with data:', heatmapData);
    console.log('🔥 Map object:', map);
    console.log('🔥 Map container:', map.getContainer());
    console.log('🔥 Map size:', map.getSize());
    
    if (!heatmapData || heatmapData.length === 0) {
      console.log('❌ No heatmap data available');
      return;
    }
    
    let heatLayer = null;
    
    // Wait for map to be fully loaded and sized
    const timeout = setTimeout(() => {
      const container = map.getContainer();
      console.log('🔥 Container dimensions:', {
        offsetHeight: container.offsetHeight,
        offsetWidth: container.offsetWidth,
        clientHeight: container.clientHeight,
        clientWidth: container.clientWidth
      });
      
      if (container.offsetHeight > 0 && container.offsetWidth > 0) {
        try {
          // Convert heatmap data to leaflet.heat format
          const heatPoints = heatmapData.map(point => [
            parseFloat(point.lat),
            parseFloat(point.lng),
            parseFloat(point.intensity || 1.0) // Intensity value
          ]);

          console.log('🔥 Final heatmap points for rendering:', heatPoints);

          heatLayer = L.heatLayer(heatPoints, {
            radius: 35,     // Even larger radius
            blur: 35,       // More blur
            maxZoom: 18,
            minOpacity: 0.5, // Higher minimum opacity
            max: 1.0,
            gradient: {
              0.4: 'blue',
              0.6: 'cyan', 
              0.7: 'lime',
              0.8: 'yellow',
              1.0: 'red'
            }
          });
          
          console.log('🔥 Created heatLayer:', heatLayer);
          
          map.addLayer(heatLayer);
          console.log('🔥 Heatmap layer added successfully with enhanced visibility');
          console.log('🔥 Map layers after adding heatmap:', map._layers);
          
        } catch (error) {
          console.error('❌ Error adding heatmap:', error);
        }
      } else {
        console.log('❌ Map container not ready for heatmap - dimensions:', {
          height: container.offsetHeight,
          width: container.offsetWidth
        });
      }
    }, 100); // Increased timeout
    
    return () => {
      clearTimeout(timeout);
      if (heatLayer && map.hasLayer(heatLayer)) {
        console.log('🧹 Removing heatmap layer');
        map.removeLayer(heatLayer);
      }
    };
  }, [heatmapData, map]);

  return null;
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
  heatmapData = [], // Add heatmap data prop
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

      // Use backend geocoding endpoint to avoid CORS issues
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `http://localhost:3000/api/v1/geocoding/reverse?lat=${lat}&lng=${lng}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const data = result.data;

      if (data) {
        const locationData = {
          area: data.area,
          city: data.city,
          state: data.state,
          country: data.country,
          display_name: data.display_name,
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
      case "critical":
        return "#d32f2f"; // Dark red
      case "high":
        return "#f44336"; // Red
      case "medium":
        return "#ff9800"; // Orange
      case "low":
        return "#2196f3"; // Blue
      case "very_low":
        return "#4caf50"; // Green
      default:
        return "#9e9e9e"; // Gray for unknown
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

      {/* Add Heatmap Layer */}
      <HeatmapLayer heatmapData={heatmapData} />

      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      {/* Render geofences */}
      {(() => {
        const validGeofences = geofences.filter((fence) => {
          const lat = fence.center_lat || fence.latitude;
          const lng = fence.center_lng || fence.longitude;
          const isValid = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);
          
          if (!isValid) {
            console.log('🚫 Invalid geofence:', {
              id: fence._id,
              name: fence.name,
              center_lat: fence.center_lat,
              latitude: fence.latitude,
              center_lng: fence.center_lng,
              longitude: fence.longitude,
              computed_lat: lat,
              computed_lng: lng
            });
          }
          
          return isValid;
        });
        
        console.log(`✅ Rendering ${validGeofences.length} valid geofences out of ${geofences.length} total`);
        
        return validGeofences.map((fence) => (
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
        ));
      })()}

      {/* Render tourists */}
      {(() => {
        console.log('🧑‍🎤 Total tourists received in InteractiveMap:', tourists.length);
        console.log('🧑‍🎤 Raw tourists data:', tourists);
        
        const filteredTourists = tourists.filter((tourist) => {
          const hasLocation = tourist.location &&
            tourist.location.latitude !== undefined &&
            tourist.location.longitude !== undefined &&
            !isNaN(tourist.location.latitude) &&
            !isNaN(tourist.location.longitude);
          
          if (!hasLocation) {
            console.log('❌ Tourist filtered out (no valid location):', tourist);
          } else {
            console.log('✅ Valid tourist for rendering:', {
              id: tourist.trip_id,
              name: tourist.tourist?.name,
              location: tourist.location,
              status: tourist.status
            });
          }
          
          return hasLocation;
        });
        
        console.log('🎯 Tourists to render on map:', filteredTourists.length);
        
        return filteredTourists.map((tourist) => (
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
        ));
      })()}

      {/* Render alerts */}
      {(() => {
        console.log('🚨 Total alerts for map rendering:', alerts.length);
        console.log('🚨 Alert data sample:', alerts.slice(0, 2));
        
        const alertsWithLocation = alerts.filter((alert) => {
          const hasLocation = (alert.latitude && alert.longitude) || 
                             (alert.location?.latitude && alert.location?.longitude);
          
          if (!hasLocation) {
            console.log('❌ Alert without location:', { 
              id: alert._id, 
              type: alert.type, 
              has_lat: !!alert.latitude,
              has_lng: !!alert.longitude,
              has_location_obj: !!alert.location
            });
          }
          
          return hasLocation;
        });
        
        console.log(`🎯 Alerts to render on map: ${alertsWithLocation.length} out of ${alerts.length}`);
        
        return alertsWithLocation.map((alert) => {
          const lat = alert.latitude || alert.location?.latitude;
          const lng = alert.longitude || alert.location?.longitude;
          
          return (
            <Marker
              key={alert._id}
              position={[lat, lng]}
              icon={createAlertIcon(getAlertMarkerColor(alert.severity), alert.alert_type || alert.type)}
            >
              <Popup>
                <div>
                  <h4>{alert.title || `${alert.type} Alert`}</h4>
                  <p>
                    <strong>Type:</strong> {alert.type || alert.alert_type}
                  </p>
                  <p>
                    <strong>Severity:</strong> {alert.severity}
                  </p>
                  <p>
                    <strong>Status:</strong> {alert.status}
                  </p>
                  <p>
                    <strong>Reported At:</strong>{" "}
                    {new Date(alert.timestamp || alert.created_at).toLocaleString()}
                  </p>
                  {alert.tourist_id?.name && (
                    <p>
                      <strong>Tourist:</strong> {alert.tourist_id.name} (
                      {alert.tourist_id.phone})
                    </p>
                  )}
                  {alert.description && (
                    <p>
                      <strong>Description:</strong> {alert.description}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        });
      })()}
    </MapContainer>
  );
};

export default InteractiveMap;
