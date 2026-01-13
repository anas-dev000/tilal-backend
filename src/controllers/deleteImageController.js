// backend/src/controllers/deleteImageController.js
// REFACTORED: Uses provider-based deletion for Cloudinary/Local storage
import { deleteFile } from "../services/uploadService.js";
import Site from "../models/Site.js";
import Task from "../models/Task.js";
import mongoose from "mongoose";

/**
 * @desc    Universal image deletion from Cloudinary and database
 * @route   DELETE /api/v1/delete-image
 * @access  Private (Admin/Worker)
 */
export const deleteImage = async (req, res) => {
  try {
    const {
      cloudinaryId,
      resourceType = "image", // 'image' or 'video'
      entityType, // 'site' | 'section' | 'task' | 'feedback'
      entityId,
      sectionId,
      imageId,
      imageType, // 'before' | 'after' | 'reference' | 'cover' | 'feedback'
    } = req.body;

    if (!cloudinaryId || !entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cloudinaryId, entityType, entityId",
      });
    }

    if (!["site", "section", "task", "feedback"].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entityType. Must be: site, section, task, or feedback",
      });
    }

    let result;

    // Use specific handlers which will look up the provider and delete the file
    switch (entityType) {
      case "site":
        result = await deleteSiteImage(entityId, imageId, imageType, cloudinaryId, resourceType);
        break;

      case "section":
        result = await deleteSectionImage(entityId, sectionId, imageId, cloudinaryId, resourceType);
        break;

      case "task":
        result = await deleteTaskImage(entityId, imageId, imageType, cloudinaryId, resourceType);
        break;

      case "feedback":
        result = await deleteFeedbackImage(entityId, cloudinaryId, resourceType);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid entity type",
        });
    }

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Delete image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
};

// ========================================
// Delete Site Cover Image
// ========================================
const deleteSiteImage = async (siteId, imageId, imageType, expectedCloudinaryId, resourceType) => {
  try {
    const site = await Site.findById(siteId);

    if (!site) {
      return { success: false, message: "Site not found" };
    }

    if (imageType === "cover") {
      if (!site.coverImage || !site.coverImage.cloudinaryId) {
        return { success: false, message: "Cover image not found" };
      }

      // Verify ID matches
      if (site.coverImage.cloudinaryId !== expectedCloudinaryId) {
         console.warn(`⚠️ ID mismatch for site cover: requested ${expectedCloudinaryId}, found ${site.coverImage.cloudinaryId}`);
         // Proceeding anyway or should we block? Proceeding for safety but logging.
      }

      // Get provider (default to cloudinary if not set)
      const provider = site.coverImage.provider || 'cloudinary';
      
      // Delete from storage
      await deleteFile(expectedCloudinaryId, resourceType, provider);

      // Clear the coverImage object
      site.coverImage = {
        url: undefined,
        cloudinaryId: undefined,
        provider: undefined,
      };

      await site.save();

      return {
        success: true,
        message: "Site cover image deleted",
        data: site,
      };
    }

    return { success: false, message: "Invalid image type for site" };
  } catch (error) {
    console.error("Delete site image error:", error);
    return { success: false, message: error.message };
  }
};

// ========================================
//  Delete Section Reference Image
// ========================================
const deleteSectionImage = async (siteId, sectionId, imageId, expectedCloudinaryId, resourceType) => {
  try {
    const site = await Site.findById(siteId);

    if (!site) {
      return { success: false, message: "Site not found" };
    }

    const section = site.sections.id(sectionId);

    if (!section) {
      return { success: false, message: "Section not found" };
    }

    const imageIndex = section.referenceImages.findIndex(
      (img) => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return { success: false, message: "Reference image not found" };
    }
    
    const imageObj = section.referenceImages[imageIndex];
    const provider = imageObj.provider || 'cloudinary';

    // Delete from storage
    await deleteFile(expectedCloudinaryId, resourceType, provider);

    section.referenceImages.splice(imageIndex, 1);
    await site.save();

    return {
      success: true,
      message: "Section reference image deleted",
      data: site,
    };
  } catch (error) {
    console.error("Delete section image error:", error);
    return { success: false, message: error.message };
  }
};

// ========================================
//  Delete Task Image (Before/After/Reference)
// ========================================
const deleteTaskImage = async (taskId, imageId, imageType, expectedCloudinaryId, resourceType) => {
  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    // Handle before/after images
    if (["before", "after"].includes(imageType)) {
      const imageArray = task.images[imageType];

      if (!imageArray || imageArray.length === 0) {
        return { success: false, message: `No ${imageType} images found` };
      }

      const imageIndex = imageArray.findIndex(
        (img) => img._id.toString() === imageId
      );

      if (imageIndex === -1) {
        return { success: false, message: "Image not found" };
      }
      
      const imageObj = imageArray[imageIndex];
      const provider = imageObj.provider || 'cloudinary';

      // Delete from storage
      await deleteFile(expectedCloudinaryId, resourceType, provider);

      imageArray.splice(imageIndex, 1);
      await task.save();

      return {
        success: true,
        message: `Task ${imageType} image deleted`,
        data: task,
      };
    }

    // Handle reference images
    if (imageType === "reference") {
      const imageIndex = task.referenceImages.findIndex(
        (img) => img._id.toString() === imageId
      );

      if (imageIndex === -1) {
        return { success: false, message: "Reference image not found" };
      }
      
      const imageObj = task.referenceImages[imageIndex];
      const provider = imageObj.provider || 'cloudinary';

      // Delete from storage
      await deleteFile(expectedCloudinaryId, resourceType, provider);

      task.referenceImages.splice(imageIndex, 1);
      await task.save();

      return {
        success: true,
        message: "Task reference image deleted",
        data: task,
      };
    }

    return { success: false, message: "Invalid image type for task" };
  } catch (error) {
    console.error("Delete task image error:", error);
    return { success: false, message: error.message };
  }
};

// ========================================
//  Delete Feedback Image
// ========================================
const deleteFeedbackImage = async (taskId, expectedCloudinaryId, resourceType) => {
  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    if (!task.feedback || !task.feedback.image) {
      return { success: false, message: "No feedback image found" };
    }
    
    // Check provider (feedback object or default)
    const provider = task.feedback.provider || 'cloudinary';

    // Delete from storage
    await deleteFile(expectedCloudinaryId, resourceType, provider);

    task.feedback.image = undefined;
    task.feedback.cloudinaryId = undefined;
    task.feedback.provider = undefined;
    await task.save();

    return {
      success: true,
      message: "Feedback image deleted",
      data: task,
    };
  } catch (error) {
    console.error("Delete feedback image error:", error);
    return { success: false, message: error.message };
  }
};

export default { deleteImage };
