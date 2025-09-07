import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema({
  tourist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tourist",
    required: true,
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ["app", "iot_band"], default: "app" },
});

export default mongoose.model("Location", LocationSchema);
