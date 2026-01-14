import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
import { initSocket } from "./src/config/socket.js";
import { startCronJobs } from "./src/cronRunner.js";

// Routes
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import clientRoutes from "./src/routes/clientRoutes.js";
import plantRoutes from "./src/routes/plantRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import deleteImageRoutes from "./src/routes/deleteImageRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import siteRoutes from "./src/routes/siteRoutes.js";
import accountantRoutes from "./src/routes/accountantRoutes.js";
import invoiceRoutes from "./src/routes/invoiceRoutes.js";

// ===============================
// Load Env
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// ===============================
// App & Server
// ===============================
const app = express();
const server = http.createServer(app);

// ===============================
// Safe PORT (Hostinger compatible)
// ===============================
const PORT = Number(process.env.PORT) || 3000;

// ===============================
// Global Error Handling (NO EXIT)
// ===============================
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// ===============================
// Security & Middlewares
// ===============================
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

app.use(mongoSanitize());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ===============================
// Static Uploads (Hostinger safe)
// ===============================
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, path) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

// ===============================
// API Routes
// ===============================
const API_VERSION = process.env.API_VERSION || "v1";

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${API_VERSION}/clients`, clientRoutes);
app.use(`/api/${API_VERSION}/sites`, siteRoutes);
app.use(`/api/${API_VERSION}/plants`, plantRoutes);
app.use(`/api/${API_VERSION}/inventory`, inventoryRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/uploads`, uploadRoutes);
app.use(`/api/${API_VERSION}/delete-image`, deleteImageRoutes);
app.use(`/api/${API_VERSION}/accountant`, accountantRoutes);
app.use(`/api/${API_VERSION}/invoices`, invoiceRoutes);

// ===============================
// Health Check
// ===============================
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
  });
});

app.get("/health/db", async (req, res) => {
  const mongoose = await import("mongoose"); // dynamic import to ensure access
  const state = mongoose.default?.connection?.readyState;
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  
  res.json({
    success: state === 1,
    state: states[state] || "unknown",
    envVarLoaded: !!process.env.MONGODB_URI,
    socketActive: !!mongoose.default?.connection?.host
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Garden Management API Running",
    version: API_VERSION,
  });
});

// ===============================
// 404
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ===============================
// Error Handler
// ===============================
app.use(errorHandler);

// ===============================
// Start Server (Hostinger Safe Flow)
// ===============================
const startServer = async () => {
  try {
    // DB (non-blocking crash)
    try {
      await connectDB();
      console.log("✅ Database connected");
    } catch (dbError) {
      console.error("⚠️ Database connection failed:", dbError.message);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Optional services AFTER server start
    try {
      initSocket(server);
      console.log("🔌 Socket.io initialized");
    } catch (e) {
      console.warn("⚠️ Socket.io disabled:", e.message);
    }

    // try {
    //   await startCronJobs();
    //   console.log("⏰ Cron jobs started");
    // } catch (e) {
    //   console.warn("⚠️ Cron jobs failed:", e.message);
    // }

  } catch (error) {
    console.error("❌ Server failed to start:", error);
  }
};

startServer();

export default app;
