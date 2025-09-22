import Alert from "../models/alerts.js";
import Location from "../models/location.js";

class AnomalyDetectionService {
  
  // Speed anomaly detection
  async detectSpeedAnomaly(newLocation, touristId) {
    try {
      // Get the previous location
      const previousLocation = await Location.findOne({
        tourist_id: touristId,
        timestamp: { $lt: new Date(newLocation.timestamp) }
      }).sort({ timestamp: -1 });

      if (!previousLocation) return null;

      // Calculate speed
      const speed = this.calculateSpeed(previousLocation, newLocation);
      
      // Define speed thresholds (in km/h)
      const SPEED_THRESHOLDS = {
        WALKING: 8,    // Above 8 km/h could indicate vehicle use
        VEHICLE: 120,  // Above 120 km/h could indicate dangerous driving
        CRITICAL: 200  // Above 200 km/h is likely GPS error or emergency
      };

      let anomalyLevel = null;
      let message = "";

      if (speed > SPEED_THRESHOLDS.CRITICAL) {
        anomalyLevel = "critical";
        message = `Extreme speed detected: ${speed.toFixed(1)} km/h. Possible GPS error or emergency situation.`;
      } else if (speed > SPEED_THRESHOLDS.VEHICLE) {
        anomalyLevel = "high";
        message = `High speed detected: ${speed.toFixed(1)} km/h. Tourist may be in a fast-moving vehicle.`;
      } else if (speed > SPEED_THRESHOLDS.WALKING) {
        anomalyLevel = "medium";
        message = `Moderate speed detected: ${speed.toFixed(1)} km/h. Tourist may have switched to vehicle transport.`;
      }

      if (anomalyLevel) {
        return {
          type: "speed_anomaly",
          level: anomalyLevel,
          message,
          speed,
          location: newLocation,
          previousLocation
        };
      }

      return null;
    } catch (error) {
      console.error("Error in speed anomaly detection:", error);
      return null;
    }
  }

  // Location pattern anomaly detection
  async detectLocationAnomaly(newLocation, touristId) {
    try {
      // Get recent locations (last 1 hour)
      const recentLocations = await Location.find({
        tourist_id: touristId,
        timestamp: { 
          $gte: new Date(Date.now() - 60 * 60 * 1000),
          $lt: new Date(newLocation.timestamp)
        }
      }).sort({ timestamp: -1 }).limit(10);

      if (recentLocations.length < 3) return null;

      // Check for rapid location changes (possible GPS spoofing)
      const distances = [];
      for (let i = 0; i < recentLocations.length - 1; i++) {
        const distance = this.calculateDistance(
          recentLocations[i], 
          recentLocations[i + 1]
        );
        distances.push(distance);
      }

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const currentDistance = this.calculateDistance(newLocation, recentLocations[0]);

      // If current distance is significantly higher than average
      if (currentDistance > avgDistance * 5 && currentDistance > 10) { // 10 km threshold
        return {
          type: "location_anomaly",
          level: "high",
          message: `Unusual location jump detected: ${currentDistance.toFixed(1)} km from recent positions.`,
          distance: currentDistance,
          avgDistance,
          location: newLocation
        };
      }

      return null;
    } catch (error) {
      console.error("Error in location anomaly detection:", error);
      return null;
    }
  }

  // Time-based anomaly detection (unusual activity hours)
  async detectTimeAnomaly(newLocation, touristId) {
    try {
      const hour = new Date(newLocation.timestamp).getHours();
      
      // Define unusual hours (late night/early morning)
      if (hour >= 23 || hour <= 5) {
        return {
          type: "time_anomaly",
          level: "medium",
          message: `Tourist active during unusual hours: ${hour}:00. May need attention.`,
          hour,
          location: newLocation
        };
      }

      return null;
    } catch (error) {
      console.error("Error in time anomaly detection:", error);
      return null;
    }
  }

  // Main anomaly detection function
  async detectAnomalies(newLocation, touristId) {
    const anomalies = [];

    // Run all detection methods
    const speedAnomaly = await this.detectSpeedAnomaly(newLocation, touristId);
    const locationAnomaly = await this.detectLocationAnomaly(newLocation, touristId);
    const timeAnomaly = await this.detectTimeAnomaly(newLocation, touristId);

    if (speedAnomaly) anomalies.push(speedAnomaly);
    if (locationAnomaly) anomalies.push(locationAnomaly);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    // Create alerts for significant anomalies
    for (const anomaly of anomalies) {
      if (anomaly.level === "high" || anomaly.level === "critical") {
        await this.createAnomalyAlert(anomaly, touristId);
      }
    }

    return anomalies;
  }

  // Helper function to calculate distance between two points
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper function to calculate speed
  calculateSpeed(point1, point2) {
    const distance = this.calculateDistance(point1, point2); // in km
    const timeDiff = (new Date(point2.timestamp) - new Date(point1.timestamp)) / 1000 / 3600; // in hours
    return timeDiff > 0 ? distance / timeDiff : 0; // km/h
  }

  // Helper function to convert degrees to radians
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Create alert for anomaly
  async createAnomalyAlert(anomaly, touristId) {
    try {
      const alert = new Alert({
        alert_type: "anomaly_detection",
        title: `${anomaly.type.replace('_', ' ').toUpperCase()} Detected`,
        description: anomaly.message,
        severity: anomaly.level === "critical" ? "critical" : "high",
        tourist_id: touristId,
        latitude: anomaly.location.latitude,
        longitude: anomaly.location.longitude,
        metadata: {
          anomaly_type: anomaly.type,
          detection_data: anomaly
        },
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
      });

      await alert.save();
      console.log(`🚨 Anomaly alert created: ${anomaly.type} for tourist ${touristId}`);
      
      return alert;
    } catch (error) {
      console.error("Error creating anomaly alert:", error);
      return null;
    }
  }
}

export default new AnomalyDetectionService();
