import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Import routes
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import geofenceRoutes from "./routes/geofenceRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import blockchainRoutes from "./routes/blockchainRoutes.js";

// Route declarations
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/geofence", geofenceRoutes);
app.use("/api/v1/alert", sosRoutes);
app.use("/api/v1/kyc", kycRoutes);
app.use("/api/v1/blockchain", blockchainRoutes);

app.get("/", (req, res) => {
  res.send("Tourist Safety System API is running....");
});

export default app;
