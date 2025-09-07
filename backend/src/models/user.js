import mongoose from "mongoose";

const TouristSchema = new mongoose.Schema({
  firebase_uid: { type: String, required: true }, // from Firebase Auth
  digital_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  kyc_id: { type: String }, // Aadhaar/passport
  phone: { type: String },
  email: { type: String },
  emergency_contact: { type: String },
  itinerary: { type: String }, // simple text (expand later to array of places)
  id_issue_date: { type: Date, default: Date.now },
  id_expiry_date: { type: Date },
  digital_id_hash: { type: String }, // for tamper-proof check
  safety_score: { type: Number, default: 100 }, // auto-updated
});

export default mongoose.model("Tourist", TouristSchema);
