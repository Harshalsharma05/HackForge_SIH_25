import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Tourist from "../models/tourist.js";
import Trip from "../models/trip.js";
import Location from "../models/location.js";
import Alert from "../models/alerts.js";
import Geofence from "../models/geofence.js";
import DigitalId from "../models/digitalId.js";

// GET DASHBOARD OVERVIEW STATS
const getDashboardStats = asyncHandler(async (req, res) => {
  const adminJurisdiction = req.admin.jurisdiction;
  const adminZones = req.admin.assigned_zones || [];

  // Build filter based on admin jurisdiction
  let locationFilter = {};
  let geofenceFilter = {};

  if (req.admin.role !== "admin") {
    // Non-super admin: filter by assigned zones
    if (adminZones.length > 0 && !adminZones.includes("all")) {
      geofenceFilter.zone_id = { $in: adminZones };
    }
  }

  try {
    // Get stats for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Active tourists (with current trips)
    const activeTourists = await Trip.countDocuments({
      status: "active",
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() },
    });

    // Total tourists in system
    const totalTourists = await Tourist.countDocuments({
      is_verified: true,
    });

    // Recent alerts (last 24 hours)
    const recentAlerts = await Alert.countDocuments({
      created_at: { $gte: last24Hours },
    });

    // High priority alerts
    const highPriorityAlerts = await Alert.countDocuments({
      severity: { $in: ["high", "critical"] },
      status: { $in: ["active", "acknowledged"] },
    });

    // Geofence violations (last 24 hours)
    const geofenceViolations = await Alert.countDocuments({
      alert_type: "geofence_violation",
      created_at: { $gte: last24Hours },
    });

    // Digital IDs created (last 24 hours)
    const newDigitalIds = await DigitalId.countDocuments({
      created_at: { $gte: last24Hours },
    });

    // Active zones in jurisdiction
    const activeZones = await Geofence.countDocuments(geofenceFilter);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          overview: {
            active_tourists: activeTourists,
            total_tourists: totalTourists,
            recent_alerts: recentAlerts,
            high_priority_alerts: highPriorityAlerts,
            geofence_violations: geofenceViolations,
            new_digital_ids: newDigitalIds,
            active_zones: activeZones,
          },
          jurisdiction: {
            admin_role: req.admin.role,
            jurisdiction: adminJurisdiction,
            assigned_zones: adminZones,
          },
          last_updated: new Date(),
        },
        "Dashboard stats fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      `Failed to fetch dashboard stats: ${error.message}`
    );
  }
});

// GET ACTIVE TOURISTS WITH LOCATIONS
const getActiveTourists = asyncHandler(async (req, res) => {
  const { zone, status, limit = 100 } = req.query;
  const adminZones = req.admin.assigned_zones || [];

  try {
    // Build aggregation pipeline
    const pipeline = [
      // Match active trips
      {
        $match: {
          status: "active",
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() },
        },
      },
      // Lookup tourist details
      {
        $lookup: {
          from: "tourists",
          localField: "tourist_id",
          foreignField: "_id",
          as: "tourist",
        },
      },
      {
        $unwind: "$tourist",
      },
      // Lookup latest location
      {
        $lookup: {
          from: "locations",
          let: { touristId: "$tourist_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tourist_id", "$$touristId"] },
              },
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "latest_location",
        },
      },
      // Lookup digital ID
      {
        $lookup: {
          from: "digitalids",
          localField: "_id",
          foreignField: "trip_id",
          as: "digital_id",
        },
      },
      // Project required fields
      {
        $project: {
          trip_id: "$_id",
          digital_id: "$digital_id",
          trip_name: 1,
          destination: 1,
          status: 1,
          start_date: 1,
          end_date: 1,
          tourist: {
            _id: "$tourist._id",
            name: "$tourist.name",
            email: "$tourist.email",
            phone: "$tourist.phone",
            nationality: "$tourist.nationality",
            emergency_contacts: "$tourist.emergency_contacts",
          },
          location: {
            $arrayElemAt: ["$latest_location", 0],
          },
          blockchain_status: 1,
          qr_codes: 1,
        },
      },
      // Filter only tourists with recent locations (last 1 hour)
      {
        $match: {
          "location.timestamp": {
            $gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      },
      { $limit: parseInt(limit) },
    ];

    // Filter by zone if admin has restricted access
    if (
      req.admin.role !== "admin" &&
      adminZones.length > 0 &&
      !adminZones.includes("all")
    ) {
      // Add zone filtering logic here if needed
      // This would require zone mapping in location data
    }

    const activeTourists = await Trip.aggregate(pipeline);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tourists: activeTourists,
          count: activeTourists.length,
          admin_jurisdiction: {
            role: req.admin.role,
            zones: adminZones,
          },
          filters_applied: {
            zone: zone || "all",
            status: status || "active",
            limit: parseInt(limit),
          },
          last_updated: new Date(),
        },
        "Active tourists fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      `Failed to fetch active tourists: ${error.message}`
    );
  }
});

