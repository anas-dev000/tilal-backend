// backend/src/controllers/taskController.js - ✅ UPDATED: Multiple Sections Support
import Task from "../models/Task.js";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Site from "../models/Site.js";
import Inventory from "../models/Inventory.js";
import {
  notifyTaskAssignment,
  notifyTaskCompletion,
  notifyFeedback,
} from "../services/notificationService.js";
import mongoose from "mongoose";

/**
 * @desc    Get all tasks
 * @route   GET /api/v1/tasks
 * @access  Private
 */
export const getTasks = async (req, res) => {
  try {
    const {
      status,
      worker,
      client,
      site,
      section,
      branch,
      priority,
      category,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    let query = {};

    if (req.user.role === "worker") {
      query.worker = req.user.id;
    }

    if (status) query.status = status;
    if (worker) query.worker = worker;
    if (client) query.client = client;
    if (site) query.site = site;
    if (section) query.sections = section; // ✅ Updated
    if (branch) query.branch = branch;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tasks = await Task.find(query)
      .populate("client", "name email phone address")
      .populate("worker", "name email phone")
      .populate("branch", "name code")
      .populate("site", "name siteType totalArea")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single task
 * @route   GET /api/v1/tasks/:id
 * @access  Private
 */
export const getTask = async (req, res) => {
  try {
    const baseTask = await Task.findById(req.params.id).select("worker").lean();

    if (!baseTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Authorization check
    if (req.user.role !== "admin") {
      if (!baseTask.worker || baseTask.worker._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this task",
        });
      }
    }

    const task = await Task.findById(req.params.id)
      .populate("client", "name email phone address whatsapp")
      .populate("worker", "name email phone workerDetails")
      .populate("branch", "name code address")
      .populate({
        path: "site",
        select: "name description siteType coverImage totalArea",
        populate: {
          path: "client",
          select: "name email phone",
        },
      })
      .populate("materials.item", "name sku unit")
      .populate("adminReview.reviewedBy", "name email");

    // REMOVED: Dynamic lookup of reference images
    // Now uses task.referenceImages (snapshotted at creation)

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new task
 * @route   POST /api/v1/tasks
 * @access  Private/Admin
 */
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      site,
      sections, // array of section IDs
      client,
      scheduledDate,
      priority,
      category,
      estimatedDuration,
      materials,
      notes,
      worker,
    } = req.body;

    // Validate required fields
    if (!title || !description || !site || !sections || !client || !worker) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate site and sections
    const siteDoc = await Site.findById(site);
    if (!siteDoc) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    console.log(sections);

    // ✅ Verify ALL Sections exist in Site
    const invalidSections = sections.filter(
      (sectionId) =>
        !siteDoc.sections.some((sec) => sec._id.toString() === sectionId)
    );

    const validSections = siteDoc.sections.filter((sec) =>
      sections.includes(sec._id.toString())
    );

    if (invalidSections.length > 0) {
      return res.status(404).json({
        success: false,
        message: "One or more sections not found in this site",
      });
    }

    // ✅ Auto-fill Client from Site
    if (!req.body.client) {
      req.body.client = site.client;
    }

    // ✅ Validate Client ID
    if (!mongoose.Types.ObjectId.isValid(client)) {
      return res.status(400).json({
        success: false,
        message: "One or more sections do not belong to this site",
      });
    }

    // SNAPSHOT: Collect all reference images from selected sections
    let referenceImages = [];
    validSections.forEach((section) => {
      if (section.referenceImages && section.referenceImages.length > 0) {
        const copied = section.referenceImages.map((img) => ({
          url: img.url,
          cloudinaryId: img.cloudinaryId,
          caption: img.caption,
          mediaType: img.mediaType || "image",
          format: img.format,
          duration: img.duration,
          uploadedAt: img.uploadedAt,
          qtn: img.qtn || 1,
          description: img.description,
          originalSectionId: section._id,
        }));
        referenceImages.push(...copied);
      }
    });

    const task = await Task.create({
      title,
      description,
      site,
      worker,
      sections: validSections.map((s) => s._id),
      client,
      scheduledDate,
      priority: priority || "medium",
      category: category || "other",
      estimatedDuration: estimatedDuration || 2,
      materials: materials || [],
      notes,
      status: "pending",
      referenceImages, // ← Snapshotted here
    });

    // Populate and return
    const populatedTask = await Task.findById(task._id)
      .populate("client", "name email phone address")
      .populate("site", "name siteType")
      .populate("materials.item", "name sku unit");

    // Notify Worker
    if (task.worker) {
        const worker = await User.findById(task.worker);
        if (worker) {
            await notifyTaskAssignment(worker, task, task.client);
        }
    }

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle image visibility to client
 * @route   PUT /api/v1/tasks/:id/images/:imageId/visibility
 * @access  Private (Admin only)
 */
export const toggleImageVisibility = async (req, res) => {
  try {
    const { imageType } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const imageArray = task.images[imageType];

    if (!imageArray) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type",
      });
    }

    const imageIndex = imageArray.findIndex(
      (img) => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    imageArray[imageIndex].isVisibleToClient =
      !imageArray[imageIndex].isVisibleToClient;

    await task.save();

    res.status(200).json({
      success: true,
      message: "Image visibility updated successfully",
      data: {
        imageId: req.params.imageId,
        isVisibleToClient: imageArray[imageIndex].isVisibleToClient,
      },
    });
  } catch (error) {
    console.error("Toggle image visibility error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update image visibility",
      error: error.message,
    });
  }
};

