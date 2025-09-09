import { asyncHandler } from "../utils/asyncHandler.js";
import DigitalId from "../models/digitalId.js";
import Trip from "../models/trip.js";
import Tourist from "../models/tourist.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import BlockchainService from "../services/blockchainService.js";

// Initialize blockchain service
const blockchainService = new BlockchainService();

// GET ALL DIGITAL IDs FOR TOURIST
const getDigitalIds = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { tourist_id: req.tourist._id };
  if (status) {
    filter.on_chain_status = status;
  }

  const digitalIds = await DigitalId.find(filter)
    .populate("trip_id", "trip_name destination start_date end_date status")
    .sort({ created_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await DigitalId.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        digital_ids: digitalIds,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
      "Digital IDs fetched successfully"
    )
  );
});

// GET DIGITAL ID BY ID
const getDigitalIdById = asyncHandler(async (req, res) => {
  const { digitalIdId } = req.params;

  const digitalId = await DigitalId.findOne({
    _id: digitalIdId,
    tourist_id: req.tourist._id,
  }).populate(
    "trip_id",
    "trip_name destination start_date end_date status qr_codes"
  );

  if (!digitalId) {
    throw new ApiError(404, "Digital ID not found");
  }

  try {
    // Get current blockchain verification
    const blockchainVerification = await blockchainService.verifyDigitalID(
      digitalId.digital_id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...digitalId.toObject(),
          blockchain_verification: blockchainVerification,
        },
        "Digital ID fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching blockchain verification:", error);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...digitalId.toObject(),
          blockchain_verification: {
            error: "Verification temporarily unavailable",
          },
        },
        "Digital ID fetched (verification unavailable)"
      )
    );
  }
});

// VERIFY DIGITAL ID ON BLOCKCHAIN
const verifyOnBlockchain = asyncHandler(async (req, res) => {
  const { digital_id } = req.params;

  try {
    const verification = await blockchainService.verifyDigitalID(digital_id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, verification, "Blockchain verification completed")
      );
  } catch (error) {
    console.error("❌ Error during blockchain verification:", error);
    throw new ApiError(500, `Blockchain verification failed: ${error.message}`);
  }
});

// GET BLOCKCHAIN NETWORK STATUS
const getNetworkStatus = asyncHandler(async (req, res) => {
  try {
    const status = await blockchainService.getNetworkStatus();

    return res
      .status(200)
      .json(
        new ApiResponse(200, status, "Network status fetched successfully")
      );
  } catch (error) {
    console.error("❌ Error fetching network status:", error);
    throw new ApiError(500, `Failed to fetch network status: ${error.message}`);
  }
});

// RE-SYNC DIGITAL ID STATUS
const resyncDigitalId = asyncHandler(async (req, res) => {
  const { digitalIdId } = req.params;

  const digitalId = await DigitalId.findOne({
    _id: digitalIdId,
    tourist_id: req.tourist._id,
  });

  if (!digitalId) {
    throw new ApiError(404, "Digital ID not found");
  }

  try {
    // Verify current status on blockchain
    const verification = await blockchainService.verifyDigitalID(
      digitalId.digital_id
    );

    // Update local status based on blockchain state
    const updatedStatus = verification.onChain
      ? verification.isValid
        ? "confirmed"
        : "invalid"
      : "pending";

    digitalId.on_chain_status = updatedStatus;
    digitalId.last_verified_at = new Date();
    await digitalId.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          digital_id: digitalId,
          blockchain_verification: verification,
        },
        "Digital ID status synchronized successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error syncing digital ID:", error);
    throw new ApiError(500, `Failed to sync digital ID: ${error.message}`);
  }
});

// GET IPFS METADATA
const getIpfsMetadata = asyncHandler(async (req, res) => {
  const { ipfsHash } = req.params;

  const digitalId = await DigitalId.findOne({
    ipfs_hash: ipfsHash,
    tourist_id: req.tourist._id,
  });

  if (!digitalId) {
    throw new ApiError(404, "Digital ID not found for this IPFS hash");
  }

  try {
    const metadata = await blockchainService.getIpfsData(ipfsHash);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ipfs_hash: ipfsHash,
          metadata: metadata,
          digital_id: digitalId.digital_id,
        },
        "IPFS metadata fetched successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error fetching IPFS metadata:", error);
    throw new ApiError(500, `Failed to fetch IPFS metadata: ${error.message}`);
  }
});

export {
  getDigitalIds,
  getDigitalIdById,
  verifyOnBlockchain,
  getNetworkStatus,
  resyncDigitalId,
  getIpfsMetadata,
};
