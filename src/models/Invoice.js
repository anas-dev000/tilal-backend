import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: false
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false
  },
  // Invoice Details
  items: [{
    description: String,
    quantity: Number,
    unit: String,
    unitPrice: Number,
    total: Number
  }],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    rate: {
      type: Number,
      default: 15 // 15% VAT in Saudi Arabia
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'SAR'
  },
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially-paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'online', 'other'],
    default: null
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paidAt: Date,
  dueDate: Date,
  // PDF
  pdfUrl: {
    type: String,
    default: null
  },
  pdfFile: {
    url: String,
    cloudinaryId: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Notifications
  sentToClient: {
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    },
    whatsapp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date
    }
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Calculate totals if subtotal is provided
  if (this.subtotal) {
    this.tax.amount = (this.subtotal * this.tax.rate) / 100;
    this.total = this.subtotal + this.tax.amount - this.discount;
  }
  
  next();
});

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ site: 1 });
invoiceSchema.index({ task: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
