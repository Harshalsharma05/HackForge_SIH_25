import { Router } from "express";
import {
  getDashboardStats,
  getActiveTourists,
  getRecentAlerts,
  getGeofenceData,
  getLiveMapData,
} from "../controllers/dashboardController.js";
import {
  verifyAdminJWT,
  checkAdminRole,
  checkJurisdiction,
} from "../middlewares/adminAuth.middleware.js";

const router = Router();

// All dashboard routes require admin authentication
router.use(verifyAdminJWT);

// Dashboard overview stats
router.route("/stats").get(getDashboardStats);

// Live map data (combined endpoint for real-time updates)
router.route("/live-map").get(getLiveMapData);

// Active tourists with locations
router.route("/active-tourists").get(checkJurisdiction, getActiveTourists);

// Recent alerts
router.route("/alerts").get(getRecentAlerts);

// Geofence data for map overlays
router.route("/geofences").get(checkJurisdiction, getGeofenceData);

export default router;
