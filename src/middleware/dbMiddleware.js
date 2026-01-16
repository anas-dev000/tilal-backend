import connectDB from '../config/database.js';

const dbMiddleware = async (req, res, next) => {
  // Skip DB check for pure health checks if needed, but usually better to include it
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('DB Middleware Error:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};

export default dbMiddleware;