/**
 * @desc    Update multiple images visibility at once
 * @route   PUT /api/v1/tasks/:id/images/bulk-visibility
 * @access  Private (Admin only)
 */
export const bulkUpdateImageVisibility = async (req, res) => {
  try {
    const { imageIds, imageType, isVisible } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const imageArray = task.images[imageType];

    if (!imageArray) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type",
      });
    }

    let updatedCount = 0;
    imageArray.forEach((img) => {
      if (imageIds.includes(img._id.toString())) {
        img.isVisibleToClient = isVisible;
        updatedCount++;
      }
    });

    await task.save();

    res.status(200).json({
      success: true,
      message: `${updatedCount} image(s) visibility updated successfully`,
      data: {
        updatedCount,
        isVisible,
      },
    });
  } catch (error) {
    console.error("Bulk update image visibility error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update images visibility",
      error: error.message,
    });
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/v1/tasks/:id
 * @access  Private
 */
export const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (req.user.role === "worker" && task.worker?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this task",
      });
    }

    if (req.body.worker && !task.worker) {
      if (task.materials && task.materials.length > 0) {
        for (const material of task.materials) {
          if (material.item) {
            const inventoryItem = await Inventory.findById(material.item);
            if (inventoryItem) {
              await inventoryItem.deduct(material.quantity);
            }
          }
        }
      }
      req.body.status = "assigned";
    }

    // ✅ If marking as completed, update section last task status
    if (req.body.status === "completed" && task.status !== "completed") {
      req.body.completedAt = new Date();

      await Client.findByIdAndUpdate(task.client, {
        $inc: { completedTasks: 1 },
      });

      if (task.worker) {
        await User.findByIdAndUpdate(task.worker, {
          $inc: { "workerDetails.completedTasks": 1 },
        });
      }

      if (task.site) {
        await Site.findByIdAndUpdate(task.site, {
          $inc: { completedTasks: 1 },
          lastVisit: new Date(),
        });

        // ✅ Update all sections' last task status
        const site = await Site.findById(task.site);
        if (site && task.sections) {
          for (const sectionId of task.sections) {
            await site.updateSectionLastTask(sectionId, "completed", task._id);
          }
        }
      }
    }

    // ✅ If marking as rejected, update section last task status
    if (req.body.status === "rejected" && task.status !== "rejected") {
      if (task.site) {
        const site = await Site.findById(task.site);
        if (site && task.sections) {
          for (const sectionId of task.sections) {
            await site.updateSectionLastTask(sectionId, "rejected", task._id);
          }
        }
      }
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("client", "name email phone")
      .populate("worker", "name email phone")
      .populate("branch", "name code")
      .populate("site", "name siteType");

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/v1/tasks/:id
 * @access  Private/Admin
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Start task (worker)
 * @route   POST /api/v1/tasks/:id/start
 * @access  Private/Worker
 */
export const startTask = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    if (task.worker.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    task.status = "in-progress";
    task.startedAt = new Date();
    if (latitude !== undefined && longitude !== undefined) {
      task.startLocation = {
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        timestamp: new Date(),
      };
    }
    await task.save();
    res.status(200).json({
      success: true,
      message: "Task started successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Complete task (worker)
 * @route   POST /api/v1/tasks/:id/complete
 * @access  Private/Worker
 */
export const completeTask = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    if (task.worker.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }
    if (task.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Task already completed",
      });
    }
    task.status = "completed";
    task.completedAt = new Date();
    if (latitude !== undefined && longitude !== undefined) {
      task.endLocation = {
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        timestamp: new Date(),
      };
    }
    await task.save();

    // Notify Client, Admin, and Accountant
    const populatedTask = await Task.findById(task._id).populate('worker client');
    if (populatedTask.client && populatedTask.worker) {
        await notifyTaskCompletion(populatedTask.client, populatedTask, populatedTask.worker);
    }

    res.status(200).json({
      success: true,
      message: "Task completed successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * @desc    Upload task images (before/after only)
 * @route   POST /api/v1/tasks/:id/images
 * @access  Private (Worker/Admin)
 */
export const uploadTaskImages = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (req.user.role === "worker" && task.worker?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to upload images for this task",
      });
    }

    const { imageType, isVisibleToClient = true } = req.body;

    if (!["before", "after"].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type. Must be: before or after",
      });
    }

    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // ✅ UPDATED: Support both images and videos
    const mediaObjects = files.map((file) => ({
      url: file.url,
      cloudinaryId: file.cloudinaryId,
      thumbnail: file.url, // For videos, Cloudinary auto-generates thumbnails
      mediaType: file.resourceType, // ✅ 'image' or 'video'
      format: file.format, // jpg, png, mp4, etc.
      duration: file.duration || null, // ✅ For videos
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
      isVisibleToClient:
        isVisibleToClient === "true" || isVisibleToClient === true,
    }));

    if (!task.images) {
      task.images = { before: [], after: [] };
    }

    task.images[imageType].push(...mediaObjects);
    await task.save();

    res.status(200).json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      data: task.images,
    });
  } catch (error) {
    console.error("Upload task images error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload files",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete task image
 * @route   DELETE /api/v1/tasks/:id/images/:imageId
 * @access  Private (Worker/Admin)
 */
export const deleteTaskImage = async (req, res) => {
  try {
    const { imageType } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (req.user.role === "worker" && task.worker?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!["before", "after"].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type",
      });
    }

    // Find and remove image
    const imageArray = task.images[imageType];
    const imageIndex = imageArray.findIndex(
      (img) => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const image = imageArray[imageIndex];

    // Delete from Cloudinary
    if (image.cloudinaryId) {
      try {
        const { v2: cloudinary } = await import("cloudinary");
        await cloudinary.uploader.destroy(image.cloudinaryId);
        console.log("🗑️ Image deleted from Cloudinary");
      } catch (err) {
        console.error("Failed to delete from Cloudinary:", err);
      }
    }

    // Remove from array
    imageArray.splice(imageIndex, 1);
    await task.save();

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete task image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};

/**
 * @desc    Assign task to worker
 * @route   POST /api/v1/tasks/:id/assign
 * @access  Private (Admin)
 */
export const assignTask = async (req, res) => {
  try {
    const { workerId } = req.body;

    const task = await Task.findById(req.params.id).populate(
      "client",
      "name email phone"
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const worker = await User.findById(workerId);

    if (!worker || worker.role !== "worker") {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    task.worker = workerId;
    task.status = "assigned";
    await task.save();

    await notifyTaskAssignment(worker, task, task.client);

    res.status(200).json({
      success: true,
      message: "Task assigned successfully",
      data: task,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign task",
      error: error.message,
    });
  }
};

/**
 * @desc    Submit client feedback for completed task
 * @route   POST /api/v1/tasks/:id/feedback
 * @access  Private (Client only)
 */
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment, imageNumber } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only provide feedback for completed tasks",
      });
    }

    if (req.user.role === "client" && task.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to feedback this task",
      });
    }

    // Prepare feedback data
    const feedbackData = {
      rating: parseInt(rating),
      comment: comment || "",
      imageNumber: imageNumber ? parseInt(imageNumber) : null,
      submittedAt: new Date(),
    };

    // Add feedback image if uploaded
    if (req.file && req.file.cloudinaryUrl) {
      feedbackData.image = req.file.cloudinaryUrl;
      feedbackData.cloudinaryId = req.file.cloudinaryId;
    }

    task.feedback = feedbackData;
    await task.save();

    // Notify Admin and Worker
    const populatedTask = await Task.findById(task._id).populate('client');
    await notifyFeedback(populatedTask, feedbackData, populatedTask.client);

    res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      data: task.feedback,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark task as satisfied (without detailed feedback)
 * @route   POST /api/v1/tasks/:id/satisfied
 * @access  Private (Client only)
 */
