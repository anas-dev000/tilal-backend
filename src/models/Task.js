// backend/src/models/Task.js - ✅ UPDATED: Support Videos
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Task description is required"],
      maxlength: 2000,
    },

    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "Site is required"],
    },
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    ],

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    status: {
      type: String,
      enum: ["pending", "assigned", "in-progress", "completed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      required: false,
    },
    category: {
      type: String,
      enum: [
        "lawn-mowing",
        "tree-trimming",
        "landscaping",
        "irrigation",
        "pest-control",
        "other",
      ],
      default: "other",
      required: false,
    },

    scheduledDate: {
      type: Date,
    },
    estimatedDuration: {
      type: Number,
      default: 2,
      required: false,
    },
    actualDuration: {
      type: Number,
      default: 0,
    },

    // GPS Tracking
    location: {
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    startLocation: {
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      timestamp: Date,
    },
    endLocation: {
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      timestamp: Date,
    },

    referenceImages: [
      {
        url: { type: String, required: true },
        cloudinaryId: String,
        caption: String,
        mediaType: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
        format: String,
        duration: Number,
        uploadedAt: { type: Date, default: Date.now },
        qtn: { type: Number, default: 1 },
        description: String,
        // Keep original section reference for traceability
        originalSectionId: {
          type: mongoose.Schema.Types.ObjectId,
        },
      },
    ],

    // ✅ UPDATED: Images/Videos with mediaType
    images: {
      before: [
        {
          url: String,
          cloudinaryId: String,
          thumbnail: String,
          mediaType: {
            type: String,
            enum: ["image", "video"],
            default: "image",
          },
          format: String, // jpg, png, mp4, etc.
          duration: Number, // For videos only
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          isVisibleToClient: {
            type: Boolean,
            default: false,
          },
        },
      ],
      after: [
        {
          url: String,
          cloudinaryId: String,
          thumbnail: String,
          mediaType: {
            type: String,
            enum: ["image", "video"],
            default: "image",
          },
          format: String,
          duration: Number,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          isVisibleToClient: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },

    // Materials
    materials: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
        },
        name: String,
        quantity: Number,
        unit: String,
        confirmed: {
          type: Boolean,
          default: false,
        },
        confirmedAt: Date,
        confirmedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Cost
    cost: {
      labor: {
        type: Number,
        default: 0,
      },
      materials: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
    },

    // Timeline
    startedAt: Date,
    completedAt: Date,

    // Admin Review
    adminReview: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      comments: String,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
    },

    // Client Feedback
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      imageNumber: Number,
      image: String,
      cloudinaryId: String,
      submittedAt: Date,
      isSatisfiedOnly: {
        type: Boolean,
        default: false,
      },
    },

    // Invoice
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },

    visibleToClient: {
      type: Boolean,
      default: true,
    },
    voiceRecording: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
taskSchema.index({ client: 1, status: 1 });
taskSchema.index({ worker: 1, status: 1 });
taskSchema.index({ site: 1, sections: 1 });
taskSchema.index({ branch: 1, status: 1 });
taskSchema.index({ scheduledDate: 1 });
taskSchema.index({ status: 1, priority: 1 });

// Pre-save hook
taskSchema.pre("save", function (next) {
  if (this.startedAt && this.completedAt) {
    const duration = (this.completedAt - this.startedAt) / (1000 * 60 * 60);
    this.actualDuration = Math.round(duration * 100) / 100;
  }

  this.cost.total = this.cost.labor + this.cost.materials;

  next();
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
