// routes/fetchAlertRoutes.js
import express from "express";
import { fetchRecentAlerts, resolveAlert } from "../controllers/fetchAlertsController.js";

const router = express.Router();

// Get recent alerts
router.get("/", fetchRecentAlerts);

// Mark alert as resolved
router.put("/:id/resolve", resolveAlert);

export default router;
