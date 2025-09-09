import { Router } from "express";
import {
  createGeoFence,
  getAllGeoFences,
  getGeoFenceById,
  updateGeoFence,
  deleteGeoFence,
  checkLocationAgainstGeoFences,
  getNearbyGeoFences,
} from "../controllers/geofenceController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// PUBLIC ROUTES (for emergency services and location checking)
router.route("/check").get(checkLocationAgainstGeoFences);
router.route("/nearby").get(getNearbyGeoFences);
router.route("/").get(getAllGeoFences); // Public read access
router.route("/:id").get(getGeoFenceById); // Public read access

// AUTHENTICATED ROUTES (for creating/managing geofences)
router.route("/create").post(verifyJWT, createGeoFence);
router.route("/:id").patch(verifyJWT, updateGeoFence);
router.route("/:id").delete(verifyJWT, deleteGeoFence);

export default router;
