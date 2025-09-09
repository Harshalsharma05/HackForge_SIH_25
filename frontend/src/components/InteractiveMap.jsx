import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const getTouristMarkerColor = (status) => {
  switch (status) {
    case 'emergency': return '#f44336';
    case 'warning': return '#ff9800';
    default: return '#4caf50';
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
  tourists, 
  geofences, 
  selectedTourist, 
  onTouristSelect, 
  onMapClick,
  center = [28.6139, 77.2090],
  zoom = 10 
}) => {
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);

  const getGeofenceColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  const handleTouristClick = (tourist) => {
    onTouristSelect(tourist);
    setMapCenter([tourist.latitude, tourist.longitude]);
    setMapZoom(15);
  };

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={mapZoom} 
      style={{ height: '100%', width: '100%' }}
      key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      
      {/* Render geofences */}
      {geofences.map(fence => (
        <Circle
          key={fence._id}
          center={[fence.latitude, fence.longitude]}
          radius={fence.radius_km * 1000}
          pathOptions={{
            color: getGeofenceColor(fence.risk_level),
            fillColor: getGeofenceColor(fence.risk_level),
            fillOpacity: 0.2,
            weight: 2,
          }}
        >
          <Popup>
            <div>
              <h4>{fence.name}</h4>
              <p><strong>Risk Level:</strong> {fence.risk_level}</p>
              <p><strong>Radius:</strong> {fence.radius_km} km</p>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Render tourists */}
      {tourists.map(tourist => (
        <Marker
          key={tourist._id}
          position={[tourist.latitude, tourist.longitude]}
          icon={createCustomIcon(getTouristMarkerColor(tourist.status))}
          eventHandlers={{
            click: () => handleTouristClick(tourist)
          }}
        >
          <Popup>
            <div>
              <h4>Tourist ID: {tourist._id}</h4>
              <p><strong>Status:</strong> {tourist.status || 'active'}</p>
              <p><strong>Last Update:</strong> {new Date(tourist.timestamp).toLocaleString()}</p>
              <button 
                onClick={() => handleTouristClick(tourist)}
                style={{
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default InteractiveMap;