import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(serverUrl = 'http://localhost:5000') {
    if (this.socket) return;

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Tourist location updates
  onLocationUpdate(callback) {
    if (this.socket) {
      this.socket.on('locationUpdate', callback);
    }
  }

  // New alerts
  onNewAlert(callback) {
    if (this.socket) {
      this.socket.on('newAlert', callback);
    }
  }

  // Geofence violations
  onGeofenceViolation(callback) {
    if (this.socket) {
      this.socket.on('geofenceViolation', callback);
    }
  }

  // Emergency alerts
  onEmergencyAlert(callback) {
    if (this.socket) {
      this.socket.on('emergencyAlert', callback);
    }
  }

  // Join authority room for jurisdiction-specific updates
  joinAuthorityRoom(jurisdictionId) {
    if (this.socket) {
      this.socket.emit('joinAuthority', { jurisdictionId });
    }
  }

  // Send emergency response
  sendEmergencyResponse(touristId, response) {
    if (this.socket) {
      this.socket.emit('emergencyResponse', { touristId, response });
    }
  }
}

export default new SocketService();