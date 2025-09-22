import { Router } from "express";
import { reverseGeocode } from "../controllers/geocodingController.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
// import { verifyAdminJWT } from "../middlewares/adminAuth.middleware.js";
import { verifyTouristOrAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Geocoding routes
// router.route("/reverse").get(verifyJWT, reverseGeocode);
// router.route("/reverse").get(verifyAdminJWT, reverseGeocode); 
router.route("/reverse").get(verifyTouristOrAdminJWT, reverseGeocode);

export default router;