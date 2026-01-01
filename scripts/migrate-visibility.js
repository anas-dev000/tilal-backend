import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Task from '../src/models/Task.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    console.log('Updating existing tasks...');
    const result = await Task.updateMany(
      { visibleToClient: { $exists: false } },
      { $set: { visibleToClient: true } }
    );

    console.log(`Migration completed: ${result.modifiedCount} tasks updated.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
