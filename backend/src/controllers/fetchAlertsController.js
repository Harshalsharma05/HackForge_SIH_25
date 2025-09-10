// controllers/fetchAlertsController.js
import Alert from "../models/alerts.js";

// Fetch recent alerts
export const fetchRecentAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 }) // latest first
      .limit(10) // last 10 alerts
      .populate("tourist_id", "name phone email"); // include tourist info

    res.status(200).json({ success: true, data: { alerts } });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Optional: mark alert as resolved
export const resolveAlert = async (req, res) => {
  try {
    const alertId = req.params.id;
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      { status: "resolved", resolved_at: new Date() },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
