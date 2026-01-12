/**
 * Cloudinary Upload Provider
 * Handles file uploads to Cloudinary cloud storage.
 * 
 * This is the existing implementation extracted from upload.js middleware.
 */
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import BaseUploadProvider from './BaseUploadProvider.js';

class CloudinaryProvider extends BaseUploadProvider {
  constructor() {
    super();
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a file buffer to Cloudinary
   * @param {Buffer} buffer - File buffer to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Cloudinary upload result
   */
  async upload(buffer, options = {}) {
    const { folder = 'garden-ms', mimetype, filename } = options;

    return new Promise((resolve, reject) => {
      const isVideo = mimetype.startsWith('video/');
      const isAudio = mimetype.startsWith('audio/');
      const isPdf = this.isPdf(mimetype);

      const uploadOptions = {
        folder,
        resource_type: (isVideo || isAudio) ? 'video' : isPdf ? 'image' : 'auto',
      };

      // Apply transformations only to real images (not videos, audio, or PDFs)
      if (!isVideo && !isAudio && !isPdf) {
        uploadOptions.transformation = [
          { width: 1280, crop: 'limit' },
          { quality: 'auto:low' },
          { fetch_format: 'webp' },
        ];
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              resourceType: result.resource_type,
              format: result.format,
              width: result.width,
              height: result.height,
              duration: result.duration || null,
              bytes: result.bytes,
              provider: 'cloudinary'
            });
          }
        }
      );

      streamifier.createReadStream(buffer).pipe(stream);
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Cloudinary public_id
   * @param {string} resourceType - 'image', 'video', or 'raw'
   * @returns {Promise<boolean>}
   */
  async delete(publicId, resourceType = 'image') {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
      console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
      return true;
    } catch (error) {
      console.error('⚠️ Cloudinary deletion error:', error);
      return false;
    }
  }

  /**
   * Get Cloudinary URL for a public_id
   * @param {string} publicId - Cloudinary public_id
   * @param {Object} options - URL options
   * @returns {string}
   */
  getUrl(publicId, options = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  }
}

export default CloudinaryProvider;
