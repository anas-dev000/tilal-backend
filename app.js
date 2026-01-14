import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";

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
import healthRoutes from "./src/routes/healthRoutes.js";

// Middleware
import errorHandler from "./src/middleware/errorHandler.js";

const app = express();

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"]
}));
app.options("*", cors());

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

// Health & Common
app.use("/health", healthRoutes);
app.get("/", (req, res) => res.json({ success: true, message: "Garden API Running", version: API_VERSION }));

// Error Handling
app.use(errorHandler);

export default app;
