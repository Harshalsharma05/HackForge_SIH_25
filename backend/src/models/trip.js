import mongoose from "mongoose";

const TripSchema = new mongoose.Schema(
  {
    tourist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tourist",
      required: true,
    },

    // Trip Basic Info
    trip_name: { type: String, required: true },
    destination: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },

    // Trip Details
    purpose: {
      type: String,
      enum: ["tourism", "business", "medical", "education", "other"],
      default: "tourism",
    },
    itinerary: { type: String },
    accommodation_details: { type: String },
    local_contact: {
      name: { type: String },
      phone: { type: String },
      address: { type: String },
    },

    // Digital ID for this trip (Enhanced for Blockchain)
    digital_id: { type: String, required: true, unique: true },
    digital_id_hash: { type: String },
    qr_code: { type: String }, // Base64 QR code or URL

    // Blockchain Integration Fields
    blockchain_digital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DigitalId",
    }, // Reference to blockchain digital ID

    blockchain_tx_hash: {
      type: String,
      sparse: true,
    }, // Transaction hash from blockchain

    ipfs_metadata_hash: {
      type: String,
      sparse: true,
    }, // IPFS hash for encrypted trip data

    wallet_address: {
      type: String,
      sparse: true,
    }, // Associated blockchain wallet

    verification_url: {
      type: String,
    }, // Public verification URL

    // Blockchain Status Tracking
    blockchain_status: {
      digital_id_created: { type: Boolean, default: false },
      metadata_uploaded: { type: Boolean, default: false },
      verification_enabled: { type: Boolean, default: false },
      last_sync: { type: Date },
    },

    // Trip Status
    status: {
      type: String,
      enum: ["planned", "active", "completed", "cancelled"],
      default: "planned",
    },

    // Permissions & Settings
    tracking_enabled: { type: Boolean, default: true },
    emergency_contacts_for_trip: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
      },
    ],

    // Safety & Compliance
    safety_score: { type: Number, default: 100 },
    geofence_violations: { type: Number, default: 0 },
    last_location_update: { type: Date },

    // Metadata
    created_at: { type: Date, default: Date.now },
    activated_at: { type: Date },
    completed_at: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
TripSchema.index({ tourist_id: 1, status: 1 });
TripSchema.index({ digital_id: 1 });
TripSchema.index({ blockchain_tx_hash: 1 });
TripSchema.index({ wallet_address: 1 });
TripSchema.index({ start_date: 1, end_date: 1 });
TripSchema.index({ status: 1, end_date: 1 });

// Auto-update status based on dates and blockchain sync
TripSchema.pre("save", function (next) {
  const now = new Date();

  if (
    this.start_date <= now &&
    this.end_date >= now &&
    this.status === "planned"
  ) {
    this.status = "active";
    this.activated_at = now;
  } else if (this.end_date < now && this.status === "active") {
    this.status = "completed";
    this.completed_at = now;
  }

  next();
});

// Method to check if blockchain digital ID is ready
TripSchema.methods.isBlockchainReady = function () {
  return (
    this.blockchain_status.digital_id_created &&
    this.blockchain_status.metadata_uploaded &&
    this.blockchain_tx_hash &&
    this.verification_url
  );
};

// Method to generate QR code data
TripSchema.methods.getQRCodeData = function () {
  return {
    digital_id: this.digital_id,
    verification_url: this.verification_url,
    trip_name: this.trip_name,
    tourist_name: null, // Will be populated when needed
    valid_until: this.end_date,
    blockchain_hash: this.blockchain_tx_hash,
  };
};

export default mongoose.model("Trip", TripSchema);
