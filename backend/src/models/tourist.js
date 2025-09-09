import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
});

const TouristSchema = new mongoose.Schema(
  {
    // Authentication
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // bcrypt hashed
    refreshToken: { type: String }, // for JWT refresh token

    // Basic Info
    name: { type: String, required: true },
    phone: { type: String, required: true },

    // KYC Information (Enhanced for DigiLocker)
    kyc_id: { type: String }, // Aadhaar/passport
    kyc_document_type: {
      type: String,
      enum: ["aadhaar", "passport", "driving_license"],
    },
    kyc_verified: { type: Boolean, default: false },
    kyc_otp_request_id: { type: String },

    // DigiLocker Integration
    kyc_digilocker_data: {
      aadhaar_number: { type: String }, // Masked Aadhaar
      name_on_aadhaar: { type: String },
      dob_on_aadhaar: { type: Date },
      gender_on_aadhaar: { type: String },
      address_on_aadhaar: {
        house: { type: String },
        street: { type: String },
        landmark: { type: String },
        locality: { type: String },
        vtc: { type: String },
        district: { type: String },
        state: { type: String },
        pincode: { type: String },
      },
      verification_timestamp: { type: Date },
      consent_token: { type: String }, // DigiLocker consent token
      request_id: { type: String }, // DigiLocker request ID
      photo_url: { type: String }, // Aadhaar photo URL (if available)
    },

    // Personal Details
    nationality: { type: String, default: "Indian" },
    date_of_birth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },

    // Emergency Contacts (default contacts for all trips)
    emergency_contacts: [emergencyContactSchema],

    // Blockchain Wallet Integration
    blockchain_wallet: {
      address: { type: String }, // User's blockchain address
      private_key_encrypted: { type: String }, // Encrypted private key
      wallet_created_at: { type: Date },
      last_used: { type: Date },
    },

    // Current Active Trip (reference)
    current_trip_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },

    // Safety & Tracking
    safety_score: { type: Number, default: 100 }, // auto-updated
    current_location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      last_updated: { type: Date },
    },

    // Preferences
    preferences: {
      language: { type: String, default: "english" },
      tracking_consent: { type: Boolean, default: true },
      emergency_notifications: { type: Boolean, default: true },
      family_tracking_consent: { type: Boolean, default: false },
    },

    // Status
    is_active: { type: Boolean, default: true },
    last_login: { type: Date },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries and blockchain
TouristSchema.index({
  "current_location.latitude": 1,
  "current_location.longitude": 1,
});
TouristSchema.index({ "blockchain_wallet.address": 1 });
TouristSchema.index({ "kyc_digilocker_data.aadhaar_number": 1 });
TouristSchema.index({ kyc_verified: 1 });

TouristSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (!this.password) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

TouristSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

TouristSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

TouristSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// Method to check if tourist is eligible for blockchain digital ID
TouristSchema.methods.isEligibleForBlockchainID = function () {
  return (
    this.kyc_verified &&
    this.kyc_digilocker_data &&
    this.kyc_digilocker_data.aadhaar_number &&
    this.is_active
  );
};

// Method to get sanitized data for blockchain storage
TouristSchema.methods.getBlockchainData = function () {
  return {
    name: this.name,
    gender: this.gender,
    nationality: this.nationality,
    kyc_verified: this.kyc_verified,
    verification_timestamp: this.kyc_digilocker_data?.verification_timestamp,
    // Note: Sensitive data like Aadhaar number will be encrypted before blockchain storage
  };
};

export default mongoose.model("Tourist", TouristSchema);
