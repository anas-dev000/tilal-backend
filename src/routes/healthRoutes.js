import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/db", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const state = states[mongoose.connection.readyState] || "unknown";

  res.json({
    success: mongoose.connection.readyState === 1,
    state,
    envVarLoaded: !!process.env.MONGODB_URI,
    port: process.env.PORT || null,
    nodeEnv: process.env.NODE_ENV || "development",
  });
});

export default router;
