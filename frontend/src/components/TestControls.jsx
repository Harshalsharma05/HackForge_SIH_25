import { useState } from 'react';

const TestControls = ({ onSimulateAlert, onSimulateLocationUpdate }) => {
  const [isVisible, setIsVisible] = useState(false);

  const simulateEmergencyAlert = () => {
    const alert = {
      _id: `alert_${Date.now()}`,
      type: 'panic',
      description: 'Tourist pressed panic button - immediate assistance required',
      timestamp: new Date().toISOString(),
      resolved: false,
      tourist_id: 'tourist_001'
    };
    onSimulateAlert(alert);
  };

  const simulateGeofenceAlert = () => {
    const alert = {
      _id: `alert_${Date.now()}`,
      type: 'geo_fence',
      description: 'Tourist entered high-risk danger zone',
      timestamp: new Date().toISOString(),
      resolved: false,
      tourist_id: 'tourist_002'
    };
    onSimulateAlert(alert);
  };

  const simulateLocationUpdate = () => {
    const update = {
      tourist_id: 'tourist_001',
      latitude: 28.6139 + (Math.random() - 0.5) * 0.01,
      longitude: 77.2090 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString()
    };
    onSimulateLocationUpdate(update);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: '#2196f3',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '50px',
          cursor: 'pointer',
          zIndex: 1000,
          fontSize: '12px'
        }}
      >
        Test Controls
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: '200px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Test Controls</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          ×
        </button>
      </div>
      
      <button
        onClick={simulateEmergencyAlert}
        style={{
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Simulate Emergency
      </button>
      
      <button
        onClick={simulateGeofenceAlert}
        style={{
          background: '#ff9800',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Simulate Geofence Alert
      </button>
      
      <button
        onClick={simulateLocationUpdate}
        style={{
          background: '#4caf50',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Simulate Location Update
      </button>
    </div>
  );
};

export default TestControls;