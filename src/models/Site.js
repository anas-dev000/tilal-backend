// backend/src/models/Site.js - ✅ UPDATED: Support Videos in Reference Images
import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    area: {
      type: Number,
      default: 0,
    },
    // ✅ UPDATED: Support videos in reference images
    referenceImages: [
      {
        url: String,
        cloudinaryId: String,
        caption: String,
        mediaType: {
          type: String,
          enum: ['image', 'video'],
          default: 'image'
        },
        format: String, // jpg, png, mp4, etc.
        duration: Number, // For videos only
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        qtn: {
          type: Number,
          default: 1,
        },
        description: String,
        provider: { type: String, default: "cloudinary" },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "maintenance"],
      default: "pending",
    },
    lastWorkedOn: Date,
    notes: String,
    lastTaskStatus: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "in-progress",
        "completed",
        "review",
        "rejected",
      ],
      default: null,
    },
    lastTaskDate: Date,
    lastTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
  },
  { _id: true }
);

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Site name is required"],
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    location: {
      address: String,
      city: String,
      googleMapsLink: {
        type: String,
        trim: true,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    totalArea: {
      type: Number,
      default: 0,
    },
    siteType: {
      type: String,
      enum: [
        "residential",
        "commercial",
        "industrial",
        "public",
        "agricultural",
      ],
      default: "residential",
    },
    sections: [sectionSchema],
    coverImage: {
      url: String,
      cloudinaryId: String,
      provider: { type: String, default: "cloudinary" },
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    lastVisit: Date,
    notes: String,
    // Payment Cycle Information
    paymentCycle: {
      type: Number,
      default: 1, // Default to 1 month
      min: 1,
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    nextPaymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for completion percentage
siteSchema.virtual("completionRate").get(function () {
  if (this.totalTasks === 0) return 0;
  return ((this.completedTasks / this.totalTasks) * 100).toFixed(1);
});

// Method to add section
siteSchema.methods.addSection = async function (sectionData) {
  this.sections.push(sectionData);
  return await this.save();
};

// Method to update section
siteSchema.methods.updateSection = async function (sectionId, updates) {
  const section = this.sections.id(sectionId);
  if (!section) throw new Error("Section not found");

  Object.assign(section, updates);
  return await this.save();
};

// Method to delete section
siteSchema.methods.deleteSection = async function (sectionId) {
  this.sections.pull(sectionId);
  return await this.save();
};

// Method to update section's last task status
siteSchema.methods.updateSectionLastTask = async function (
  sectionId,
  taskStatus,
  taskId
) {
  const section = this.sections.id(sectionId);
  if (!section) return;

  section.lastTaskStatus = taskStatus;
  section.lastTaskDate = new Date();
  section.lastTaskId = taskId;

  return await this.save();
};

// Indexes
siteSchema.index({ client: 1 });
siteSchema.index({ name: "text", description: "text" });
siteSchema.index({ isActive: 1 });

const Site = mongoose.model("Site", siteSchema);

export default Site;