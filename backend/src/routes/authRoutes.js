import { Router } from "express";
import {
  registerTourist,
  loginTourist,
  logoutTourist,
  refreshAccessToken,
  getCurrentTourist,
  changeCurrentPassword,
} from "../controllers/touristController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(registerTourist);
router.route("/login").post(loginTourist);
router.route("/refresh-token").post(refreshAccessToken);

// Protected routes
router.route("/logout").post(verifyJWT, logoutTourist);
router.route("/current-tourist").get(verifyJWT, getCurrentTourist);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

export default router;
