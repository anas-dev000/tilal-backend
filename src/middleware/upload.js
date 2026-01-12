// backend/src/middleware/upload.js - REFACTORED: Provider-based upload system
/**
 * Upload Middleware
 * 
 * Uses a provider-based system to support multiple storage backends.
 * Switch between providers using UPLOAD_PROVIDER environment variable:
 *   - UPLOAD_PROVIDER=cloudinary (default)
 *   - UPLOAD_PROVIDER=local
 */
import multer from "multer";
import { uploadFile, uploadMultipleFiles, deleteFile } from "../services/uploadService.js";

// Memory storage for processing before upload
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: (req, file, cb) => {
    // DEBUG: Allow everything to see if filter is the issue
    console.log("🔍 DEBUG: fileFilter checking:", file.originalname, file.mimetype);
    return cb(null, true);

    // Uncomment below for production file filtering:
    // const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    // const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
    // const allowedAudioTypes = /mp3|wav|ogg|webm|m4a|mpeg/;
    // const allowedDocTypes = /pdf/;
    
    // const extname = file.originalname.toLowerCase();
    // const mimetype = file.mimetype;

    // const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
    // const isVideo = allowedVideoTypes.test(extname) && mimetype.startsWith('video/');
    // const isAudio = allowedAudioTypes.test(extname) && mimetype.startsWith('audio/');
    // const isDoc = allowedDocTypes.test(extname) && mimetype === 'application/pdf';

    // if (isImage || isVideo || isAudio || isDoc) {
    //   return cb(null, true);
    // }
    // cb(new Error("Only image, video, audio and PDF files are allowed!"));
  },
});

/**
 * Upload a single file using the configured provider
 * @param {string} fieldName - Form field name
 * @param {string} folder - Target folder in storage
 * @returns {Array} Multer middleware + upload handler
 */
export const uploadSingle = (fieldName, folder = "general") => [
  upload.single(fieldName),
  async (req, res, next) => {
    try {
      console.log("🛠️ MiddleWare uploadSingle called for:", fieldName);
      console.log("📁 req.file:", req.file ? "File present" : "No file");
      if (req.file) console.log("📄 File details:", req.file.originalname, req.file.mimetype, req.file.size);
      
      if (!req.file) return next();

      console.log(`📤 Uploading to ${process.env.UPLOAD_PROVIDER || 'cloudinary'}...`);
      
      const result = await uploadFile(req.file.buffer, {
        folder,
        mimetype: req.file.mimetype,
        filename: req.file.originalname
      });

      // Attach result to req.file for controller access
      // Using both old field names (cloudinaryUrl/cloudinaryId) for backward compatibility
      // and new field names (url/publicId) for future code
      req.file.cloudinaryUrl = result.url;
      req.file.cloudinaryId = result.publicId;
      req.file.url = result.url;
      req.file.publicId = result.publicId;
      req.file.resourceType = result.resourceType;
      req.file.format = result.format;
      req.file.provider = result.provider;

      console.log(`✅ Upload successful (${result.resourceType}):`, result.url);
      next();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      next(error);
    }
  },
];

/**
 * Upload multiple files using the configured provider
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files
 * @param {string} folder - Target folder in storage
 * @returns {Array} Multer middleware + upload handler
 */
export const uploadMultiple = (fieldName, maxCount = 50, folder = "tasks") => [
  upload.array(fieldName, maxCount),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) return next();

      console.log(`📤 Uploading ${req.files.length} files to ${process.env.UPLOAD_PROVIDER || 'cloudinary'}...`);

      const filesToUpload = req.files.map(file => ({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname
      }));

      const results = await uploadMultipleFiles(filesToUpload, folder);

      // Transform results to match expected format
      // Keep backward compatibility with cloudinaryId field name
      req.files = results.map((result) => ({
        url: result.url,
        cloudinaryId: result.publicId,
        publicId: result.publicId,
        resourceType: result.resourceType,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        provider: result.provider
      }));

      console.log("✅ All files uploaded successfully");
      next();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      next(error);
    }
  },
];

/**
 * Upload named fields using the configured provider (for Worker Profile, etc.)
 * @param {Array} fields - Array of field configs [{name: 'fieldName', maxCount: 1}]
 * @param {string} folder - Target folder in storage
 * @returns {Array} Multer middleware + upload handler
 */
export const uploadFields = (fields, folder = "workers") => [
  upload.fields(fields),
  async (req, res, next) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) return next();

      console.log(`📤 Uploading named fields to ${process.env.UPLOAD_PROVIDER || 'cloudinary'}...`);

      // req.files is an object where key is fieldname and value is array of files
      const uploadPromises = [];

      Object.keys(req.files).forEach((fieldName) => {
        req.files[fieldName].forEach((file) => {
          uploadPromises.push(
            uploadFile(file.buffer, {
              folder,
              mimetype: file.mimetype,
              filename: file.originalname
            }).then((result) => ({
              fieldName,
              result,
              originalFile: file
            }))
          );
        });
      });

      const results = await Promise.all(uploadPromises);

      // Initialize an object to store results for easier access
      req.uploadedFiles = {};

      results.forEach(({ fieldName, result, originalFile }) => {
        // Attach the URL and details to the file object in req.files[fieldName]
        const fileIndex = req.files[fieldName].findIndex(f => f.originalname === originalFile.originalname);
        if (fileIndex !== -1) {
          req.files[fieldName][fileIndex].cloudinaryUrl = result.url;
          req.files[fieldName][fileIndex].cloudinaryId = result.publicId;
          req.files[fieldName][fileIndex].url = result.url;
          req.files[fieldName][fileIndex].publicId = result.publicId;
          req.files[fieldName][fileIndex].resourceType = result.resourceType;
          req.files[fieldName][fileIndex].provider = result.provider;
        }

        // Also populate a simple key-value map for easier controller usage
        req.uploadedFiles[fieldName] = result.url;
      });

      console.log("✅ All named files uploaded successfully");
      next();
    } catch (error) {
      console.error("❌ Upload fields failed:", error);
      next(error);
    }
  },
];

/**
 * Delete a file using the configured provider
 * Exported for use in controllers
 * @param {string} publicId - File identifier
 * @param {string} resourceType - 'image', 'video', or 'raw'
 * @returns {Promise<boolean>}
 */
export const deleteUploadedFile = async (publicId, resourceType = 'image') => {
  return deleteFile(publicId, resourceType);
};

/**
 * Error handler for upload errors
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 100MB",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 50 files",
      });
    }
  }

  if (err) {
    console.error("Upload error:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

export default upload;