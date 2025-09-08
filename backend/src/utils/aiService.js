import axios from "axios";
import Location from "../models/location.js";
import Alert from "../models/alerts.js";

const AI_SERVICE_URL = "http://localhost:5001/analyze/location";

export const checkLocationForAnomalies = async (trip_id, newLocation) => {
  try {
    // Fetch the last 10 location points for context
    const location_history = await Location.find({ trip_id })
      .sort({ timestamp: -1 })
      .limit(10);

    if (location_history.length < 2) {
      return null; // Not enough data to analyze
    }

    // Call the Python AI service
    const response = await axios.post(AI_SERVICE_URL, {
      location_history: location_history.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: loc.timestamp,
      })),
    });

    const { is_anomaly, anomaly_details } = response.data;

    if (is_anomaly) {
      // If an anomaly is found, create an alert in our database
      const newAlert = await Alert.create({
        tourist_id: newLocation.tourist_id,
        trip_id: trip_id,
        type: "anomaly",
        title: anomaly_details.title || "Detected Anomaly",
        description: anomaly_details.description,
        severity: anomaly_details.severity || "medium",
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        metadata: {
          automatic_trigger: true,
        },
      });
      console.log(`Anomaly Alert created: ${newAlert.title}`);
      return newAlert; // Return the created alert
    }

    return null; // No anomaly found
  } catch (error) {
    console.error(
      "Error calling Service:",
      error.response ? error.response.data : error.message
    );
    return null; // Don't crash the main app if the AI service is down
  }
};