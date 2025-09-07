import mongoose from "mongoose";

const GeoFenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius_km: { type: Number, required: true },
  risk_level: { type: String, enum: ["low", "medium", "high"], default: "low" },
});

export default mongoose.model("GeoFence", GeoFenceSchema);
