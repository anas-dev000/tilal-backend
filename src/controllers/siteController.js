import Site from "../models/Site.js";
import Client from "../models/Client.js";
import { notifyNewSite } from "../services/notificationService.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

/**
 * @desc    Get all sites
 * @route   GET /api/v1/sites
 * @access  Private (Admin only)
 */
export const getAllSites = async (req, res) => {
  try {
    const {
      client,
      search,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    // Filter by client if provided
    if (client) {
      query.client = client;
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sites = await Site.find(query)
      .populate("client", "name email phone")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Site.countDocuments(query);

    res.status(200).json({
      success: true,
      count: sites.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: sites,
    });
  } catch (error) {
    console.error("Get sites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sites",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single site by ID
 * @route   GET /api/v1/sites/:id
 * @access  Private
 */
export const getSiteById = async (req, res) => {
  try {
    const siteId = req.params.id;

    const site = await Site.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(siteId) } },

      // Populate the client
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: "$client" },

      // Lookup tasks for each section
      {
        $lookup: {
          from: "tasks",
          let: { sectionIds: "$sections._id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$section", "$$sectionIds"] },
              },
            },
          ],
          as: "allTasks",
        },
      },

      // Merge tasks back into each section
      {
        $addFields: {
          sections: {
            $map: {
              input: "$sections",
              as: "sec",
              in: {
                $mergeObjects: [
                  "$$sec",
                  {
                    tasks: {
                      $filter: {
                        input: "$allTasks",
                        as: "t",
                        cond: { $eq: ["$$t.section", "$$sec._id"] },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // Remove temporary field
      { $unset: "allTasks" },
    ]);

    if (!site || site.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    res.status(200).json({
      success: true,
      data: site[0],
    });
  } catch (error) {
    console.error("Get site error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new site
 * @route   POST /api/v1/sites
 * @access  Private (Admin only)
 */
export const createSite = async (req, res) => {
  try {
    const siteData = req.body;

    // Handle cover image from Cloudinary
    if (req.file && req.file.cloudinaryUrl) {
      siteData.coverImage = {
        url: req.file.cloudinaryUrl,
        cloudinaryId: req.file.cloudinaryId,
      };
    }

    if (
      !siteData.client ||
      siteData.client === "undefined" ||
      siteData.client === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Client is required",
      });
    }

    // Create site
    const site = await Site.create(siteData);

    // Update client's sites array
    if (site.client) {
      await Client.findByIdAndUpdate(site.client, {
        $push: { sites: site._id },
      });
    }

    // Populate and return
    const populatedSite = await Site.findById(site._id).populate(
      "client",
      "name email phone"
    );

    // Notify Accountants
    if (populatedSite.client) {
        await notifyNewSite(populatedSite, populatedSite.client);
    }

    res.status(201).json({
      success: true,
      message: "Site created successfully",
      data: populatedSite,
    });
  } catch (error) {
    console.error("Create site error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create site",
      error: error.message,
    });
  }
};

/**
 * @desc    Update site
 * @route   PUT /api/v1/sites/:id
 * @access  Private (Admin only)
 */
export const updateSite = async (req, res) => {
  try {
    let site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const updateData = req.body;

    // Handle new cover image
    if (req.file && req.file.cloudinaryUrl) {
      // Delete old image from Cloudinary
      if (site.coverImage?.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(site.coverImage.cloudinaryId);
          console.log("🗑️ Old cover image deleted from Cloudinary");
        } catch (err) {
          console.error("Failed to delete old image:", err);
        }
      }

      updateData.coverImage = {
        url: req.file.cloudinaryUrl,
        cloudinaryId: req.file.cloudinaryId,
      };
    }

    // Update site
    site = await Site.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("client", "name email phone");

    res.status(200).json({
      success: true,
      message: "Site updated successfully",
      data: site,
    });
  } catch (error) {
    console.error("Update site error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update site",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete site
 * @route   DELETE /api/v1/sites/:id
 * @access  Private (Admin only)
 */
export const deleteSite = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Delete cover image from Cloudinary
    if (site.coverImage?.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(site.coverImage.cloudinaryId);
        console.log("🗑️ Cover image deleted from Cloudinary");
      } catch (err) {
        console.error("Failed to delete cover image:", err);
      }
    }

    // Delete all section reference images from Cloudinary
    if (site.sections && site.sections.length > 0) {
      for (const section of site.sections) {
        if (section.referenceImages && section.referenceImages.length > 0) {
          for (const img of section.referenceImages) {
            if (img.cloudinaryId) {
              try {
                await cloudinary.uploader.destroy(img.cloudinaryId);
              } catch (err) {
                console.error("Failed to delete reference image:", err);
              }
            }
          }
        }
      }
    }

    // Remove site from client's sites array
    if (site.client) {
      await Client.findByIdAndUpdate(site.client, {
        $pull: { sites: site._id },
      });
    }

    await site.deleteOne();

    res.status(200).json({
      success: true,
      message: "Site deleted successfully",
    });
  } catch (error) {
    console.error("Delete site error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete site",
      error: error.message,
    });
  }
};

/**
 * @desc    Add section to site
 * @route   POST /api/v1/sites/:id/sections
 * @access  Private (Admin only)
 */
export const addSection = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ success: false, message: "Site not found" });
    }

    const sectionData = req.body;

    // ✅ UPDATED: Handle reference images/videos with QTN from Cloudinary
    if (req.files && req.files.length > 0) {
      sectionData.referenceImages = req.files.map((file, idx) => ({
        url: file.url,
        cloudinaryId: file.cloudinaryId,
        uploadedAt: new Date(),
        qtn: parseInt(req.body[`qtn_${idx}`]) || 1,
        mediaType: file.resourceType, // ✅ 'image' or 'video'
        format: file.format, // jpg, png, mp4, etc.
        duration: file.duration || null, // ✅ For videos
      }));
    }

    await site.addSection(sectionData);

    res.status(200).json({
      success: true,
      message: "Section added successfully",
      data: site,
    });
  } catch (error) {
    console.error("Add section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add section",
      error: error.message,
    });
  }
};

