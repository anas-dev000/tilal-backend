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
  try {
    console.log("⏳ Connecting to database...");
    await connectDB();
    console.log("✅ Database connection established.");

    // Initialize socket.io with the server
    try {
      initSocket(httpServer);
      console.log("🔌 Socket.io initialized");
    } catch (socketError) {
      console.warn("⚠️ Socket.io initialization failed:", socketError.message);
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
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
