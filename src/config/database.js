import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected || (mongoose.connection.readyState === 1)) {
    isConnected = true;
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    throw new Error("MONGODB_URI is missing");
  }

  console.log("⏳ Connecting to MongoDB...");
  connectionPromise = mongoose.connect(mongoUri, {
    dbName: process.env.DB_NAME || undefined,
  }).then(() => {
    isConnected = true;
    connectionPromise = null;
    console.log("✅ MongoDB connected");
  }).catch((error) => {
    connectionPromise = null;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  });

  return connectionPromise;
};

export default connectDB;
