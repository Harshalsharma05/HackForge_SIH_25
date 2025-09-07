import express from "express";
import { sosAlert } from "../controllers/sosController.js";

const router = express.Router();

// Route: POST /api/alert/sos
router.post("/sos", sosAlert);

export default router;
