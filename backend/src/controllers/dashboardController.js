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
    // First, let's check total trips and active trips
    const totalTrips = await Trip.countDocuments({});
    const activeTripsCount = await Trip.countDocuments({
      status: "active",
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() },
    });

    console.log(`Debug: Total trips in database: ${totalTrips}`);
    console.log(`Debug: Active trips count: ${activeTripsCount}`);

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
      // Lookup latest location (without time restriction)
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
      // Lookup digital ID (with better field handling)
      {
        $lookup: {
          from: "digitalids",
          localField: "_id",
          foreignField: "trip_id",
          as: "digital_id_data",
        },
      },
      // Project required fields
      {
        $project: {
          trip_id: "$_id",
          digital_id: {
            $cond: {
              if: { $gt: [{ $size: "$digital_id_data" }, 0] },
              then: { $arrayElemAt: ["$digital_id_data.digital_id", 0] },
              else: null,
            },
          },
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
      // Include all active tourists regardless of location data
      // This ensures we see all tourists with active trips
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

    // Add more detailed debugging information
    console.log(
      `Debug: Found ${activeTourists.length} active tourists after aggregation`
    );
    console.log(
      `Debug: Query filters - zone: ${zone || "all"}, status: ${
        status || "active"
      }, limit: ${limit}`
    );

    // Check if we have trips but no tourists after join
    const activeTripsBeforeJoin = await Trip.find({
      status: "active",
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() },
    }).limit(5);

    console.log(
      `Debug: Sample active trips before join:`,
      activeTripsBeforeJoin.map((trip) => ({
        _id: trip._id,
        tourist_id: trip.tourist_id,
        trip_name: trip.trip_name,
        status: trip.status,
      }))
    );

    // Check if tourists exist
    const touristCount = await Tourist.countDocuments({});
    console.log(`Debug: Total tourists in database: ${touristCount}`);

    // Log some sample data for debugging
    if (activeTourists.length > 0) {
      console.log(`Debug: Sample tourist data:`, {
        trip_id: activeTourists[0].trip_id,
        tourist_name: activeTourists[0].tourist?.name,
        has_location: !!activeTourists[0].location,
        location_timestamp: activeTourists[0].location?.timestamp,
      });
    } else {
      console.log(
        `Debug: No tourists found after aggregation - checking individual components...`
      );
    }

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
    // First check total active trips
    const totalActiveTrips = await Trip.countDocuments({
      status: "active",
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() },
    });

    console.log(`Debug LiveMap: Total active trips: ${totalActiveTrips}`);

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
                // Removed timestamp filter to get any location data
              },
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "location",
        },
      },
      // Remove the strict location filter - include all active tourists
      // {
      //   $match: {
      //     location: { $ne: [] }, // Only tourists with recent locations
      //   },
      // },
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

    // Add debugging for live map data
    console.log(
      `Debug: Live map data - Found ${tourists.length} tourists after aggregation`
    );
    if (tourists.length > 0) {
      console.log(`Debug: Sample live tourist:`, {
        trip_id: tourists[0].trip_id,
        tourist_name: tourists[0].tourist_name,
        has_location: !!tourists[0].location,
        destination: tourists[0].destination,
      });

      // Show all tourists briefly
      console.log(
        `Debug: All tourists:`,
        tourists.map((t) => ({
          trip_id: t.trip_id,
          name: t.tourist_name,
          destination: t.destination,
          has_location: !!t.location,
        }))
      );
    } else {
      console.log(
        `Debug: No tourists found in live map data - investigating...`
      );

      // Check trips without tourist lookup
      const tripsOnly = await Trip.find({
        status: "active",
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() },
      }).limit(3);

      console.log(
        `Debug: Raw active trips:`,
        tripsOnly.map((t) => ({
          _id: t._id,
          tourist_id: t.tourist_id,
          trip_name: t.trip_name,
        }))
      );
    }

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
