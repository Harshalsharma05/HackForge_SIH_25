import express from "express";
import { sosAlert  , panicNotifyAdmin} from "../controllers/sosController.js";

const router = express.Router();

// Route: POST /api/alert/sos
router.post("/sos", sosAlert);
router.post("/panic" , panicNotifyAdmin)

export default router;
