import mongoose from "mongoose";

const GeoFenceSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true },
    description: { type: String },

    // Location (Center Point)
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius_km: { type: Number, required: true },

    // Zone Type & Risk
    zone_type: {
      type: String,
      enum: [
        "safe_zone",
        "restricted_zone",
        "danger_zone",
        "tourist_attraction",
        "emergency_zone",
      ],
      default: "safe_zone",
    },
    risk_level: {
      type: String,
      enum: ["very_low", "low", "medium", "high", "critical"],
      default: "low",
    },

    // Rules & Restrictions
    entry_allowed: { type: Boolean, default: true },
    time_restrictions: {
      start_time: { type: String }, // "HH:MM" format
      end_time: { type: String },
      restricted_days: [{ type: String }], // ["monday", "tuesday", etc.]
    },

    // Contact & Response
    emergency_contact: { type: String },
    alert_authorities: { type: Boolean, default: false },
    auto_alert_tourist: { type: Boolean, default: true },

    // Metadata
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    is_active: { type: Boolean, default: true },

    // Statistics
    entry_count: { type: Number, default: 0 },
    alert_count: { type: Number, default: 0 },
    last_entry: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes for geo queries
GeoFenceSchema.index({ latitude: 1, longitude: 1 });
GeoFenceSchema.index({ zone_type: 1, is_active: 1 });
GeoFenceSchema.index({ risk_level: 1 });

export default mongoose.model("GeoFence", GeoFenceSchema);
