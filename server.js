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
import siteRoutes from "./src/routes/siteRoutes.js";
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import deleteImageRoutes from "./src/routes/deleteImageRoutes.js";
import accountantRoutes from "./src/routes/accountantRoutes.js";
import invoiceRoutes from "./src/routes/invoiceRoutes.js";

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5000;

// CORS - Robust Setup
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));

app.options("*", cors());

// Security & Optimization
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(mongoSanitize());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Static files
app.use("/uploads", express.static("uploads"));

// API Routes
const API_VERSION = process.env.API_VERSION || "v1";
const baseRoute = `/api/${API_VERSION}`;

app.use(`${baseRoute}/auth`, authRoutes);
app.use(`${baseRoute}/users`, userRoutes);
app.use(`${baseRoute}/tasks`, taskRoutes);
app.use(`${baseRoute}/clients`, clientRoutes);
app.use(`${baseRoute}/sites`, siteRoutes);
app.use(`${baseRoute}/plants`, plantRoutes);
app.use(`${baseRoute}/inventory`, inventoryRoutes);
app.use(`${baseRoute}/reports`, reportRoutes);
app.use(`${baseRoute}/notifications`, notificationRoutes);
app.use(`${baseRoute}/uploads`, uploadRoutes);
app.use(`${baseRoute}/delete-image`, deleteImageRoutes);
app.use(`${baseRoute}/accountant`, accountantRoutes);
app.use(`${baseRoute}/invoices`, invoiceRoutes);

// Health Checks
app.get("/health", (req, res) => res.json({ success: true, status: "OK", uptime: process.uptime() }));
app.get("/health/db", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  const state = mongoose.connection.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: state === 1,
    state: states[state],
    envVarLoaded: !!process.env.MONGODB_URI,
    port: PORT
  });
});

app.get("/", (req, res) => res.json({ success: true, message: "Garden API Running", version: API_VERSION }));

// Error Handling
app.use(errorHandler);

// Start Server (Linear & Immediate)
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
    
    // Connect to Database after server is up to avoid 503
    connectDB().then(() => {
        try {
            initSocket(server);
            console.log("🔌 Socket.io initialized");
        } catch (e) {
            console.warn("⚠️ Socket.io initialization failed:", e.message);
        }
    }).catch(err => {
        console.error("❌ Failed to connect to DB after startup:", err.message);
    });
});

export default app;