/**
 * @desc    Update section
 * @route   PUT /api/v1/sites/:id/sections/:sectionId
 * @access  Private (Admin only)
 */
export const updateSection = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const updateData = req.body;

    // ✅ UPDATED: Handle new reference images/videos with QTN
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, idx) => ({
        url: file.url,
        cloudinaryId: file.cloudinaryId,
        uploadedAt: new Date(),
        qtn: parseInt(req.body[`qtn_${idx}`]) || 1, // ✅ Support QTN
        mediaType: file.resourceType, // ✅ 'image' or 'video'
        format: file.format, // jpg, png, mp4, etc.
        duration: file.duration || null, // ✅ For videos
        caption: req.body[`caption_${idx}`] || "", // ✅ Optional caption
        description: req.body[`description_${idx}`] || "", // ✅ Optional description
      }));

      // Get existing images
      const section = site.sections.id(req.params.sectionId);
      if (section && section.referenceImages) {
        updateData.referenceImages = [...section.referenceImages, ...newImages];
      } else {
        updateData.referenceImages = newImages;
      }
    }

    await site.updateSection(req.params.sectionId, updateData);

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: site,
    });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update section",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete section
 * @route   DELETE /api/v1/sites/:id/sections/:sectionId
 * @access  Private (Admin only)
 */
export const deleteSection = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    // Get section to delete its images
    const section = site.sections.id(req.params.sectionId);

    if (
      section &&
      section.referenceImages &&
      section.referenceImages.length > 0
    ) {
      // Delete reference images from Cloudinary
      for (const img of section.referenceImages) {
        if (img.cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(img.cloudinaryId);
          } catch (err) {
            console.error("Failed to delete reference image:", err);
          }
        }
      }
    }

    await site.deleteSection(req.params.sectionId);

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      data: site,
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete reference image from section
 * @route   DELETE /api/v1/sites/:id/sections/:sectionId/images/:imageId
 * @access  Private (Admin only)
 */
export const deleteReferenceImage = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const section = site.sections.id(req.params.sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Find image
    const imageIndex = section.referenceImages.findIndex(
      (img) => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const image = section.referenceImages[imageIndex];

    // Delete from Cloudinary
    if (image.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryId);
        console.log("🗑️ Reference image deleted from Cloudinary");
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err);
      }
    }

    // Remove from array
    section.referenceImages.splice(imageIndex, 1);
    await site.save();

    res.status(200).json({
      success: true,
      message: "Reference image deleted successfully",
    });
  } catch (error) {
    console.error("Delete reference image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete reference image",
      error: error.message,
    });
  }
};


/**
 * @desc    Update reference image (QTN & Description)
 * @route   PUT /api/v1/sites/:id/sections/:sectionId/images/:imageId
 * @access  Private (Admin only)
 */
export const updateReferenceImage = async (req, res) => {
  try {
    const { id, sectionId, imageId } = req.params;
    const { qtn, description, caption } = req.body;

    const site = await Site.findById(id);

    if (!site) {
      return res.status(404).json({
        success: false,
        message: "Site not found",
      });
    }

    const section = site.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Find the specific image
    const image = section.referenceImages.id(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    // Update image fields
    if (qtn !== undefined) {
      image.qtn = parseInt(qtn) || 1;
    }
    if (description !== undefined) {
      image.description = description;
    }
    if (caption !== undefined) {
      image.caption = caption;
    }

    await site.save();

    res.status(200).json({
      success: true,
      message: "Reference image updated successfully",
      data: site,
    });
  } catch (error) {
    console.error("Update reference image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reference image",
      error: error.message,
    });
  }
};
export default {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  addSection,
  updateSection,
  deleteSection,
  deleteReferenceImage,
  updateReferenceImage,
};
