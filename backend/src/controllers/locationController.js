import { asyncHandler } from "../utils/asyncHandler.js";
import Location from "../models/location.js";
import Trip from "../models/trip.js";
import GeoFence from "../models/geofence.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if location is within any geo-fence
const checkGeoFences = async (latitude, longitude) => {
  const geoFences = await GeoFence.find({ is_active: true });
  const violations = [];
  let currentGeoFence = null;
  let isInSafeZone = false;

  for (const fence of geoFences) {
    const distance = calculateDistance(
      latitude,
      longitude,
      fence.latitude,
      fence.longitude
    );

    // Check if within geo-fence radius
    if (distance <= fence.radius_km * 1000) {
      currentGeoFence = fence;

      // Check zone type
      if (fence.zone_type === "safe_zone") {
        isInSafeZone = true;
      } else if (
        fence.zone_type === "danger_zone" ||
        fence.zone_type === "restricted_zone"
      ) {
        violations.push({
          fence_id: fence._id,
          fence_name: fence.name,
          zone_type: fence.zone_type,
          risk_level: fence.risk_level,
          distance: Math.round(distance),
        });
      }
    }
  }

  return {
    isInSafeZone,
    currentGeoFence: currentGeoFence?._id || null,
    violations,
  };
};

// START LOCATION TRACKING
const startLocationTracking = asyncHandler(async (req, res) => {
  const { trip_id } = req.body;

  // Verify trip belongs to tourist and is active
  const trip = await Trip.findOne({
    _id: trip_id,
    tourist_id: req.tourist._id,
    status: { $in: ["planned", "active"] },
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found or not active");
  }

  // Activate trip if it's planned and within start date
  const now = new Date();
  if (trip.status === "planned" && trip.start_date <= now) {
    trip.status = "active";
    trip.activated_at = now;
    await trip.save();
  }

  // Update trip tracking status
  trip.tracking_enabled = true;
  await trip.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { trip_id, tracking_enabled: true },
        "Location tracking started"
      )
    );
});

// STOP LOCATION TRACKING
const stopLocationTracking = asyncHandler(async (req, res) => {
  const { trip_id } = req.body;

  const trip = await Trip.findOne({
    _id: trip_id,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  trip.tracking_enabled = false;
  await trip.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { trip_id, tracking_enabled: false },
        "Location tracking stopped"
      )
    );
});

// Convert connection quality string to numeric value
const convertConnectionQuality = (quality) => {
  const qualityMap = {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  };

  // If it's already a number, return it
  if (typeof quality === "number") {
    return quality;
  }

  // If it's a string, convert it
  return qualityMap[quality?.toLowerCase()] || 2; // Default to 'fair' if unknown
};

// UPDATE LOCATION (Called via Socket.IO and HTTP)
const updateLocation = async (locationData) => {
  try {
    const {
      tourist_id,
      trip_id,
      coordinates,
      battery_level,
      connection_quality,
    } = locationData;

    // Verify trip exists and is active
    const trip = await Trip.findOne({
      _id: trip_id,
      tourist_id,
      status: "active",
      tracking_enabled: true,
    });

    if (!trip) {
      throw new Error("Trip not found or tracking not enabled");
    }

    // Check geo-fences
    const geoFenceCheck = await checkGeoFences(
      coordinates.latitude,
      coordinates.longitude
    );

    // Create location record
    const location = await Location.create({
      tourist_id,
      trip_id,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: coordinates.accuracy || null,
      altitude: coordinates.altitude || null,
      speed: coordinates.speed || null,
      timestamp: new Date(),
      source: "app",
      is_in_safe_zone: geoFenceCheck.isInSafeZone,
      current_geofence: geoFenceCheck.currentGeoFence,
      device_info: {
        battery_level: battery_level || null,
        signal_strength: convertConnectionQuality(connection_quality),
        device_id: locationData.device_id || null,
      },
    });

    // Update trip's last location update
    trip.last_location_update = new Date();
    await trip.save();

    // Return result with geo-fence info
    return {
      success: true,
      location_id: location._id,
      safety_status: {
        is_safe: geoFenceCheck.isInSafeZone,
        violations: geoFenceCheck.violations,
        current_zone: geoFenceCheck.currentGeoFence,
      },
    };
  } catch (error) {
    console.error("Location update error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// HTTP endpoint for location update
const updateLocationHTTP = asyncHandler(async (req, res) => {
  const locationData = {
    tourist_id: req.tourist._id,
    ...req.body,
  };

  const result = await updateLocation(locationData);

  if (!result.success) {
    throw new ApiError(400, result.error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Location updated successfully"));
});

// GET CURRENT LOCATION
const getCurrentLocation = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;

  // Verify trip belongs to tourist
  const trip = await Trip.findOne({
    _id: trip_id,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  // Get latest location for this trip
  const location = await Location.findOne({
    trip_id,
    tourist_id: req.tourist._id,
  })
    .sort({ timestamp: -1 })
    .populate("current_geofence", "name zone_type risk_level");

  if (!location) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No location data found for this trip"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, location, "Current location fetched successfully")
    );
});

// GET LOCATION HISTORY
const getLocationHistory = asyncHandler(async (req, res) => {
  const { trip_id } = req.params;
  const { limit = 50, page = 1 } = req.query;

  // Verify trip belongs to tourist
  const trip = await Trip.findOne({
    _id: trip_id,
    tourist_id: req.tourist._id,
  });

  if (!trip) {
    throw new ApiError(404, "Trip not found");
  }

  const locations = await Location.find({
    trip_id,
    tourist_id: req.tourist._id,
  })
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("current_geofence", "name zone_type risk_level");

  const total = await Location.countDocuments({
    trip_id,
    tourist_id: req.tourist._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        locations,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
      "Location history fetched successfully"
    )
  );
});

// CHECK NEARBY GEO-FENCES
const checkNearbyGeoFences = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  const geoFences = await GeoFence.find({ is_active: true });
  const nearbyFences = [];

  for (const fence of geoFences) {
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      fence.latitude,
      fence.longitude
    );

    if (distance <= radius) {
      nearbyFences.push({
        ...fence.toObject(),
        distance: Math.round(distance),
        is_within: distance <= fence.radius_km * 1000,
      });
    }
  }

  // Sort by distance
  nearbyFences.sort((a, b) => a.distance - b.distance);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        nearbyFences,
        "Nearby geo-fences fetched successfully"
      )
    );
});

export {
  startLocationTracking,
  stopLocationTracking,
  updateLocation,
  updateLocationHTTP,
  getCurrentLocation,
  getLocationHistory,
  checkNearbyGeoFences,
  calculateDistance,
  checkGeoFences,
  convertConnectionQuality,
};