export const markSatisfied = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only mark satisfaction for completed tasks",
      });
    }

    if (req.user.role !== "client" && task.client.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Mark as satisfied with 5 stars
    task.feedback = {
      rating: 5,
      comment: "Client is satisfied with the work ✓",
      isSatisfiedOnly: true, // Flag to indicate this is just satisfaction mark
      submittedAt: new Date(),
    };

    await task.save();

    // Notify Admin and Worker
    const populatedTask = await Task.findById(task._id).populate('client');
    await notifyFeedback(populatedTask, task.feedback, populatedTask.client);

    res.status(200).json({
      success: true,
      message: "Task marked as satisfied",
      data: task.feedback,
    });
  } catch (error) {
    console.error("Mark satisfied error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark task as satisfied",
      error: error.message,
    });
  }
};

/**

Helper function to extract public_id from Cloudinary URL
*/
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return null;
    const publicIdWithExt = parts.slice(uploadIndex + 2).join("/"); // +2 to skip version
    return publicIdWithExt.replace(/.[^/.]+$/, "");
  } catch (err) {
    return null;
  }
};

/**

Cron Job: Delete media from Cloudinary for tasks older than 3 months
*/
export const deleteOldTaskMedia = async () => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oldTasks = await Task.find({
      createdAt: { $lt: threeMonthsAgo },
    }).select("referenceImages images feedback");
    let totalDeleted = 0;
    for (const task of oldTasks) {
      const publicIds = new Set(); // Reference images
      task.referenceImages.forEach((img) => {
        if (img.cloudinaryId) publicIds.add(img.cloudinaryId);
      }); // Before images
      task.images.before.forEach((img) => {
        if (img.cloudinaryId) publicIds.add(img.cloudinaryId);
        const thumbId = getPublicIdFromUrl(img.thumbnail);
        if (thumbId) publicIds.add(thumbId);
      }); // After images
      task.images.after.forEach((img) => {
        if (img.cloudinaryId) publicIds.add(img.cloudinaryId);
        const thumbId = getPublicIdFromUrl(img.thumbnail);
        if (thumbId) publicIds.add(thumbId);
      }); // Feedback image
      if (task.feedback?.cloudinaryId)
        publicIds.add(task.feedback.cloudinaryId); // Delete from Cloudinary
      for (const publicId of publicIds) {
        try {
          await cloudinary.uploader.destroy(publicId, { invalidate: true });
          totalDeleted++;
        } catch (err) {
          console.error(
            `Failed to delete Cloudinary asset ${publicId}:, err.message`
          );
        }
      } // Clear media from DB
      task.referenceImages = [];
      task.images.before = [];
      task.images.after = [];
      if (task.feedback) {
        task.feedback.image = null;
        task.feedback.cloudinaryId = null;
      }
      await task.save();
    }
    console.log(
      `Cron: Deleted media for ${oldTasks.length} old tasks (${totalDeleted} assets)`
    );
  } catch (error) {
    console.error("Error in deleteOldTaskMedia cron:", error.message);
  }
};

