import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";

import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
import { initSocket } from "./src/config/socket.js";

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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: true, // Reflection: automatically sets Access-Control-Allow-Origin to the request origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));

// Handle preflight
app.options("*", cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(mongoSanitize());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Static files
app.use("/uploads", express.static("uploads"));

// API Routes
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

// Health Checks
app.get("/health", (req, res) => res.json({ status: "OK", uptime: process.uptime() }));
app.get("/health/db", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  const state = mongoose.connection.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: state === 1,
    state: states[state],
    envVarLoaded: !!process.env.MONGODB_URI
  });
});

app.get("/", (req, res) => res.json({ message: "Garden Management API Running", version: API_VERSION }));

// Error Handling
app.use(errorHandler);

// Start Server
const start = async () => {
  try {
    await connectDB();
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup error:", error.message);
  }
};

start();

export default app;
