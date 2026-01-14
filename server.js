import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./src/config/database.js";
import { initSocket } from "./src/config/socket.js";

// Load .env only in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);

const startServer = async () => {
  // Start listening IMMEDIATELY to avoid Hostinger 503
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server listening on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    
    // Connect to database in background
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
        // Do NOT process.exit(1) here, so we can still access /health/db to debug
      });
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
