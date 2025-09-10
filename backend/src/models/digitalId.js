import mongoose from "mongoose";

const DigitalIdSchema = new mongoose.Schema(
  {
    // Existing fields
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
    hash: { type: String, required: true, unique: true }, // SHA256 of tourist details + timestamp

    // Blockchain Integration Fields
    blockchain_tx_hash: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
    }, // Ethereum/Polygon transaction hash

    blockchain_address: {
      type: String,
      sparse: true,
    }, // Generated wallet address for this ID

    smart_contract_id: {
      type: String,
      unique: true,
      sparse: true,
    }, // Unique ID within smart contract

    ipfs_hash: {
      type: String,
      sparse: true,
    }, // IPFS hash for encrypted metadata

    verification_url: {
      type: String,
    }, // Public verification URL for QR codes

    // Status and Validity
    is_valid: {
      type: Boolean,
      default: true,
    }, // Quick status check

    expires_at: {
      type: Date,
      required: true,
    }, // Auto-expiry based on trip end date

    created_on_chain: {
      type: Date,
    }, // Blockchain creation timestamp

    // Blockchain Sync Status
    on_chain_status: {
      created: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      expired: { type: Boolean, default: false },
      revoked: { type: Boolean, default: false },
    },

    // Metadata
    encryption_key: {
      type: String,
    }, // Key for decrypting IPFS data

    gas_used: {
      type: Number,
    }, // Gas used for blockchain transaction

    network: {
      type: String,
      enum: [
        "polygon-mumbai",
        "polygon-mainnet",
        "ethereum-sepolia",
        "arbitrum-sepolia",
        "base-sepolia",
      ],
      default: "polygon-mumbai",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
DigitalIdSchema.index({ tourist_id: 1, trip_id: 1 });
// blockchain_tx_hash already has unique: true, so removing duplicate index
// smart_contract_id already has unique: true, so removing duplicate index
DigitalIdSchema.index({ expires_at: 1 });
DigitalIdSchema.index({ "on_chain_status.created": 1 });

// Auto-expire digital IDs
DigitalIdSchema.pre("save", function (next) {
  const now = new Date();
  if (this.expires_at < now && this.is_valid) {
    this.is_valid = false;
    this.on_chain_status.expired = true;
  }
  next();
});

// Method to check if ID is currently valid
DigitalIdSchema.methods.isCurrentlyValid = function () {
  const now = new Date();
  return (
    this.is_valid &&
    this.expires_at > now &&
    this.on_chain_status.created &&
    !this.on_chain_status.revoked
  );
};

// Method to generate verification URL
DigitalIdSchema.methods.generateVerificationUrl = function () {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${baseUrl}/verify/${this.smart_contract_id}`;
};

export default mongoose.model("DigitalId", DigitalIdSchema);
