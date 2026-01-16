import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load .env IMMEDIATELY before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); 
}

import http from "http";
import app from "./app.js";
import connectDB from "./src/config/database.js";
import { initSocket } from "./src/config/socket.js";

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

const startServer = async () => {
  // 1. Start DB connection in progress immediately
  console.log("⏳ Connecting to database...");
  connectDB()
    .then(() => {
      console.log("✅ Database connection established.");
      try {
        initSocket(httpServer);
        console.log("🔌 Socket.io initialized");
      } catch (socketError) {
        console.warn("⚠️ Socket.io initialization failed:", socketError.message);
      }
    })
    .catch((error) => {
      console.error("❌ Failed to connect to database:", error.message);
    });

  // 2. Start listening IMMEDIATELY to avoid Hostinger 503
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server listening on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("👋 SIGTERM/SIGINT received. Shutting down gracefully...");
  httpServer.close(() => {
    console.log("✅ Server closed. Process exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

startServer();
