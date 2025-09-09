import { asyncHandler } from "../utils/asyncHandler.js";
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

// CREATE GEOFENCE
const createGeoFence = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    latitude,
    longitude,
    radius_km,
    zone_type = "safe_zone",
    risk_level = "low",
    entry_allowed = true,
    time_restrictions,
    emergency_contact,
    alert_authorities = false,
    auto_alert_tourist = true,
  } = req.body;

  // Validation
  if (!name || !latitude || !longitude || !radius_km) {
    throw new ApiError(
      400,
      "Name, latitude, longitude, and radius are required"
    );
  }

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(400, "Latitude must be between -90 and 90");
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Longitude must be between -180 and 180");
  }

  if (radius_km <= 0) {
    throw new ApiError(400, "Radius must be greater than 0");
  }

  // Check if geofence already exists at similar location
  const existingGeoFences = await GeoFence.find({ is_active: true });

  for (const fence of existingGeoFences) {
    const distance = calculateDistance(
      latitude,
      longitude,
      fence.latitude,
      fence.longitude
    );
    if (distance < 100) {
      // Within 100 meters
      throw new ApiError(
        409,
        `A geofence already exists within 100 meters of this location: ${fence.name}`
      );
    }
  }

  // Create geofence
  const geoFence = await GeoFence.create({
    name,
    description,
    latitude,
    longitude,
    radius_km,
    zone_type,
    risk_level,
    entry_allowed,
    time_restrictions,
    emergency_contact,
    alert_authorities,
    auto_alert_tourist,
    created_by: req.tourist?._id || null, // Optional if called by admin
    is_active: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, geoFence, "Geofence created successfully"));
});

// GET ALL GEOFENCES
const getAllGeoFences = asyncHandler(async (req, res) => {
  const {
    zone_type,
    risk_level,
    is_active = true,
    latitude,
    longitude,
    radius = 10000,
    page = 1,
    limit = 50,
  } = req.query;

  const filter = { is_active };

  if (zone_type) {
    filter.zone_type = zone_type;
  }

  if (risk_level) {
    filter.risk_level = risk_level;
  }

  let geoFences = await GeoFence.find(filter)
    .sort({ created_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("created_by", "name email");

  // If location provided, filter by distance and add distance field
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius) / 1000;

    geoFences = geoFences.filter((fence) => {
      const distance = calculateDistance(
        lat,
        lng,
        fence.latitude,
        fence.longitude
      );
      fence._doc.distance_meters = Math.round(distance);
      return distance <= radius;
    });

    // Sort by distance
    geoFences.sort((a, b) => a._doc.distance_meters - b._doc.distance_meters);
  }

  const total = await GeoFence.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        geofences: geoFences,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
      "Geofences fetched successfully"
    )
  );
});

// GET GEOFENCE BY ID
const getGeoFenceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const geoFence = await GeoFence.findById(id).populate(
    "created_by",
    "name email"
  );

  if (!geoFence) {
    throw new ApiError(404, "Geofence not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, geoFence, "Geofence fetched successfully"));
});

// UPDATE GEOFENCE
const updateGeoFence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateData.created_by;
  delete updateData.entry_count;
  delete updateData.alert_count;
  delete updateData.last_entry;

  const geoFence = await GeoFence.findById(id);

  if (!geoFence) {
    throw new ApiError(404, "Geofence not found");
  }

  // Authorization check (if needed)
  if (
    req.tourist &&
    geoFence.created_by &&
    geoFence.created_by.toString() !== req.tourist._id.toString()
  ) {
    throw new ApiError(403, "You can only update geofences you created");
  }

  const updatedGeoFence = await GeoFence.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("created_by", "name email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedGeoFence, "Geofence updated successfully")
    );
});

// DELETE GEOFENCE
const deleteGeoFence = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const geoFence = await GeoFence.findById(id);

  if (!geoFence) {
    throw new ApiError(404, "Geofence not found");
  }

  // Authorization check (if needed)
  if (
    req.tourist &&
    geoFence.created_by &&
    geoFence.created_by.toString() !== req.tourist._id.toString()
  ) {
    throw new ApiError(403, "You can only delete geofences you created");
  }

  // Soft delete by setting is_active to false
  geoFence.is_active = false;
  await geoFence.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { id }, "Geofence deleted successfully"));
});

// CHECK LOCATION AGAINST GEOFENCES
const checkLocationAgainstGeoFences = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const geoFences = await GeoFence.find({ is_active: true });
  const results = [];
  let isInSafeZone = false;
  let highestRiskLevel = "very_low";

  for (const fence of geoFences) {
    const distance = calculateDistance(
      lat,
      lng,
      fence.latitude,
      fence.longitude
    );
    const isWithinFence = distance <= fence.radius_km * 1000;

    if (isWithinFence) {
      results.push({
        geofence: fence,
        distance_meters: Math.round(distance),
        is_within: true,
        zone_type: fence.zone_type,
        risk_level: fence.risk_level,
      });

      // Update safety status
      if (fence.zone_type === "safe_zone") {
        isInSafeZone = true;
      }

      // Track highest risk level
      const riskLevels = ["very_low", "low", "medium", "high", "critical"];
      if (
        riskLevels.indexOf(fence.risk_level) >
        riskLevels.indexOf(highestRiskLevel)
      ) {
        highestRiskLevel = fence.risk_level;
      }
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        location: { latitude: lat, longitude: lng },
        is_in_safe_zone: isInSafeZone,
        highest_risk_level: highestRiskLevel,
        geofences_within: results,
        total_violations: results.filter(
          (r) =>
            r.zone_type === "danger_zone" || r.zone_type === "restricted_zone"
        ).length,
      },
      "Location checked against geofences"
    )
  );
});

// GET NEARBY GEOFENCES
const getNearbyGeoFences = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const searchRadius = parseFloat(radius);

  const geoFences = await GeoFence.find({ is_active: true });
  const nearbyFences = [];

  for (const fence of geoFences) {
    const distance = calculateDistance(
      lat,
      lng,
      fence.latitude,
      fence.longitude
    );

    if (distance <= searchRadius) {
      nearbyFences.push({
        ...fence.toObject(),
        distance_meters: Math.round(distance),
        is_within_fence: distance <= fence.radius_km * 1000,
      });
    }
  }

  // Sort by distance
  nearbyFences.sort((a, b) => a.distance_meters - b.distance_meters);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        location: { latitude: lat, longitude: lng },
        search_radius_meters: searchRadius,
        nearby_geofences: nearbyFences,
        count: nearbyFences.length,
      },
      "Nearby geofences fetched successfully"
    )
  );
});

// INCREMENT ENTRY COUNT (used internally)
const incrementEntryCount = async (geoFenceId) => {
  try {
    await GeoFence.findByIdAndUpdate(geoFenceId, {
      $inc: { entry_count: 1 },
      last_entry: new Date(),
    });
  } catch (error) {
    console.error("Error incrementing entry count:", error);
  }
};

export {
  createGeoFence,
  getAllGeoFences,
  getGeoFenceById,
  updateGeoFence,
  deleteGeoFence,
  checkLocationAgainstGeoFences,
  getNearbyGeoFences,
  incrementEntryCount,
};
