import { Router } from "express";
import {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  refreshAccessToken,
  createAdmin,
  getAllAdmins,
  updateAdminStatus,
} from "../controllers/adminController.js";
import {
  verifyAdminJWT,
  checkAdminRole,
} from "../middlewares/adminAuth.middleware.js";

const router = Router();

// Public routes
router.route("/login").post(loginAdmin);
router.route("/refresh-token").post(refreshAccessToken);

// Protected routes
router.route("/logout").post(verifyAdminJWT, logoutAdmin);
router.route("/current").get(verifyAdminJWT, getCurrentAdmin);

// Admin management routes (only for super admin)
router
  .route("/create")
  .post(verifyAdminJWT, checkAdminRole("admin"), createAdmin);

router.route("/all").get(verifyAdminJWT, checkAdminRole("admin"), getAllAdmins);

router
  .route("/:adminId/status")
  .patch(verifyAdminJWT, checkAdminRole("admin"), updateAdminStatus);

export default router;