// GET RECENT ALERTS FOR DASHBOARD
const getRecentAlerts = asyncHandler(async (req, res) => {
  const { severity, status, hours = 24, limit = 50 } = req.query;

  try {
    // Build filter
    const filter = {
      created_at: {
        $gte: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000),
      },
    };

    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    // Get alerts with tourist and trip details
    const alerts = await Alert.find(filter)
      .populate("tourist_id", "name email phone nationality")
      .populate("trip_id", "trip_name destination digital_id")
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    // Group alerts by severity for quick overview
    const alertsBySeverity = await Alert.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
          latest: { $max: "$created_at" },
        },
      },
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          alerts,
          summary: {
            total: alerts.length,
            by_severity: alertsBySeverity,
          },
          filters_applied: {
            hours: parseInt(hours),
            severity: severity || "all",
            status: status || "all",
            limit: parseInt(limit),
          },
          last_updated: new Date(),
        },
        "Recent alerts fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch recent alerts: ${error.message}`);
  }
});

// GET GEOFENCE DATA FOR MAP
const getGeofenceData = asyncHandler(async (req, res) => {
  const adminZones = req.admin.assigned_zones || [];

  try {
    // Build filter based on admin jurisdiction
    let filter = {};

    if (
      req.admin.role !== "admin" &&
      adminZones.length > 0 &&
      !adminZones.includes("all")
    ) {
      filter.zone_id = { $in: adminZones };
    }

    // Get geofences with recent violation counts
    const geofences = await Geofence.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "alerts",
          let: { geofenceId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$geofence_id", "$$geofenceId"] },
                alert_type: "geofence_violation",
                created_at: {
                  $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
              },
            },
            { $count: "violations" },
          ],
          as: "recent_violations",
        },
      },
      {
        $project: {
          zone_id: 1,
          zone_name: 1,
          zone_type: 1,
          coordinates: 1,
          center_lat: 1,
          center_lng: 1,
          radius: 1,
          risk_level: 1,
          description: 1,
          is_active: 1,
          recent_violations: {
            $ifNull: [
              { $arrayElemAt: ["$recent_violations.violations", 0] },
              0,
            ],
          },
        },
      },
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          geofences,
          admin_access: {
            role: req.admin.role,
            jurisdiction: req.admin.jurisdiction,
            assigned_zones: adminZones,
          },
          total_zones: geofences.length,
          last_updated: new Date(),
        },
        "Geofence data fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch geofence data: ${error.message}`);
  }
});

// GET LIVE MAP DATA (Combined endpoint for real-time map)
const getLiveMapData = asyncHandler(async (req, res) => {
  try {
    // Get active tourists with locations
    const tourists = await Trip.aggregate([
      {
        $match: {
          status: "active",
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date() },
        },
      },
      {
        $lookup: {
          from: "tourists",
          localField: "tourist_id",
          foreignField: "_id",
          as: "tourist",
        },
      },
      { $unwind: "$tourist" },
      {
        $lookup: {
          from: "locations",
          let: { touristId: "$tourist_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tourist_id", "$$touristId"] },
                timestamp: {
                  $gte: new Date(Date.now() - 60 * 60 * 1000), // Last 1 hour
                },
              },
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "location",
        },
      },
      {
        $match: {
          location: { $ne: [] }, // Only tourists with recent locations
        },
      },
      {
        $project: {
          trip_id: "$_id",
          digital_id: 1,
          tourist_name: "$tourist.name",
          tourist_phone: "$tourist.phone",
          destination: 1,
          location: { $arrayElemAt: ["$location", 0] },
          status: 1,
        },
      },
    ]);

    // Get active alerts
    const activeAlerts = await Alert.find({
      status: { $in: ["active", "acknowledged"] },
      created_at: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })
      .populate("tourist_id", "name")
      .populate("trip_id", "digital_id destination")
      .select(
        "alert_type severity location message created_at tourist_id trip_id"
      )
      .sort({ created_at: -1 })
      .limit(100);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tourists,
          alerts: activeAlerts,
          summary: {
            active_tourists: tourists.length,
            active_alerts: activeAlerts.length,
            high_priority_alerts: activeAlerts.filter((a) =>
              ["high", "critical"].includes(a.severity)
            ).length,
          },
          last_updated: new Date(),
        },
        "Live map data fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch live map data: ${error.message}`);
  }
});

export {
  getDashboardStats,
  getActiveTourists,
  getRecentAlerts,
  getGeofenceData,
  getLiveMapData,
};
