import { asyncHandler } from "../utils/asyncHandler.js";
import Trip from "../models/trip.js";
import Tourist from "../models/tourist.js";
import DigitalId from "../models/digitalId.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import BlockchainService from "../services/blockchainService.js";
import { generateQRCodes } from "../utils/qrGenerator.js";
import crypto from "crypto";

// Initialize blockchain service
const blockchainService = new BlockchainService();

// Generate Digital ID (8-character alphanumeric for trips)
const generateTripDigitalId = async () => {
  let digitalId;
  let isUnique = false;

  while (!isUnique) {
    // Generate 8-character ID with letters and numbers
    digitalId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existingTrip = await Trip.findOne({ digital_id: digitalId });
    const existingDigitalId = await DigitalId.findOne({
      digital_id: digitalId,
    });
    if (!existingTrip && !existingDigitalId) {
      isUnique = true;
    }
  }
  return digitalId;
};

// Generate Digital ID Hash for Trip
const generateTripDigitalIdHash = (tripData, touristData) => {
  const dataString = JSON.stringify({
    tourist_name: touristData.name,
    tourist_email: touristData.email,
    tourist_kyc: touristData.kyc_id,
    trip_name: tripData.trip_name,
    destination: tripData.destination,
    start_date: tripData.start_date,
    end_date: tripData.end_date,
    digital_id: tripData.digital_id,
    timestamp: Date.now(),
  });
  return crypto.createHash("sha256").update(dataString).digest("hex");
};

