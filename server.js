import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get absolute path to .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");

// Load .env with absolute path
dotenv.config({ path: envPath });

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
const PORT = Number(process.env.PORT) || 3000;

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));
app.options("*", cors());

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(mongoSanitize());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static("uploads"));

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
    envPathChecked: envPath,
    envFileExists: fs.existsSync(envPath),
    cwd: process.cwd(),
    port: PORT,
    nodeEnv: process.env.NODE_ENV
  });
});

app.get("/", (req, res) => res.json({ success: true, message: "Garden API Running", version: API_VERSION }));

app.use(errorHandler);

// Start Server
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
    connectDB().then(() => {
        try { initSocket(server); } catch (e) {}
    });
});

export default app;
