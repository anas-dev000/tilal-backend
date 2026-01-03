// backend/src/middleware/upload.js - ✅ UPDATED: Support Videos
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dms7inqwd",
  api_key: process.env.CLOUDINARY_API_KEY || "337142537941378",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "PR3IR1wd6uc0lVh_jU_t8GVVmKY",
});

// ✅ Memory storage for Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // ✅ 100MB for videos
  fileFilter: (req, file, cb) => {
    // 🛑 DEBUGING: Allow everything to see if filter is the issue
    console.log("🔍 DEBUG: fileFilter checking:", file.originalname, file.mimetype);
    return cb(null, true);

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

// ✅ Upload to Cloudinary (Images, Videos or Audio)
const uploadToCloudinary = (fileBuffer, folder = "garden-ms", mimetype) => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith('video/');
    const isAudio = mimetype.startsWith('audio/');
    const isPdf = mimetype === 'application/pdf';
    
    const uploadOptions = {
      folder,
      resource_type: (isVideo || isAudio) ? 'video' : isPdf ? 'image' : 'auto', 
    };

    // ✅ Only apply transformations to real images (not videos, audio or PDFs)
    if (!isVideo && !isAudio && !isPdf) {
      uploadOptions.transformation = [
        { width: 1280, crop: "limit" },
        { quality: "auto:low" },
        { fetch_format: "webp" },
      ];
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ✅ Single file upload
export const uploadSingle = (fieldName, folder = "general") => [
  upload.single(fieldName),
  async (req, res, next) => {
    try {
      console.log("🛠️ MiddleWare uploadSingle called for:", fieldName);
      console.log("📁 req.file:", req.file ? "File present" : "No file");
      if (req.file) console.log("📄 File details:", req.file.originalname, req.file.mimetype, req.file.size);
      
      if (!req.file) return next();

      console.log("📤 Uploading to Cloudinary...");
      const result = await uploadToCloudinary(
        req.file.buffer, 
        folder, 
        req.file.mimetype
      );

      req.file.cloudinaryUrl = result.secure_url;
      req.file.cloudinaryId = result.public_id;
      req.file.resourceType = result.resource_type; // ✅ 'image' or 'video'
      req.file.format = result.format;

      console.log(`✅ Upload successful (${result.resource_type}):`, result.secure_url);
      next();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      next(error);
    }
  },
];

// ✅ Multiple files upload
export const uploadMultiple = (fieldName, maxCount = 50, folder = "tasks") => [
  upload.array(fieldName, maxCount),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) return next();

      console.log(`📤 Uploading ${req.files.length} files to Cloudinary...`);

      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, folder, file.mimetype)
      );

      const results = await Promise.all(uploadPromises);

      req.files = results.map((result) => ({
        url: result.secure_url,
        cloudinaryId: result.public_id,
        resourceType: result.resource_type, // ✅ 'image' or 'video'
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration, // ✅ For videos
      }));

      console.log("✅ All files uploaded successfully");
      next();
    } catch (error) {
      console.error("❌ Upload failed:", error);
      next(error);
    }
  },
];

// ✅ Error handler
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