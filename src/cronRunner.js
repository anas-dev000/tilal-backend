import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/database.js";

export const startCronJobs = async () => {
  try {
    console.log("Starting Cron Runner...");
    // connectDB(); // <-- REMOVED: server.js already connects to DB. Double connection causes race conditions.
    console.log("DB connected for cron jobs");

    await import("./utils/cronJobs.js");

    console.log("Cron jobs initialized successfully");
  } catch (err) {
    console.error("Cron Runner failed:", err);
  }
};
