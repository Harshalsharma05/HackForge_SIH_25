import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import api from "../services/api";
import "leaflet/dist/leaflet.css";
import "./LocationTester.css";

// Custom marker icon for selected location
const selectedLocationIcon = L.divIcon({
  className: "selected-location-marker",
  html: `<div style="background-color: #2196f3; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 12px; font-weight: bold;">📍</div></div>`,
  iconSize: [25, 25],
  iconAnchor: [12.5, 12.5],
});

// Custom marker icon for current location
const currentLocationIcon = L.divIcon({
  className: "current-location-marker",
  html: `<div style="background-color: #4caf50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Map click handler component
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
};

// Location suggestions for popular destinations
const destinationCoordinates = {
  // Delhi locations
  delhi: [
    { name: "India Gate", lat: 28.6129, lng: 77.2295 },
    { name: "Red Fort", lat: 28.6562, lng: 77.241 },
    { name: "Lotus Temple", lat: 28.5535, lng: 77.2588 },
    { name: "Qutub Minar", lat: 28.5245, lng: 77.1855 },
    { name: "Akshardham Temple", lat: 28.6127, lng: 77.2773 },
    { name: "Chandni Chowk", lat: 28.6506, lng: 77.2334 },
  ],
  // Mumbai locations
  mumbai: [
    { name: "Gateway of India", lat: 18.922, lng: 72.8347 },
    { name: "Marine Drive", lat: 18.9439, lng: 72.8237 },
    { name: "Juhu Beach", lat: 19.0948, lng: 72.8258 },
    { name: "Chhatrapati Shivaji Terminus", lat: 18.9401, lng: 72.8352 },
    { name: "Bandra-Worli Sea Link", lat: 19.033, lng: 72.814 },
  ],
  // Goa locations
  goa: [
    { name: "Baga Beach", lat: 15.5557, lng: 73.7516 },
    { name: "Calangute Beach", lat: 15.5449, lng: 73.7551 },
    { name: "Anjuna Beach", lat: 15.5735, lng: 73.7407 },
    { name: "Basilica of Bom Jesus", lat: 15.5007, lng: 73.9114 },
    { name: "Fort Aguada", lat: 15.4909, lng: 73.7731 },
  ],
  // Agra locations
  agra: [
    { name: "Taj Mahal", lat: 27.1751, lng: 78.0421 },
    { name: "Agra Fort", lat: 27.1795, lng: 78.0211 },
    { name: "Fatehpur Sikri", lat: 27.0937, lng: 77.6615 },
  ],
  // Jaipur locations
  jaipur: [
    { name: "Hawa Mahal", lat: 26.9239, lng: 75.8267 },
    { name: "City Palace", lat: 26.9255, lng: 75.8243 },
    { name: "Amber Fort", lat: 26.9855, lng: 75.8513 },
    { name: "Jantar Mantar", lat: 26.9246, lng: 75.8249 },
  ],
  // Kerala locations
  kerala: [
    { name: "Munnar Hill Station", lat: 10.0889, lng: 77.0595 },
    { name: "Alleppey Backwaters", lat: 9.4981, lng: 76.3388 },
    { name: "Kochi Chinese Fishing Nets", lat: 9.9312, lng: 76.2673 },
    { name: "Thekkady Wildlife Sanctuary", lat: 9.5916, lng: 77.1536 },
  ],
};

const LocationTester = ({ selectedTrip, onClose }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to India center
  const [mapZoom, setMapZoom] = useState(5); // Zoomed out to show entire India
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState({}); // Store location info
  const [loadingLocationInfo, setLoadingLocationInfo] = useState(false);

  useEffect(() => {
    if (selectedTrip?.destination) {
      loadDestinationSuggestions(selectedTrip.destination);
      setMapCenterForDestination(selectedTrip.destination);
    }
    getCurrentLocationFromBrowser();
  }, [selectedTrip]);

  const loadDestinationSuggestions = (destination) => {
    const destKey = destination.toLowerCase();
    const matchingKey = Object.keys(destinationCoordinates).find(
      (key) => destKey.includes(key) || key.includes(destKey)
    );

    if (matchingKey) {
      setSuggestions(destinationCoordinates[matchingKey]);
    } else {
      setSuggestions([]);
    }
  };

  const setMapCenterForDestination = (destination) => {
    const destKey = destination.toLowerCase();
    const matchingKey = Object.keys(destinationCoordinates).find(
      (key) => destKey.includes(key) || key.includes(destKey)
    );

    if (matchingKey && destinationCoordinates[matchingKey].length > 0) {
      const firstLocation = destinationCoordinates[matchingKey][0];
      setMapCenter([firstLocation.lat, firstLocation.lng]);
      setMapZoom(12);
    }
  };

  const getCurrentLocationFromBrowser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(userLocation);

          // Center map on user's location if no trip destination is set
          if (!selectedTrip?.destination) {
            setMapCenter([userLocation.lat, userLocation.lng]);
            setMapZoom(12);
          }
        },
        (error) => {
          console.log("Could not get current location:", error);
          // Keep default India center if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  };

  const handleLocationSelect = async (latlng) => {
    setSelectedLocation(latlng);
    setUpdateResult(null);
    // Clear search results when map is clicked
    setSearchResults([]);
    // Optionally clear search query or set it to coordinates
    setSearchQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);

    // Fetch location information for the selected point
    await fetchLocationInfo(latlng.lat, latlng.lng);
  };

  const handleSuggestionClick = async (suggestion) => {
    const latlng = { lat: suggestion.lat, lng: suggestion.lng };
    setSelectedLocation(latlng);
    setMapCenter([suggestion.lat, suggestion.lng]);
    setMapZoom(15);
    setUpdateResult(null);

    // Fetch location information for the selected suggestion
    await fetchLocationInfo(suggestion.lat, suggestion.lng);
  };

  const handleUpdateLocation = async () => {
    if (!selectedLocation || !selectedTrip) {
      alert("Please select a location and ensure a trip is selected");
      return;
    }

    setLoading(true);
    setUpdateResult(null);

    try {
      const locationData = {
        trip_id: selectedTrip._id,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        accuracy: 10, // Simulated accuracy
        battery_level: Math.floor(Math.random() * 100), // Random battery level
        connection_quality: "good",
        timestamp: new Date().toISOString(),
      };

      const response = await api.post("/location/update", locationData);

      setUpdateResult({
        success: true,
        data: response.data,
        location: selectedLocation,
      });

      alert("Location updated successfully!");
    } catch (error) {
      console.error("Error updating location:", error);
      setUpdateResult({
        success: false,
        error: error.response?.data?.message || error.message,
      });
      alert(
        `Error updating location: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const fetchLocationInfo = async (lat, lng) => {
    try {
      setLoadingLocationInfo(true);

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

        setLocationInfo(locationData);
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

      setLocationInfo(fallbackData);
      return fallbackData;
    } finally {
      setLoadingLocationInfo(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Using OpenStreetMap Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&countrycodes=IN`
      );
      const data = await response.json();

      setSearchResults(
        data.map((result) => ({
          display_name: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          place_id: result.place_id,
        }))
      );
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce search to avoid too many API calls
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      handleSearch(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSearchResultSelect(searchResults[0]);
    }
  };

  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchResultSelect = (result) => {
    const latlng = { lat: result.lat, lng: result.lng };
    setSelectedLocation(latlng);
    setMapCenter([result.lat, result.lng]);
    setMapZoom(15);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setUpdateResult(null);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="location-tester">
      <div className="location-tester-content">
        {/* Search Section */}
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for a location (e.g., India Gate, Delhi)"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyPress={handleSearchKeyPress}
            />
            {searchLoading && <div className="search-spinner">🔍</div>}
            {searchQuery && !searchLoading && (
              <button
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div
                  key={result.place_id}
                  className="search-result-item"
                  onClick={() => handleSearchResultSelect(result)}
                >
                  <div className="result-name">📍 {result.display_name}</div>
                  <div className="result-coords">
                    {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery.length > 2 &&
            !searchLoading &&
            searchResults.length === 0 && (
              <div className="no-results">
                No locations found for "{searchQuery}". Try a different search
                term.
              </div>
            )}
        </div>

        <div className="map-section">
          {/* Close Button - positioned over the map */}
          <button className="close-btn-map" onClick={onClose}>
            ×
          </button>

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{
              height: "100%",
              width: "100%",
              minHeight: "400px",
              borderRadius: "0",
              overflow: "hidden",
              flex: 1,
            }}
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <MapClickHandler onLocationSelect={handleLocationSelect} />

            {/* Current location marker */}
            {currentLocation && (
              <Marker
                position={[currentLocation.lat, currentLocation.lng]}
                icon={currentLocationIcon}
              >
                <Popup>
                  <div>
                    <strong>Your Current Location</strong>
                    <br />
                    {currentLocation.lat.toFixed(4)},{" "}
                    {currentLocation.lng.toFixed(4)}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Selected location marker */}
            {selectedLocation && (
              <Marker
                position={[selectedLocation.lat, selectedLocation.lng]}
                icon={selectedLocationIcon}
              >
                <Popup>
                  <div style={{ minWidth: "250px" }}>
                    <strong style={{ fontSize: "14px", color: "#333" }}>
                      Selected Test Location
                    </strong>

                    {/* Location Information */}
                    {loadingLocationInfo ? (
                      <div
                        style={{
                          background: "#f8f9fa",
                          padding: "8px",
                          borderRadius: "6px",
                          margin: "8px 0",
                          textAlign: "center",
                        }}
                      >
                        🔄 Loading location details...
                      </div>
                    ) : locationInfo.display_name ? (
                      <div
                        style={{
                          background: "#f8f9fa",
                          padding: "8px",
                          borderRadius: "6px",
                          margin: "8px 0",
                          fontSize: "12px",
                        }}
                      >
                        <div>
                          <strong>Area:</strong> {locationInfo.area}
                        </div>
                        <div>
                          <strong>City:</strong> {locationInfo.city}
                        </div>
                        <div>
                          <strong>State:</strong> {locationInfo.state}
                        </div>
                        {locationInfo.postcode && (
                          <div>
                            <strong>Pincode:</strong> {locationInfo.postcode}
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div style={{ fontSize: "12px", margin: "8px 0" }}>
                      <strong>Coordinates:</strong>
                      <br />
                      {selectedLocation.lat.toFixed(6)},{" "}
                      {selectedLocation.lng.toFixed(6)}
                    </div>

                    <button
                      onClick={handleUpdateLocation}
                      disabled={loading}
                      style={{
                        marginTop: "8px",
                        padding: "8px 16px",
                        background: "#2196f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        width: "100%",
                        fontSize: "12px",
                      }}
                    >
                      {loading ? "Updating..." : "Update Location"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Header Section - moved below the map */}
        <div className="location-tester-header">
          <h3>Location Tester</h3>
          <p>
            Click on the map or select a popular location to test location
            updates
          </p>
          {selectedTrip && (
            <div className="trip-info">
              <strong>Testing for:</strong> {selectedTrip.trip_name} -{" "}
              {selectedTrip.destination}
            </div>
          )}
        </div>

        <div className="controls-section">
          {suggestions.length > 0 && (
            <div className="suggestions">
              <h4>Popular Locations in {selectedTrip?.destination}</h4>
              <div className="suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-btn"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    📍 {suggestion.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedLocation && (
            <div className="selected-location-info">
              <h4>Selected Location</h4>

              {/* Location Information */}
              {loadingLocationInfo ? (
                <div className="location-loading">
                  🔄 Loading location details...
                </div>
              ) : locationInfo.display_name ? (
                <div className="location-details">
                  <div className="location-item">
                    <strong>📍 Location:</strong> {locationInfo.area}
                  </div>
                  <div className="location-item">
                    <strong>🏙️ City:</strong> {locationInfo.city}
                  </div>
                  <div className="location-item">
                    <strong>🗺️ State:</strong> {locationInfo.state}
                  </div>
                  {locationInfo.postcode && (
                    <div className="location-item">
                      <strong>📮 Pincode:</strong> {locationInfo.postcode}
                    </div>
                  )}
                  <div className="location-item">
                    <strong>🌍 Country:</strong> {locationInfo.country}
                  </div>
                </div>
              ) : (
                <div className="location-placeholder">
                  Click on map to load location details
                </div>
              )}

              <p className="coordinates-info">
                <strong>Coordinates:</strong> {selectedLocation.lat.toFixed(6)},{" "}
                {selectedLocation.lng.toFixed(6)}
              </p>
              <button
                className="update-location-btn"
                onClick={handleUpdateLocation}
                disabled={loading || !selectedTrip}
              >
                {loading ? "Updating Location..." : "Update Location for Trip"}
              </button>
            </div>
          )}

          {updateResult && (
            <div
              className={`update-result ${
                updateResult.success ? "success" : "error"
              }`}
            >
              <h4>{updateResult.success ? "Success!" : "Error"}</h4>
              {updateResult.success ? (
                <div>
                  <p>Location updated successfully!</p>
                  <p>
                    <strong>New Location:</strong>{" "}
                    {updateResult.location.lat.toFixed(4)},{" "}
                    {updateResult.location.lng.toFixed(4)}
                  </p>
                  {updateResult.data?.data?.safety_status && (
                    <div className="safety-status">
                      <p>
                        <strong>Safety Status:</strong>{" "}
                        {updateResult.data.data.safety_status.is_safe
                          ? "✅ Safe Zone"
                          : "⚠️ Check Required"}
                      </p>
                      {updateResult.data.data.safety_status.violations?.length >
                        0 && (
                        <div className="violations">
                          <strong>Geofence Violations:</strong>
                          {updateResult.data.data.safety_status.violations.map(
                            (violation, index) => (
                              <div key={index} className="violation-item">
                                - {violation.fence_name} ({violation.zone_type})
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p>{updateResult.error}</p>
              )}
            </div>
          )}

          <div className="instructions">
            <h4>How to Use</h4>
            <ul>
              <li>� Use the search bar to find locations by name or address</li>
              <li>�🗺️ Click anywhere on the map to select a test location</li>
              <li>📍 Use popular location buttons for quick selection</li>
              <li>🎯 The green dot shows your current browser location</li>
              <li>
                🔄 Click "Update Location" to test the location update API
              </li>
              <li>⚠️ Any geofence violations will be displayed after update</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationTester;