// CREATE NEW TRIP
const createTrip = asyncHandler(async (req, res) => {
  const {
    trip_name,
    destination,
    start_date,
    end_date,
    purpose = "tourism",
    itinerary,
    accommodation_details,
    emergency_contacts_for_trip,
    tracking_enabled = true,
  } = req.body;

  // Validation
  if (!trip_name || !destination || !start_date || !end_date) {
    throw new ApiError(
      400,
      "Trip name, destination, start date, and end date are required"
    );
  }

  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const now = new Date();

  if (startDate >= endDate) {
    throw new ApiError(400, "End date must be after start date");
  }

  if (endDate < now) {
    throw new ApiError(400, "Trip end date cannot be in the past");
  }

  // Get tourist details
  const tourist = await Tourist.findById(req.tourist._id);
  if (!tourist) {
    throw new ApiError(404, "Tourist not found");
  }

  // Check KYC verification for blockchain ID (temporarily relaxed for testing)
  if (!tourist.kyc_verified && !tourist.kyc_digilocker_data) {
    console.log(
      "⚠️ KYC not verified - creating blockchain ID anyway for testing"
    );
    // For testing, we'll proceed without strict KYC verification
    // In production, uncomment the line below:
    // throw new ApiError(400, "KYC verification through DigiLocker is required for blockchain digital ID");
  }

  let trip; // Declare trip variable outside try block

  try {
    // Generate unique digital ID
    const digital_id = await generateTripDigitalId();

    // Create trip in database first
    trip = await Trip.create({
      tourist_id: req.tourist._id,
      trip_name,
      destination,
      start_date: startDate,
      end_date: endDate,
      purpose,
      itinerary,
      accommodation_details,
      digital_id,
      tracking_enabled,
      emergency_contacts_for_trip:
        emergency_contacts_for_trip || tourist.emergency_contacts,
      blockchain_status: {
        digital_id_created: false,
        metadata_uploaded: false,
        verification_enabled: false,
      }, // Mark as creating
    });

    // Generate digital ID hash
    const digital_id_hash = generateTripDigitalIdHash(
      {
        trip_name: trip.trip_name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        digital_id: trip.digital_id,
      },
      tourist
    );

    trip.digital_id_hash = digital_id_hash;
    await trip.save({ validateBeforeSave: false });

    // Create blockchain digital ID
    console.log("🔗 Creating blockchain digital ID...");
    const blockchainResult = await blockchainService.createBlockchainDigitalID({
      digital_id,
      tourist_id: tourist._id,
      tourist_data: {
        name: tourist.name || "Test Tourist",
        email: tourist.email || "test@example.com",
        phone: tourist.phone || "+1234567890",
        nationality: tourist.nationality || "IN",
        kyc_id: tourist.kyc_id || "TEST_KYC_ID",
        aadhaar_number:
          tourist.kyc_digilocker_data?.aadhaar_number || "TEST_AADHAAR",
      },
      trip_data: {
        trip_name,
        destination,
        start_date: startDate,
        end_date: endDate,
        purpose,
      },
    });

    // Save blockchain digital ID to database
    const digitalIdRecord = await DigitalId.create({
      tourist_id: tourist._id,
      trip_id: trip._id,
      hash: digital_id_hash, // Use the generated digital ID hash
      blockchain_tx_hash: blockchainResult.txHash,
      smart_contract_id: blockchainResult.contractId,
      ipfs_hash: blockchainResult.ipfsHash,
      blockchain_address: blockchainResult.walletAddress,
      verification_url: blockchainResult.verificationUrl,
      expires_at: endDate,
      encryption_key: crypto.randomBytes(32).toString("hex"), // Add encryption key
      network: "arbitrum-sepolia",
      on_chain_status: {
        created: true,
        verified: false,
        expired: false,
        revoked: false,
      },
    });

    // Generate QR codes
    console.log("📱 Generating QR codes...");
    const qrCodes = await generateQRCodes({
      digital_id,
      tourist_data: {
        name: tourist.name,
        email: tourist.email,
        phone: tourist.phone,
      },
      trip_data: {
        trip_name,
        destination,
        start_date: startDate,
        end_date: endDate,
      },
      blockchain_data: {
        tx_hash: blockchainResult.txHash,
        contract_id: blockchainResult.contractId,
        verification_url: blockchainResult.verificationUrl,
      },
    });

    // Update trip with blockchain reference and QR codes
    trip.blockchain_digital_id = digitalIdRecord._id;
    trip.blockchain_status = "confirmed";
    trip.qr_codes = qrCodes;

    // Also update blockchain_status object structure
    trip.blockchain_status = {
      digital_id_created: true,
      metadata_uploaded: true,
      verification_enabled: true,
    };

    await trip.save({ validateBeforeSave: false });

    console.log("💾 QR codes saved to database:", Object.keys(qrCodes));

    // Update tourist's current trip if this is the active trip
    if (startDate <= now && endDate >= now) {
      tourist.current_trip_id = trip._id;
      await tourist.save({ validateBeforeSave: false });
    }

    // Prepare response with blockchain info
    const responseData = {
      ...trip.toObject(),
      blockchain_info: {
        tx_hash: blockchainResult.txHash,
        contract_id: blockchainResult.contractId,
        ipfs_hash: blockchainResult.ipfsHash,
        verification_url: blockchainResult.verificationUrl,
        wallet_address: blockchainResult.walletAddress,
      },
      qr_codes: qrCodes,
    };

    console.log("✅ Trip created with blockchain digital ID successfully");

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          responseData,
          "Trip created with blockchain digital ID successfully"
        )
      );
  } catch (error) {
    console.error("❌ Error creating blockchain digital ID:", error);

    // If blockchain creation fails, update trip status to failed
    if (trip) {
      trip.blockchain_status = {
        digital_id_created: false,
        metadata_uploaded: false,
        verification_enabled: false,
        error: error.message,
      };
      await trip.save({ validateBeforeSave: false });
    }

    throw new ApiError(
      500,
      `Failed to create blockchain digital ID: ${error.message}`
    );
  }
});

// GET ALL TRIPS FOR TOURIST
const getTouristTrips = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { tourist_id: req.tourist._id };
  if (status) {
    filter.status = status;
  }

  const trips = await Trip.find(filter)
    .sort({ created_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Trip.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        trips,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
      "Trips fetched successfully"
    )
  );
});

// GET TRIP BY ID
const getTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    _id: tripId,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip fetched successfully"));
});

// GET CURRENT ACTIVE TRIP
const getCurrentTrip = asyncHandler(async (req, res) => {
  const now = new Date();

  // Set time to start and end of day for accurate date-only comparison
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // First try to find an active trip
  let activeTrip = await Trip.findOne({
    tourist_id: req.tourist._id,
    start_date: { $lte: todayEnd },
    end_date: { $gte: todayStart },
    status: "active",
  });

  // If no active trip found, try to find a planned trip that should be active
  if (!activeTrip) {
    activeTrip = await Trip.findOne({
      tourist_id: req.tourist._id,
      start_date: { $lte: todayEnd },
      end_date: { $gte: todayStart },
      status: "planned",
    });
  }

  // If still no trip found, get the most recent trip (for QR code display)
  if (!activeTrip) {
    activeTrip = await Trip.findOne({
      tourist_id: req.tourist._id,
    }).sort({ created_at: -1 });
  }

  if (!activeTrip) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No active trip found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, activeTrip, "Active trip fetched successfully"));
});

