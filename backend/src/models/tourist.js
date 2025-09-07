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

    // Digital ID
    digital_id: { type: String, required: true, unique: true },
    digital_id_hash: { type: String }, // for tamper-proof check
    id_issue_date: { type: Date, default: Date.now },
    id_expiry_date: { type: Date },

    // KYC Information
    kyc_id: { type: String }, // Aadhaar/passport
    kyc_document_type: {
      type: String,
      enum: ["aadhaar", "passport", "driving_license"],
    },
    kyc_verified: { type: Boolean, default: false },

    // Personal Details
    nationality: { type: String, default: "Indian" },
    date_of_birth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },

    // Emergency Contacts
    emergency_contacts: [emergencyContactSchema],

    // Trip Details
    itinerary: { type: String }, // simple text (expand later to array of places)
    trip_start_date: { type: Date },
    trip_end_date: { type: Date },
    accommodation_details: { type: String },

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

// Index for geospatial queries
TouristSchema.index({
  "current_location.latitude": 1,
  "current_location.longitude": 1,
});

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

export default mongoose.model("Tourist", TouristSchema);
