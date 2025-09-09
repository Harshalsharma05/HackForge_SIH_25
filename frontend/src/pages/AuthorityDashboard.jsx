import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { locationAPI, geofenceAPI, alertsAPI } from '../services/api';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import InteractiveMap from '../components/InteractiveMap';
import NotificationSystem from '../components/NotificationSystem';
import TestControls from '../components/TestControls';
import 'leaflet/dist/leaflet.css';
import './AuthorityDashboard.css';

const AuthorityDashboard = () => {
  const { user, logout } = useAuth();
  const [geofences, setGeofences] = useState([]);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use real-time updates hook
  const {
    notifications,
    tourists,
    alerts,
    dismissNotification,
    updateTourists,
    updateAlerts,
  } = useRealTimeUpdates(user);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTourists(),
        fetchGeofences(),
        fetchAlerts()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTourists = async () => {
    try {
      // Use mock data for now
      const { mockTourists } = await import('../services/mockData');
      updateTourists(mockTourists);
      // const response = await locationAPI.getActiveTourists();
      // updateTourists(response.data || []);
    } catch (error) {
      console.error('Error fetching tourists:', error);
      updateTourists([]);
    }
  };

  const fetchGeofences = async () => {
    try {
      // Use mock data for now
      const { mockGeofences } = await import('../services/mockData');
      setGeofences(mockGeofences);
      // const response = await geofenceAPI.getAllGeofences();
      // setGeofences(response.data || []);
    } catch (error) {
      console.error('Error fetching geofences:', error);
      setGeofences([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      // Use mock data for now
      const { mockAlerts } = await import('../services/mockData');
      updateAlerts(mockAlerts);
      // const response = await alertsAPI.getRecentAlerts();
      // updateAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      updateAlerts([]);
    }
  };

  const getMarkerColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'green';
    }
  };

  const generateQRCode = (digitalId) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${digitalId}`;
  };

  // Test functions for simulating real-time events
  const handleSimulateAlert = (alert) => {
    updateAlerts(prev => [alert, ...prev]);
    
    // Simulate notification
    const notification = {
      id: Date.now(),
      type: alert.type,
      title: `New ${alert.type} Alert`,
      message: alert.description,
      timestamp: new Date().toISOString(),
    };
    
    // This would normally come from the real-time hook
    // For testing, we'll manually trigger it
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
        });
      }
    }, 100);
  };

  const handleSimulateLocationUpdate = (update) => {
    updateTourists(prev => 
      prev.map(t => 
        t._id === update.tourist_id 
          ? { ...t, latitude: update.latitude, longitude: update.longitude, timestamp: update.timestamp }
          : t
      )
    );
  };

  if (loading) {
    return (
      <div className="authority-dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="authority-dashboard">
      <NotificationSystem 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />
      
      <div className="dashboard-header">
        <h1>Authority Dashboard</h1>
        <div className="stats">
          <span>Active Tourists: {tourists.length}</span>
          <span>Active Alerts: {alerts.filter(a => !a.resolved).length}</span>
          <button onClick={logout} style={{ marginLeft: '20px', padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="map-section">
          <InteractiveMap
            tourists={tourists}
            geofences={geofences}
            selectedTourist={selectedTourist}
            onTouristSelect={setSelectedTourist}
            center={[28.6139, 77.2090]}
            zoom={10}
          />
        </div>

        <div className="sidebar">
          <div className="alerts-section">
            <h3>Recent Alerts</h3>
            <div className="alerts-list">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert._id} className={`alert-item ${alert.type}`}>
                  <div className="alert-header">
                    <span className="alert-type">{alert.type}</span>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{alert.description}</p>
                  {!alert.resolved && (
                    <button className="resolve-btn">Mark Resolved</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedTourist && (
            <div className="tourist-details">
              <h3>Tourist Details</h3>
              <div className="tourist-info">
                <p><strong>ID:</strong> {selectedTourist._id}</p>
                <p><strong>Location:</strong> {selectedTourist.latitude?.toFixed(4)}, {selectedTourist.longitude?.toFixed(4)}</p>
                <p><strong>Last Update:</strong> {new Date(selectedTourist.timestamp).toLocaleString()}</p>
                
                <div className="qr-section">
                  <h4>Digital ID QR Code</h4>
                  <img 
                    src={generateQRCode(selectedTourist._id)} 
                    alt="QR Code"
                    className="qr-code"
                  />
                </div>

                <div className="actions">
                  <button className="emergency-btn">Send Emergency Alert</button>
                  <button className="contact-btn">Contact Tourist</button>
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