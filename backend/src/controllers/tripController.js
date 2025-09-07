import { asyncHandler } from "../utils/asyncHandler.js";
import Trip from "../models/trip.js";
import Tourist from "../models/tourist.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";

// Generate Digital ID (8-character alphanumeric for trips)
const generateTripDigitalId = async () => {
  let digitalId;
  let isUnique = false;

  while (!isUnique) {
    // Generate 8-character ID with letters and numbers
    digitalId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existingTrip = await Trip.findOne({ digital_id: digitalId });
    if (!existingTrip) {
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
    local_contact,
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

  // Generate digital ID for this trip
  const digital_id = await generateTripDigitalId();

  // Get tourist details for hash generation
  const tourist = await Tourist.findById(req.tourist._id);

  // Create trip
  const trip = await Trip.create({
    tourist_id: req.tourist._id,
    trip_name,
    destination,
    start_date: startDate,
    end_date: endDate,
    purpose,
    itinerary,
    accommodation_details,
    local_contact,
    digital_id,
    tracking_enabled,
    emergency_contacts_for_trip:
      emergency_contacts_for_trip || tourist.emergency_contacts,
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

  // Update tourist's current trip if this is the active trip
  if (startDate <= now && endDate >= now) {
    tourist.current_trip_id = trip._id;
    await tourist.save({ validateBeforeSave: false });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, trip, "Trip created successfully"));
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

  const activeTrip = await Trip.findOne({
    tourist_id: req.tourist._id,
    start_date: { $lte: now },
    end_date: { $gte: now },
    status: "active",
  });

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

  const trip = await Trip.findOne({ digital_id }).populate(
    "tourist_id",
    "name email phone kyc_id nationality emergency_contacts"
  );

  if (!trip) {
    throw new ApiError(404, "Invalid Digital ID");
  }

  // Check if trip is expired
  const now = new Date();
  const isExpired = now > trip.end_date || trip.status === "completed";

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
      },
      "Digital ID verified successfully"
    )
  );
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
};
