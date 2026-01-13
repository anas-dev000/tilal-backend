/**
 * Upload Service
 * Unified interface for file uploads that wraps the provider system.
 * 
 * This service provides a clean API for uploading and deleting files,
 * automatically using the configured provider from environment.
 */
import { getUploadProvider } from '../providers/upload/index.js';

/**
 * Upload a single file
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @param {string} options.folder - Target folder
 * @param {string} options.mimetype - File MIME type
 * @param {string} [options.filename] - Original filename
 * @returns {Promise<Object>} Upload result with url, publicId, etc.
 */
export const uploadFile = async (buffer, options) => {
  const provider = getUploadProvider();
  return provider.upload(buffer, options);
};

/**
 * Upload multiple files
 * @param {Array<{buffer: Buffer, mimetype: string, filename?: string}>} files
 * @param {string} folder - Target folder
 * @returns {Promise<Array<Object>>} Array of upload results
 */
export const uploadMultipleFiles = async (files, folder) => {
  const provider = getUploadProvider();
  
  const uploadPromises = files.map(file => 
    provider.upload(file.buffer, {
      folder,
      mimetype: file.mimetype,
      filename: file.filename || file.originalname
    })
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Delete a file
 * @param {string} publicId - File public ID or path
 * @param {string} [resourceType='image'] - Resource type
 * @returns {Promise<boolean>} True if successful
 */
export const deleteFile = async (publicId, resourceType = 'image', providerName = null) => {
  if (!publicId) {
    console.warn('⚠️ No publicId provided for deletion');
    return false;
  }
  
  let provider;
  if (providerName) {
    // If provider is specified (e.g. from DB), use that specific provider
    console.log(`🗑️ Deleting using specified provider: ${providerName}`);
    try {
      // Need to import this dynamically or assume we have a helper
      const { getProviderByName } = await import('../providers/upload/providerFactory.js');
      provider = getProviderByName(providerName);
    } catch (err) {
      console.warn(`⚠️ Could not get provider '${providerName}', falling back to default. Error: ${err.message}`);
      provider = getUploadProvider();
    }
  } else {
    // Fallback to configured provider (legacy behavior)
    provider = getUploadProvider();
  }

  return provider.delete(publicId, resourceType);
};

/**
 * Get file URL
 * @param {string} publicId - File public ID or path
 * @param {Object} [options] - URL options
 * @returns {string} Full URL
 */
export const getFileUrl = (publicId, options = {}) => {
  const provider = getUploadProvider();
  return provider.getUrl(publicId, options);
};

/**
 * Get current provider name
 * @returns {string} Provider name ('cloudinary' | 'local')
 */
export const getCurrentProvider = () => {
  return process.env.UPLOAD_PROVIDER || 'cloudinary';
};

export default {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  getFileUrl,
  getCurrentProvider
};