/**

Cron Job: Permanently delete tasks older than 3 months
*/
export const deleteOldTasks = async () => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const result = await Task.deleteMany({
      createdAt: { $lt: threeMonthsAgo },
    });
    console.log(
      `Cron: Permanently deleted ${result.deletedCount} tasks older than 3 months`
    );
  } catch (error) {
    console.error("Error in deleteOldTasks cron:", error.message);
  }
};

/**

@desc    Admin endpoint: Delete all BEFORE images (media taken before delivery to client)
@route   DELETE /api/v1/tasks/:id/before-media
@access  Private (Admin only)
*/
export const deleteBeforeMedia = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    const publicIds = new Set();
    task.images.before.forEach((img) => {
      if (img.cloudinaryId) publicIds.add(img.cloudinaryId);
      const thumbId = getPublicIdFromUrl(img.thumbnail);
      if (thumbId) publicIds.add(thumbId);
    }); // Delete from Cloudinary
    for (const publicId of publicIds) {
      try {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      } catch (err) {
        console.error(
          `Failed to delete Cloudinary asset ${publicId}:, err.message`
        );
      }
    } // Clear from DB
    task.images.before = [];
    await task.save();
    res.status(200).json({
      success: true,
      message:
        "All before-delivery media deleted successfully from Cloudinary and database",
      data: { deletedCount: publicIds.size },
    });
  } catch (error) {
    console.error("Delete before media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete before media",
      error: error.message,
    });
  }
};

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  uploadTaskImages,
  deleteTaskImage,
  assignTask,
  toggleImageVisibility,
  bulkUpdateImageVisibility,
  submitFeedback,
  markSatisfied,
  deleteBeforeMedia,
};
