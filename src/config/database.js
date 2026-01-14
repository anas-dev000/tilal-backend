import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

const connectDB = async () => {
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    throw new Error("MONGODB_URI is missing");
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || undefined,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;
