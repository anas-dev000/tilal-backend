import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'worker', 'accountant'],
    default: 'worker'
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // ✅ Worker-specific fields (Simplified - No Specialization)
  workerDetails: {
    employeeId: String,
    joinDate: Date,
    // ❌ REMOVED: specialization: [String]
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    completedTasks: {
      type: Number,
      default: 0
    }
  },
  // ✅ NEW: Notes field for Workers
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;