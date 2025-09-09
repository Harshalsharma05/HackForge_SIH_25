import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    tourist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tourist",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "panic",
        "geo_fence",
        "anomaly",
        "missing_person",
        "emergency",
        "low_battery",
      ],
      required: true,
    },

    // Alert Details
    title: { type: String, required: true },
    description: { type: String },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // Location Info
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },

    // Status & Response
    status: {
      type: String,
      enum: [
        "active",
        "acknowledged",
        "in_progress",
        "resolved",
        "false_alarm",
      ],
      default: "active",
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    resolved_at: { type: Date },
    response_time: { type: Number }, // in minutes

    // Additional Data
    metadata: {
      battery_level: { type: Number },
      signal_strength: { type: Number },
      device_id: { type: String },
      automatic_trigger: { type: Boolean, default: false },
    },

    // Timestamps
    timestamp: { type: Date, default: Date.now },
    acknowledged_at: { type: Date },

    // Emergency Contacts Notified
    contacts_notified: [
      {
        contact_id: { type: String },
        notification_method: { type: String, enum: ["sms", "call", "email"] },
        notified_at: { type: Date },
        delivery_status: {
          type: String,
          enum: ["sent", "delivered", "failed"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
AlertSchema.index({ tourist_id: 1, timestamp: -1 });
AlertSchema.index({ type: 1, status: 1 });
AlertSchema.index({ severity: 1, status: 1 });
AlertSchema.index({ latitude: 1, longitude: 1 });

export default mongoose.model("Alert", AlertSchema);
