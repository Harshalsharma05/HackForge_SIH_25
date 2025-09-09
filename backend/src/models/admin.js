import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const AdminSchema = new mongoose.Schema(
  {
    // Authentication
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // bcrypt hashed
    username: { type: String, required: true, unique: true },

    // Personal Info
    name: { type: String, required: true },
    department: { type: String, required: true },
    contact: { type: String },

    // Role & Permissions
    role: {
      type: String,
      enum: ["police", "tourism_officer", "admin", "emergency_responder"],
      required: true,
    },

    // Authority Specific
    jurisdiction: { type: String }, // area/region they cover
    assigned_zones: [{ type: String }], // list of geo-zones

    // Status
    is_active: { type: Boolean, default: true },
    last_login: { type: Date },
    refresh_token: { type: String }, // For JWT refresh token
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes
AdminSchema.index({ email: 1 });
AdminSchema.index({ username: 1 });
AdminSchema.index({ role: 1 });

AdminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

AdminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

AdminSchema.methods.generateRefreshToken = function () {
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

export default mongoose.model("Admin", AdminSchema);
