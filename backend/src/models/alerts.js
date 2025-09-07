import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
  tourist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tourist",
    required: true,
  },
  type: {
    type: String,
    enum: ["panic", "geo_fence", "anomaly"],
    required: true,
  },
  description: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
});

export default mongoose.model("Alert", AlertSchema);
