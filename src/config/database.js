import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is missing!");

    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    // Delay slightly to let the server start even if DB fails initially
    // or just throw if you want the start script to fail
    throw error;
  }
};

export default connectDB;
