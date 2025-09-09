import { Router } from "express";
import {
  getDigitalIds,
  getDigitalIdById,
  verifyOnBlockchain,
  getNetworkStatus,
  resyncDigitalId,
  getIpfsMetadata,
} from "../controllers/blockchainController.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes (require authentication)
router.route("/digital-ids").get(verifyJWT, getDigitalIds);
router.route("/digital-ids/:digitalIdId").get(verifyJWT, getDigitalIdById);
router
  .route("/digital-ids/:digitalIdId/resync")
  .post(verifyJWT, resyncDigitalId);
router.route("/network-status").get(verifyJWT, getNetworkStatus);
router.route("/ipfs/:ipfsHash").get(verifyJWT, getIpfsMetadata);

// Public verification endpoint
router.route("/verify/:digital_id").get(verifyOnBlockchain);

export default router;
