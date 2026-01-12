/**
 * Local Upload Provider
 * Handles file uploads to local server storage (e.g., Hostinger).
 * 
 * Features:
 * - Image compression with Sharp
 * - WebP conversion for images
 * - Unique filename generation
 * - Organized folder structure
 */
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import BaseUploadProvider from './BaseUploadProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalProvider extends BaseUploadProvider {
  constructor() {
    super();
    
    // Base upload directory
    this.uploadDir = process.env.LOCAL_UPLOAD_PATH || 'uploads';
    this.baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    // Ensure base upload directory exists
    const fullUploadPath = path.join(__dirname, '../../../', this.uploadDir);
    if (!existsSync(fullUploadPath)) {
      mkdirSync(fullUploadPath, { recursive: true });
    }
  }

  /**
   * Generate a unique filename
   * @param {string} originalFilename - Original filename
   * @param {string} extension - File extension
   * @returns {string}
   */
  generateFilename(originalFilename, extension) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedName = originalFilename
      ? originalFilename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
      : 'file';
    return `${sanitizedName}-${timestamp}-${randomString}${extension}`;
  }

  /**
   * Ensure a directory exists
   * @param {string} dirPath - Directory path
   */
  async ensureDir(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Upload a file buffer to local storage
   * @param {Buffer} buffer - File buffer to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async upload(buffer, options = {}) {
    const { folder = 'general', mimetype, filename } = options;

    const isImage = mimetype.startsWith('image/') && !this.isPdf(mimetype);
    const isVideo = mimetype.startsWith('video/');
    const isAudio = mimetype.startsWith('audio/');
    const isPdf = this.isPdf(mimetype);

    // Determine folder path
    const folderPath = path.join(__dirname, '../../../', this.uploadDir, folder);
    await this.ensureDir(folderPath);

    let savedFilename;
    let processedBuffer = buffer;
    let metadata = {};

    if (isImage) {
      // Process and compress image with Sharp
      const result = await this.processImage(buffer, filename);
      processedBuffer = result.buffer;
      savedFilename = this.generateFilename(filename, '.webp');
      metadata = {
        width: result.width,
        height: result.height,
        format: 'webp',
        resourceType: 'image'
      };
    } else if (isVideo) {
      // Save video as-is (video compression would require ffmpeg)
      const ext = this.getExtensionFromMimetype(mimetype);
      savedFilename = this.generateFilename(filename, ext);
      metadata = {
        format: ext.replace('.', ''),
        resourceType: 'video'
      };
    } else if (isAudio) {
      // Save audio as-is
      const ext = this.getExtensionFromMimetype(mimetype);
      savedFilename = this.generateFilename(filename, ext);
      metadata = {
        format: ext.replace('.', ''),
        resourceType: 'video' // Match Cloudinary convention
      };
    } else if (isPdf) {
      savedFilename = this.generateFilename(filename, '.pdf');
      metadata = {
        format: 'pdf',
        resourceType: 'raw'
      };
    } else {
      // Other file types
      const ext = this.getExtensionFromMimetype(mimetype);
      savedFilename = this.generateFilename(filename, ext);
      metadata = {
        format: ext.replace('.', ''),
        resourceType: 'raw'
      };
    }

    // Write file to disk
    const filePath = path.join(folderPath, savedFilename);
    await fs.writeFile(filePath, processedBuffer);

    // Generate public URL and publicId
    const publicId = `${folder}/${savedFilename}`;
    const url = `${this.baseUrl}/${this.uploadDir}/${folder}/${savedFilename}`;

    console.log(`✅ Local upload successful: ${publicId}`);

    return {
      url,
      publicId,
      resourceType: metadata.resourceType,
      format: metadata.format,
      width: metadata.width || null,
      height: metadata.height || null,
      duration: null, // Would need ffprobe for video duration
      bytes: processedBuffer.length,
      provider: 'local'
    };
  }

  /**
   * Process and compress image with Sharp
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Processed image buffer and metadata
   */
  async processImage(buffer, filename) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if too large (max 1280px width, maintain aspect ratio)
      let processedImage = image;
      if (metadata.width > 1280) {
        processedImage = image.resize(1280, null, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to WebP with quality optimization
      const outputBuffer = await processedImage
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      // Get final dimensions
      const finalMetadata = await sharp(outputBuffer).metadata();

      return {
        buffer: outputBuffer,
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: 'webp'
      };
    } catch (error) {
      console.error('Image processing error:', error);
      // Return original buffer if processing fails
      return {
        buffer,
        width: null,
        height: null,
        format: 'original'
      };
    }
  }

  /**
   * Delete a file from local storage
   * @param {string} publicId - The file path relative to uploads folder
   * @param {string} resourceType - Not used for local storage
   * @returns {Promise<boolean>}
   */
  async delete(publicId, resourceType = 'image') {
    try {
      const filePath = path.join(__dirname, '../../../', this.uploadDir, publicId);
      
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      console.log(`🗑️ Deleted from local storage: ${publicId}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`⚠️ File not found for deletion: ${publicId}`);
        return true; // Consider it deleted if it doesn't exist
      }
      console.error('⚠️ Local deletion error:', error);
      return false;
    }
  }

  /**
   * Get the full URL for a local file
   * @param {string} publicId - The file path relative to uploads folder
   * @param {Object} options - URL options (unused for local)
   * @returns {string}
   */
  getUrl(publicId, options = {}) {
    return `${this.baseUrl}/${this.uploadDir}/${publicId}`;
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimetype - MIME type
   * @returns {string} File extension with dot
   */
  getExtensionFromMimetype(mimetype) {
    const mimeToExt = {
      // Images
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      // Videos
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      // Audio
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/webm': '.webm',
      'audio/x-m4a': '.m4a',
      'audio/mp4': '.m4a',
      // Documents
      'application/pdf': '.pdf',
    };

    return mimeToExt[mimetype] || '.bin';
  }
}

export default LocalProvider;