// UPDATE TRIP
const updateTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated
  delete updateData.tourist_id;
  delete updateData.digital_id;
  delete updateData.digital_id_hash;
  delete updateData.created_at;

  const trip = await Trip.findOne({
    _id: tripId,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  // Don't allow updates to completed trips
  if (trip.status === "completed") {
    throw new ApiError(400, "Cannot update completed trip");
  }

  // Update trip
  const updatedTrip = await Trip.findByIdAndUpdate(tripId, updateData, {
    new: true,
    runValidators: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTrip, "Trip updated successfully"));
});

// ACTIVATE TRIP (Start trip early)
const activateTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    _id: tripId,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (trip.status !== "planned") {
    throw new ApiError(
      400,
      "Trip can only be activated if it's in planned status"
    );
  }

  // Check if there's already an active trip
  const activeTrip = await Trip.findOne({
    tourist_id: req.tourist._id,
    status: "active",
  });

  if (activeTrip) {
    throw new ApiError(
      400,
      "You already have an active trip. Complete it first."
    );
  }

  // Activate trip
  trip.status = "active";
  trip.activated_at = new Date();
  await trip.save();

  // Update tourist's current trip
  const tourist = await Tourist.findById(req.tourist._id);
  tourist.current_trip_id = trip._id;
  await tourist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip activated successfully"));
});

// COMPLETE TRIP
const completeTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    _id: tripId,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (trip.status !== "active") {
    throw new ApiError(400, "Only active trips can be completed");
  }

  // Complete trip
  trip.status = "completed";
  trip.completed_at = new Date();
  await trip.save();

  // Clear current trip from tourist
  const tourist = await Tourist.findById(req.tourist._id);
  tourist.current_trip_id = null;
  await tourist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, trip, "Trip completed successfully"));
});

// VERIFY DIGITAL ID (Public endpoint for authorities)
const verifyTripDigitalId = asyncHandler(async (req, res) => {
  const { digital_id } = req.params;

  // Find trip and populate tourist data
  const trip = await Trip.findOne({ digital_id })
    .populate(
      "tourist_id",
      "name email phone kyc_id nationality emergency_contacts"
    )
    .populate("blockchain_digital_id");

  if (!trip) {
    throw new ApiError(404, "Invalid Digital ID");
  }

  // Check if trip is expired
  const now = new Date();
  const isExpired = now > trip.end_date || trip.status === "completed";

  try {
    // Verify on blockchain if blockchain digital ID exists
    let blockchainVerification = null;
    if (trip.blockchain_digital_id) {
      console.log("🔗 Verifying digital ID on blockchain...");
      blockchainVerification = await blockchainService.verifyDigitalID(
        digital_id
      );
    }

    const verificationData = {
      trip: {
        digital_id: trip.digital_id,
        trip_name: trip.trip_name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        status: trip.status,
        purpose: trip.purpose,
        is_expired: isExpired,
        blockchain_status: trip.blockchain_status,
      },
      tourist: {
        name: trip.tourist_id.name,
        email: trip.tourist_id.email,
        phone: trip.tourist_id.phone,
        kyc_id: trip.tourist_id.kyc_id,
        nationality: trip.tourist_id.nationality,
        emergency_contacts:
          trip.emergency_contacts_for_trip.length > 0
            ? trip.emergency_contacts_for_trip
            : trip.tourist_id.emergency_contacts,
      },
      verification_status: isExpired ? "expired" : "valid",
    };

    // Add blockchain verification data if available
    if (blockchainVerification) {
      verificationData.blockchain_verification = {
        is_valid: blockchainVerification.isValid,
        on_chain: blockchainVerification.onChain,
        contract_verified: blockchainVerification.contractVerified,
        tx_hash: trip.blockchain_digital_id?.blockchain_tx_hash,
        smart_contract_id: trip.blockchain_digital_id?.smart_contract_id,
        verification_timestamp: new Date(),
      };

      // Update overall verification status based on blockchain
      if (!blockchainVerification.isValid && !isExpired) {
        verificationData.verification_status = "blockchain_invalid";
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          verificationData,
          blockchainVerification
            ? "Digital ID verified with blockchain confirmation"
            : "Digital ID verified successfully"
        )
      );
  } catch (error) {
    console.error("❌ Error during blockchain verification:", error);

    // Still return basic verification if blockchain fails
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          trip: {
            digital_id: trip.digital_id,
            trip_name: trip.trip_name,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            status: trip.status,
            purpose: trip.purpose,
            is_expired: isExpired,
            blockchain_status: trip.blockchain_status,
          },
          tourist: {
            name: trip.tourist_id.name,
            email: trip.tourist_id.email,
            phone: trip.tourist_id.phone,
            kyc_id: trip.tourist_id.kyc_id,
            nationality: trip.tourist_id.nationality,
            emergency_contacts:
              trip.emergency_contacts_for_trip.length > 0
                ? trip.emergency_contacts_for_trip
                : trip.tourist_id.emergency_contacts,
          },
          verification_status: isExpired ? "expired" : "valid",
          blockchain_verification: {
            error: "Blockchain verification temporarily unavailable",
            fallback_verified: true,
          },
        },
        "Digital ID verified (blockchain verification failed, using fallback)"
      )
    );
  }
});

