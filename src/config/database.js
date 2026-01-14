import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log(`Checking MONGODB_URI in database.js: ${uri ? "Defined" : "UNDEFINED"}`);
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is missing!");
    }
    // Log masked URI for debugging (e.g. mongodb+srv://user:****@cluster...)
    const maskedUri = uri.replace(/:([^:@]+)@/, ":****@");
    console.log(`Attempting to connect to MongoDB at: ${maskedUri}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail after 5s if IP is blocked or network is down
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // Do NOT exit process here, let server.js handle it to avoid 503s
    throw error;
  }
};

export default connectDB;

