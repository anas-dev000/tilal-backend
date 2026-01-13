import express from "express";
import { createServer } from "http";
import { initSocket } from "./src/config/socket.js";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./src/config/database.js";
import errorHandler from "./src/middleware/errorHandler.js";
// import { startCronJobs } from "./src/cronRunner.js";

// Import routes
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

// Load environment variables
dotenv.config();

/**
 * 🛡️ Global Error Handlers
 * Prevent the app from crashing silently due to unhandled issues.
 */
process.on("uncaughtException", (err) => {
  console.error("FATAL: Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("WARNING: Unhandled Rejection at:", promise, "reason:", reason);
});

// Initialize express app
const app = express();
const httpServer = createServer(app);

// =====================================
// 🛡️ CORS Configuration
// =====================================
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://tilal.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// =====================================
// 🔒 Security Middleware
// =====================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    frameguard: false,
  })
);

app.use(mongoSanitize());
app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  next();
});

// =====================================
// 🧩 Middleware
// =====================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// =====================================
// 📁 Static Files & CORS for Uploads
// =====================================
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, filePath) => {
      if (filePath.toLowerCase().endsWith(".pdf")) {
        res.set("Content-Type", "application/pdf");
        res.set("Content-Disposition", "inline");
        res.set("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

// =====================================
// 🚀 API Routes
// =====================================
const API_VERSION = process.env.API_VERSION || "v1";

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/delete-image`, deleteImageRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${API_VERSION}/clients`, clientRoutes);
app.use(`/api/${API_VERSION}/sites`, siteRoutes);
app.use(`/api/${API_VERSION}/plants`, plantRoutes);
app.use(`/api/${API_VERSION}/inventory`, inventoryRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/uploads`, uploadRoutes);
app.use(`/api/${API_VERSION}/accountant`, accountantRoutes);
app.use(`/api/${API_VERSION}/invoices`, invoiceRoutes);

// =====================================
// 💓 Health & Root
// =====================================
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Garden Management System API",
    version: API_VERSION,
  });
});

// =====================================
// ❌ 404 & Error Handling
// =====================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use(errorHandler);

// =====================================
// 🚀 Server Lifecycle
// =====================================
const PORT = process.env.PORT;


/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = () => {
  console.log("👋 SIGTERM/SIGINT received. Shutting down gracefully...");
  httpServer.close(() => {
    console.log("✅ Server closed. Process exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

/**
 * Start Server after Database Connection
 */
const startServer = async () => {
  try {
    console.log("⏳ Connecting to database...");
    await connectDB();
    console.log("✅ Database connection established.");

    // Initialize Socket.io (does not block HTTP server listening)
    initSocket(httpServer);

    // Start Cron Jobs
    // await startCronJobs();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║   🌿 Garden Management System API                    ║
║   Host: 0.0.0.0                                      ║
║   Port: ${PORT}                                      ║
║   Status: ONLINE (Production Ready)                  ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ CRITICAL: Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;

