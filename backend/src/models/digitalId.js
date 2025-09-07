import mongoose from "mongoose";

const DigitalIdSchema = new mongoose.Schema(
  {
    tourist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tourist",
      required: true,
    },
    hash: { type: String, required: true, unique: true }, // SHA256 of tourist details + timestamp
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("DigitalId", DigitalIdSchema);
