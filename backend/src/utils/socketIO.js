import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Tourist from "../models/tourist.js";
import Trip from "../models/trip.js";
import { updateLocation } from "../controllers/locationController.js";

// Store active connections
const activeConnections = new Map();
const tripRooms = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const tourist = await Tourist.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!tourist) {
      return next(new Error("Invalid token"));
    }

    socket.tourist = tourist;
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};

// Initialize Socket.IO server
const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(
      `🔗 Tourist connected: ${socket.tourist.name} (${socket.tourist._id})`
    );

    // Store connection
    activeConnections.set(socket.tourist._id.toString(), {
      socketId: socket.id,
      tourist: socket.tourist,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    // JOIN TRIP ROOM
    socket.on("join_trip", async (data) => {
      try {
        const { trip_id } = data;

        // Verify trip belongs to tourist
        const trip = await Trip.findOne({
          _id: trip_id,
          tourist_id: socket.tourist._id,
          status: { $in: ["planned", "active"] },
        });

        if (!trip) {
          socket.emit("error", { message: "Trip not found or not accessible" });
          return;
        }

        // Join trip room
        const roomName = `trip_${trip_id}`;
        socket.join(roomName);

        // Store trip room info
        if (!tripRooms.has(trip_id)) {
          tripRooms.set(trip_id, new Set());
        }
        tripRooms.get(trip_id).add(socket.id);

        socket.currentTripId = trip_id;

        console.log(
          `📍 Tourist ${socket.tourist.name} joined trip room: ${roomName}`
        );

        socket.emit("trip_joined", {
          trip_id,
          room: roomName,
          tracking_enabled: trip.tracking_enabled,
        });

        // Notify authorities dashboard if needed
        socket.to("authorities").emit("tourist_online", {
          tourist_id: socket.tourist._id,
          trip_id,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Join trip error:", error);
        socket.emit("error", { message: "Failed to join trip" });
      }
    });

    // LEAVE TRIP ROOM
    socket.on("leave_trip", (data) => {
      const { trip_id } = data;
      const roomName = `trip_${trip_id}`;

      socket.leave(roomName);

      if (tripRooms.has(trip_id)) {
        tripRooms.get(trip_id).delete(socket.id);
        if (tripRooms.get(trip_id).size === 0) {
          tripRooms.delete(trip_id);
        }
      }

      socket.currentTripId = null;
      console.log(
        `📍 Tourist ${socket.tourist.name} left trip room: ${roomName}`
      );
    });

    // LOCATION UPDATE
    socket.on("location_update", async (data) => {
      try {
        const {
          trip_id,
          coordinates,
          battery_level,
          connection_quality,
          device_id,
        } = data;

        // Validate required data
        if (
          !trip_id ||
          !coordinates ||
          !coordinates.latitude ||
          !coordinates.longitude
        ) {
          socket.emit("location_error", { message: "Invalid location data" });
          return;
        }

        // Update last activity
        const connection = activeConnections.get(socket.tourist._id.toString());
        if (connection) {
          connection.lastActivity = new Date();
        }

        // Process location update
        const locationResult = await updateLocation({
          tourist_id: socket.tourist._id,
          trip_id,
          coordinates,
          battery_level,
          connection_quality,
          device_id: device_id || socket.id,
        });

        if (locationResult.success) {
          // Confirm location received
          socket.emit("location_received", {
            location_id: locationResult.location_id,
            timestamp: new Date(),
            safety_status: locationResult.safety_status,
          });

          // Broadcast to trip room (for family tracking if enabled)
          const roomName = `trip_${trip_id}`;
          socket.to(roomName).emit("location_broadcast", {
            tourist_id: socket.tourist._id,
            coordinates,
            timestamp: new Date(),
            safety_status: locationResult.safety_status,
          });

          // Send to authorities dashboard
          socket.to("authorities").emit("location_update", {
            tourist_id: socket.tourist._id,
            trip_id,
            coordinates,
            safety_status: locationResult.safety_status,
            timestamp: new Date(),
          });

          // Check for geo-fence violations
          if (locationResult.safety_status.violations.length > 0) {
            const alertData = {
              tourist_id: socket.tourist._id,
              trip_id,
              coordinates,
              violations: locationResult.safety_status.violations,
              timestamp: new Date(),
            };

            // Alert tourist
            socket.emit("geofence_alert", alertData);

            // Alert authorities
            socket.to("authorities").emit("geofence_violation", alertData);

            console.log(`⚠️ Geo-fence violation by ${socket.tourist.name}`);
          }
        } else {
          socket.emit("location_error", { message: locationResult.error });
        }
      } catch (error) {
        console.error("Location update error:", error);
        socket.emit("location_error", { message: "Failed to update location" });
      }
    });

    // EMERGENCY ALERT
    socket.on("emergency_alert", async (data) => {
      try {
        const { trip_id, alert_type = "panic", message, coordinates } = data;

        console.log(`🚨 EMERGENCY ALERT from ${socket.tourist.name}`);

        const alertData = {
          tourist_id: socket.tourist._id,
          tourist_name: socket.tourist.name,
          trip_id,
          alert_type,
          message,
          coordinates,
          timestamp: new Date(),
          severity: "critical",
        };

        // Broadcast emergency to all authorities
        socket.to("authorities").emit("emergency_alert", alertData);

        // Confirm alert sent
        socket.emit("emergency_sent", {
          alert_id: `emergency_${Date.now()}`,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Emergency alert error:", error);
        socket.emit("error", { message: "Failed to send emergency alert" });
      }
    });

    // HEARTBEAT - Keep connection alive
    socket.on("heartbeat", () => {
      const connection = activeConnections.get(socket.tourist._id.toString());
      if (connection) {
        connection.lastActivity = new Date();
      }
      socket.emit("heartbeat_ack");
    });

    // DISCONNECT
    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Tourist disconnected: ${socket.tourist.name} - Reason: ${reason}`
      );

      // Clean up connections
      activeConnections.delete(socket.tourist._id.toString());

      // Clean up trip rooms
      if (socket.currentTripId && tripRooms.has(socket.currentTripId)) {
        tripRooms.get(socket.currentTripId).delete(socket.id);
        if (tripRooms.get(socket.currentTripId).size === 0) {
          tripRooms.delete(socket.currentTripId);
        }
      }

      // Notify authorities
      socket.to("authorities").emit("tourist_offline", {
        tourist_id: socket.tourist._id,
        trip_id: socket.currentTripId,
        timestamp: new Date(),
        reason,
      });
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.tourist.name}:`, error);
    });
  });

  // Cleanup inactive connections every 5 minutes
  setInterval(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const [touristId, connection] of activeConnections.entries()) {
      if (connection.lastActivity < fiveMinutesAgo) {
        console.log(
          `🧹 Cleaning up inactive connection for tourist: ${touristId}`
        );
        activeConnections.delete(touristId);
      }
    }
  }, 5 * 60 * 1000);

  return io;
};

// Utility functions for external use
const getActiveConnections = () => activeConnections;
const getTripRooms = () => tripRooms;

const broadcastToTrip = (io, trip_id, event, data) => {
  const roomName = `trip_${trip_id}`;
  io.to(roomName).emit(event, data);
};

const broadcastToAuthorities = (io, event, data) => {
  io.to("authorities").emit(event, data);
};

export {
  initializeSocketIO,
  getActiveConnections,
  getTripRooms,
  broadcastToTrip,
  broadcastToAuthorities,
};
