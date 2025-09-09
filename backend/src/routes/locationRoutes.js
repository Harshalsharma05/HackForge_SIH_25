import { Router } from "express";
import {
  startLocationTracking,
  stopLocationTracking,
  updateLocationHTTP,
  getCurrentLocation,
  getLocationHistory,
  checkNearbyGeoFences,
} from "../controllers/locationController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All location routes require authentication
router.use(verifyJWT);

// Location tracking control
router.route("/start-tracking").post(startLocationTracking);
router.route("/stop-tracking").post(stopLocationTracking);

// Location updates (HTTP fallback for Socket.IO)
router.route("/update").post(updateLocationHTTP);

// Location data retrieval
router.route("/current/:trip_id").get(getCurrentLocation);
router.route("/history/:trip_id").get(getLocationHistory);

// Geo-fence operations
router.route("/check-geofences").get(checkNearbyGeoFences);

export default router;
