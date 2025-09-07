import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String },
  contact: { type: String },
  role: {
    type: String,
    enum: ["police", "tourism_officer", "admin"],
    required: true,
  },
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true }, // bcrypt hashed
});

export default mongoose.model("Admin", AdminSchema);
