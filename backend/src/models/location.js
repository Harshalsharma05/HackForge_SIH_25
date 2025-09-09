import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {
    tourist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tourist",
      required: true,
    },
    trip_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }, // reverse geocoded address
    accuracy: { type: Number }, // GPS accuracy in meters
    altitude: { type: Number },
    speed: { type: Number }, // km/h
    timestamp: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["app", "iot_band", "manual"],
      default: "app",
    },

    // Geo-fence Status
    is_in_safe_zone: { type: Boolean, default: true },
    current_geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoFence",
    },

    // Battery and Device Info (for IoT)
    device_info: {
      battery_level: { type: Number },
      signal_strength: { type: Number },
      device_id: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for geo queries
LocationSchema.index({ tourist_id: 1, trip_id: 1, timestamp: -1 });
LocationSchema.index({ trip_id: 1, timestamp: -1 });
LocationSchema.index({ latitude: 1, longitude: 1 });
LocationSchema.index({ timestamp: -1 });

// TTL index to auto-delete old location data after 30 days
LocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model("Location", LocationSchema);
