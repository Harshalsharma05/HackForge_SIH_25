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

    // Active tourists (including recently completed trips within last 24 hours)
    const activeTourists = await Trip.countDocuments({
      status: { $in: ["active", "completed"] },
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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
    console.log('🔍 Fetching active tourists...');
    
    // Query for both active and recently completed trips to show tourists who might still be trackable
    const activeTrips = await Trip.find({
      status: { $in: ["active", "completed"] },
      start_date: { $lte: new Date() },
      // Include trips that ended recently (within the last day) as well as future trips
      end_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
    .populate('tourist_id', 'name email phone nationality emergency_contacts')
    .populate('blockchain_digital_id')
    .limit(parseInt(limit))
    .lean();

    console.log(`📊 Found ${activeTrips.length} active trips`);

    // Get latest locations for these trips
    const tripsWithLocations = await Promise.all(
      activeTrips.map(async (trip) => {
        if (!trip.tourist_id || !trip.tourist_id._id) {
          console.warn(`⚠️ Skipping trip ${trip._id} due to missing tourist_id`);
          return null;
        }
        try {
          const latestLocation = await Location.findOne({
            tourist_id: trip.tourist_id._id,
          }).sort({ timestamp: -1 });

          return {
            trip_id: trip._id,
            digital_id: trip.digital_id,
            trip_name: trip.trip_name,
            destination: trip.destination,
            status: trip.status,
            start_date: trip.start_date,
            end_date: trip.end_date,
            tourist: trip.tourist_id,
            location: latestLocation ? {
              latitude: latestLocation.latitude,
              longitude: latestLocation.longitude,
              timestamp: latestLocation.timestamp,
              accuracy: latestLocation.accuracy
            } : null,
            blockchain_status: trip.blockchain_status,
            qr_codes: trip.qr_codes,
          };
        } catch (error) {
          console.error(`Error fetching location for trip ${trip._id}:`, error);
          return {
            trip_id: trip._id,
            digital_id: trip.digital_id,
            trip_name: trip.trip_name,
            destination: trip.destination,
            status: trip.status,
            start_date: trip.start_date,
            end_date: trip.end_date,
            tourist: trip.tourist_id,
            location: null,
            blockchain_status: trip.blockchain_status,
            qr_codes: trip.qr_codes,
          };
        }
      })
    );

    // Filter out null results first, then show ALL tourists (not just those with recent locations)
    const validTrips = tripsWithLocations.filter(trip => trip !== null);
    
    console.log(`📍 ${validTrips.length} valid tourists found (showing all, not just with recent locations)`);
    
    // Add detailed logging to see what's in the location data
    validTrips.forEach((trip, index) => {
      console.log(`🧑‍🎤 Tourist ${index + 1}:`, {
        trip_id: trip.trip_id,
        tourist_name: trip.tourist?.name,
        has_location: !!trip.location,
        location_details: trip.location ? {
          lat: trip.location.latitude,
          lng: trip.location.longitude,
          timestamp: trip.location.timestamp
        } : 'No location'
      });
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          tourists: validTrips, // Show all valid tourists
          count: validTrips.length,
          total_active_trips: activeTrips.length,
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
    console.error('❌ Error in getActiveTourists:', error);
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
    console.log('🗺️ Geofence request from admin:', {
      adminId: req.admin._id,
      role: req.admin.role,
      jurisdiction: req.admin.jurisdiction,
      assigned_zones: adminZones
    });

    // Build filter based on admin jurisdiction
    let filter = {};

    if (
      req.admin.role !== "admin" &&
      adminZones.length > 0 &&
      !adminZones.includes("all")
    ) {
      filter.zone_id = { $in: adminZones };
      console.log('🔍 Applied zone filter:', filter);
    } else {
      console.log('✅ Admin has full access to all geofences');
    }

    // First, let's check total geofences in database
    const totalGeofences = await Geofence.countDocuments();
    console.log('📊 Total geofences in database:', totalGeofences);

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
          name: 1,
          zone_type: 1,
          coordinates: 1,
          latitude: 1,
          longitude: 1,
          center_lat: "$latitude", // Map latitude to center_lat for frontend compatibility
          center_lng: "$longitude", // Map longitude to center_lng for frontend compatibility
          radius: "$radius_km",
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

    console.log('🎯 Found geofences after filter:', geofences.length);
    if (geofences.length > 0) {
      console.log('📍 Sample geofence:', geofences[0]);
    }

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
    // First check total active trips (including recently completed)
    const totalActiveTrips = await Trip.countDocuments({
      status: { $in: ["active", "completed"] },
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    console.log(`Debug LiveMap: Total active trips: ${totalActiveTrips}`);

    // Get active tourists with locations
    const tourists = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["active", "completed"] },
          start_date: { $lte: new Date() },
          end_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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

      // Check trips without tourist lookup (including recently completed)
      const tripsOnly = await Trip.find({
        status: { $in: ["active", "completed"] },
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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
