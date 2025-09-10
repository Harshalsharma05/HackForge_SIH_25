import api from "./api";

class LocationService {
  constructor() {
    this.isTracking = false;
    this.updateInterval = null;
    this.callbacks = [];
  }

  // Start location tracking
  startTracking(tripId, options = {}) {
    if (this.isTracking) return;

    this.isTracking = true;
    const { interval = 30000 } = options; // 30 seconds default

    // Get user's location and send updates
    this.updateInterval = setInterval(() => {
      this.getCurrentLocationAndUpdate(tripId);
    }, interval);

    console.log("Location tracking started for trip:", tripId);
  }

  // Stop location tracking
  stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isTracking = false;
    console.log("Location tracking stopped");
  }

  // Get current location and send to server
  async getCurrentLocationAndUpdate(tripId) {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const locationData = {
              trip_id: tripId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              timestamp: new Date().toISOString(),
              battery_level: await this.getBatteryLevel(),
              connection_quality: this.getConnectionQuality(),
            };

            const response = await this.updateLocation(locationData);

            // Notify callbacks about location update
            this.notifyCallbacks("locationUpdate", {
              location: locationData,
              response: response.data,
            });

            resolve(response);
          } catch (error) {
            console.error("Error updating location:", error);
            reject(error);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  // Send location update to server
  async updateLocation(locationData) {
    try {
      const response = await api.post("/location/update", locationData);
      console.log("Location updated successfully:", response.data);
      return response;
    } catch (error) {
      console.error("Error updating location on server:", error);
      throw error;
    }
  }

  // Simulate location update (for testing)
  async simulateLocationUpdate(tripId, lat, lng) {
    try {
      const locationData = {
        trip_id: tripId,
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        altitude: null,
        speed: null,
        timestamp: new Date().toISOString(),
        battery_level: 80,
        connection_quality: "good",
      };

      const response = await this.updateLocation(locationData);

      // Notify callbacks about location update
      this.notifyCallbacks("locationUpdate", {
        location: locationData,
        response: response.data,
      });

      return response;
    } catch (error) {
      console.error("Error simulating location update:", error);
      throw error;
    }
  }

  // Get battery level (if supported)
  async getBatteryLevel() {
    try {
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch (error) {
      console.log("Battery API not supported");
    }
    return null;
  }

  // Get connection quality
  getConnectionQuality() {
    if ("connection" in navigator) {
      const connection = navigator.connection;
      const downlink = connection.downlink;

      if (downlink >= 10) return "excellent";
      if (downlink >= 5) return "good";
      if (downlink >= 1) return "fair";
      return "poor";
    }
    return "unknown";
  }

  // Subscribe to location updates
  subscribe(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // Notify all callbacks
  notifyCallbacks(event, data) {
    this.callbacks.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in location service callback:", error);
      }
    });
  }

  // Check if tracking is active
  isLocationTracking() {
    return this.isTracking;
  }
}

// Export singleton instance
export default new LocationService();
