import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  isPasswordTemporary: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true
  },
  // ✅ UPDATED: Address (only street & city, both required)
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // ✅ UPDATED: Property Type (only residential & commercial)
  propertyType: {
    type: String,
    enum: ['residential', 'commercial'],
    default: 'residential'
  },
  propertySize: {
    type: Number, // in square meters
    default: 0
  },
  // ✅ NEW: Payment Type
  paymentType: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  // Statistics
  totalTasks: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  sites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site'
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  lastPaymentDate: {
    type: Date,
    default: null
  },
  // ✅ NEW: Contract PDF
  contractPdf: {
    url: String,
    cloudinaryId: String
  }
}, {
  timestamps: true
});

// Hash password before saving
clientSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
clientSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
clientSchema.methods.getPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Index for faster queries
clientSchema.index({ email: 1 });
clientSchema.index({ username: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ branch: 1 });

const Client = mongoose.model('Client', clientSchema);

export default Client;