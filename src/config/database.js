import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI is undefined or empty in process.env");
      throw new Error("MONGODB_URI environment variable is missing!");
    }
    
    // Log masked URI for debugging (e.g. mongodb+srv://user:****@cluster...)
    const maskedUri = uri.includes('://') 
      ? uri.replace(/:([^:@]+)@/, ":****@") 
      : 'Invalid URI format';
      
    console.log(`📡 Database URI found. Attempting connection...`);
    // console.log(`Attempting to connect to MongoDB at: ${maskedUri}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
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

