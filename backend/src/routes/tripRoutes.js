import { Router } from "express";
import {
  createTrip,
  getTouristTrips,
  getTripById,
  getCurrentTrip,
  updateTrip,
  activateTrip,
  completeTrip,
  deleteTrip,
  verifyTripDigitalId,
  getBlockchainDigitalId,
  getTouristTripDetails,
} from "../controllers/tripController.js";
import { verifyJWT, optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes (require authentication)
router.route("/create").post(verifyJWT, createTrip);
router.route("/my-trips").get(verifyJWT, getTouristTrips);
router.route("/current").get(verifyJWT, getCurrentTrip);
router.route("/:tripId").get(verifyJWT, getTripById);
router.route("/:tripId").delete(verifyJWT, deleteTrip);
router.route("/:tripId/update").patch(verifyJWT, updateTrip);
router.route("/:tripId/activate").post(verifyJWT, activateTrip);
router.route("/:tripId/complete").post(verifyJWT, completeTrip);
router.route("/:tripId/blockchain").get(verifyJWT, getBlockchainDigitalId);

// Authority routes (for dashboard - these need admin auth middleware)
router.route("/tourist/:touristId/details").get(getTouristTripDetails);

// Public route (for authorities to verify digital ID)
router.route("/verify/:digital_id").get(verifyTripDigitalId);

export default router;
