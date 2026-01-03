import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // There should only be one settings document
  _id: {
    type: String,
    default: 'app-settings'
  },
  // JWT Settings
  jwt: {
    tokenExpiry: {
      type: String,
      default: '7d'
    },
    clientTokenExpiry: {
      type: String,
      default: '24h'
    }
  },
  // Notification Settings
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    whatsapp: {
      enabled: {
        type: Boolean,
        default: false
      }
    }
  },
  // Company Branding
  branding: {
    companyName: {
      type: String,
      default: 'Kingdom Telal Company'
    },
    logo: {
      type: String,
      default: null
    },
    primaryColor: {
      type: String,
      default: '#22c55e'
    },
    secondaryColor: {
      type: String,
      default: '#16a34a'
    },
    address: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    website: {
      type: String,
      default: ''
    }
  },
  // Invoice Settings
  invoice: {
    taxRate: {
      type: Number,
      default: 15 // 15% VAT
    },
    currency: {
      type: String,
      default: 'SAR'
    },
    paymentTerms: {
      type: String,
      default: 'Payment due within 30 days'
    },
    footer: {
      type: String,
      default: 'Thank you for your business!'
    }
  },
  // Language
  defaultLanguage: {
    type: String,
    enum: ['en', 'ar', 'bn'],
    default: 'en'
  },
  // Inventory Alerts
  inventory: {
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    alertFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'immediate'],
      default: 'immediate'
    }
  }
}, {
  timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;