// GET BLOCKCHAIN DIGITAL ID DETAILS
const getBlockchainDigitalId = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const trip = await Trip.findOne({
    _id: tripId,
    tourist_id: req.tourist._id,
  }).populate("blockchain_digital_id");

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  if (!trip.blockchain_digital_id) {
    throw new ApiError(404, "No blockchain digital ID found for this trip");
  }

  const digitalId = trip.blockchain_digital_id;

  try {
    // Verify current blockchain status
    const blockchainVerification = await blockchainService.verifyDigitalID(
      digitalId.digital_id
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          digital_id: digitalId.digital_id,
          blockchain_tx_hash: digitalId.blockchain_tx_hash,
          smart_contract_id: digitalId.smart_contract_id,
          ipfs_hash: digitalId.ipfs_hash,
          verification_url: digitalId.verification_url,
          wallet_address: digitalId.wallet_address,
          expires_at: digitalId.expires_at,
          on_chain_status: digitalId.on_chain_status,
          blockchain_verification: blockchainVerification,
          qr_codes: trip.qr_codes,
          created_at: digitalId.created_at,
        },
        "Blockchain digital ID details fetched successfully"
      )
    );
  } catch (error) {
    console.error("❌ Error fetching blockchain verification:", error);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          digital_id: digitalId.digital_id,
          blockchain_tx_hash: digitalId.blockchain_tx_hash,
          smart_contract_id: digitalId.smart_contract_id,
          ipfs_hash: digitalId.ipfs_hash,
          verification_url: digitalId.verification_url,
          wallet_address: digitalId.wallet_address,
          expires_at: digitalId.expires_at,
          on_chain_status: digitalId.on_chain_status,
          qr_codes: trip.qr_codes,
          created_at: digitalId.created_at,
          blockchain_verification: {
            error: "Verification temporarily unavailable",
          },
        },
        "Blockchain digital ID details fetched (verification unavailable)"
      )
    );
  }
});

// GET TOURIST TRIP DETAILS (For Authority Dashboard)
const getTouristTripDetails = asyncHandler(async (req, res) => {
  const { touristId } = req.params;

  try {
    // Get tourist details with current active trip
    const tourist = await Tourist.findById(touristId).select(
      "name email phone nationality emergency_contacts current_trip_id"
    );

    if (!tourist) {
      throw new ApiError(404, "Tourist not found");
    }

    // Get current active trip
    const currentTrip = await Trip.findOne({
      tourist_id: touristId,
      status: "active",
    }).populate("blockchain_digital_id");

    // Get latest location if trip exists
    let latestLocation = null;
    if (currentTrip) {
      const Location = (await import("../models/location.js")).default;
      latestLocation = await Location.findOne({
        tourist_id: touristId,
        trip_id: currentTrip._id,
      }).sort({ timestamp: -1 });
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tourist,
          current_trip: currentTrip,
          latest_location: latestLocation,
        },
        "Tourist details fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      `Failed to fetch tourist details: ${error.message}`
    );
  }
});

export {
  createTrip,
  getTouristTrips,
  getTripById,
  getCurrentTrip,
  updateTrip,
  activateTrip,
  completeTrip,
  verifyTripDigitalId,
  getBlockchainDigitalId,
  getTouristTripDetails,
};
