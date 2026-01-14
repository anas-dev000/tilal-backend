import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI IS MISSING IN ENVIRONMENT");
    return;
  }

  try {
    // Basic, clean connection
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // We don't throw here to prevent process crash, allowing the server to stay up (giving 503 avoidance)
  }
};

export default connectDB;
