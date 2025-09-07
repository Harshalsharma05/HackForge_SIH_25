import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./db/connectDB.js";
import app from "./app.js";
import { initializeSocketIO } from "./utils/socketIO.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 8000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(server);

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERROR !!", error);
      throw error;
    });

    server.listen(port, () => {
      console.log(`🚀 Server is running at http://localhost:${port}`);
      console.log(`📡 Socket.IO enabled for real-time location tracking`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed !!!", err);
  });
