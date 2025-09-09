import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

export const useRealTimeUpdates = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    socketService.connect();

    // Join authority room
    if (user.jurisdictionId) {
      socketService.joinAuthorityRoom(user.jurisdictionId);
    }

    // Listen for location updates
    socketService.onLocationUpdate((data) => {
      setTourists(prev => 
        prev.map(t => 
          t._id === data.tourist_id 
            ? { ...t, latitude: data.latitude, longitude: data.longitude, timestamp: data.timestamp }
            : t
        )
      );
    });

    // Listen for new alerts
    socketService.onNewAlert((alert) => {
      setAlerts(prev => [alert, ...prev]);
      
      // Add notification
      const notification = {
        id: Date.now(),
        type: alert.type,
        title: `New ${alert.type} Alert`,
        message: alert.description,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
      
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    });

    // Listen for geofence violations
    socketService.onGeofenceViolation((data) => {
      const notification = {
        id: Date.now(),
        type: 'warning',
        title: 'Geofence Violation',
        message: `Tourist ${data.tourist_id} entered ${data.zone_name}`,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    });

    // Listen for emergency alerts
    socketService.onEmergencyAlert((data) => {
      const notification = {
        id: Date.now(),
        type: 'emergency',
        title: 'EMERGENCY ALERT',
        message: `Tourist ${data.tourist_id} needs immediate assistance`,
        timestamp: new Date().toISOString(),
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 4)]);
      
      // Play alert sound
      const audio = new Audio('/alert-sound.mp3');
      audio.play().catch(() => {});
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const updateTourists = (newTourists) => {
    setTourists(newTourists);
  };

  const updateAlerts = (newAlerts) => {
    setAlerts(newAlerts);
  };

  return {
    notifications,
    tourists,
    alerts,
    dismissNotification,
    updateTourists,
    updateAlerts,
  };
};