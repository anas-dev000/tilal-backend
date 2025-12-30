import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: {
      type: String,
      enum: ['User', 'Client'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.type'
    }
  },
  type: {
    type: String,
    enum: ['task-assigned', 'task-completed', 'feedback-received', 'low-stock', 'invoice-generated', 'other'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'whatsapp', 'both'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      error: String
    },
    whatsapp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      error: String
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ 'recipient.id': 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

