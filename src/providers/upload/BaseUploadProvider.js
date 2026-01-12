/**
 * Base Upload Provider - Abstract interface for upload providers
 * All upload providers must extend this class and implement its methods.
 * 
 * This enables switching between Cloudinary, Local Storage, S3, etc.
 * via the UPLOAD_PROVIDER environment variable.
 */
class BaseUploadProvider {
  constructor() {
    if (new.target === BaseUploadProvider) {
      throw new Error('BaseUploadProvider is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Upload a file buffer to the storage provider
   * @param {Buffer} buffer - File buffer to upload
   * @param {Object} options - Upload options
   * @param {string} options.folder - Folder/directory to store the file
   * @param {string} options.mimetype - MIME type of the file
   * @param {string} [options.filename] - Optional original filename
   * @returns {Promise<Object>} Upload result
   * @returns {string} result.url - Public accessible URL
   * @returns {string} result.publicId - Unique identifier for deletion
   * @returns {string} result.resourceType - 'image', 'video', or 'raw'
   * @returns {string} result.format - File format (jpg, png, mp4, etc.)
   * @returns {number} [result.width] - Width for images/videos
   * @returns {number} [result.height] - Height for images/videos
   * @returns {number} [result.duration] - Duration for videos/audio
   */
  async upload(buffer, options) {
    throw new Error('upload() must be implemented by subclass');
  }

  /**
   * Delete a file from the storage provider
   * @param {string} publicId - The unique identifier of the file to delete
   * @param {string} [resourceType='image'] - Resource type ('image', 'video', 'raw')
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async delete(publicId, resourceType = 'image') {
    throw new Error('delete() must be implemented by subclass');
  }

  /**
   * Get the full URL for a file
   * @param {string} publicId - The unique identifier of the file
   * @param {Object} [options] - URL generation options
   * @returns {string} Full accessible URL
   */
  getUrl(publicId, options = {}) {
    throw new Error('getUrl() must be implemented by subclass');
  }

  /**
   * Determine the resource type from MIME type
   * @param {string} mimetype - MIME type string
   * @returns {string} Resource type ('image', 'video', 'raw')
   */
  getResourceType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'video'; // Audio treated as video in Cloudinary
    return 'raw';
  }

  /**
   * Check if the MIME type is a PDF
   * @param {string} mimetype - MIME type string
   * @returns {boolean}
   */
  isPdf(mimetype) {
    return [
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'application/vnd.pdf',
      'text/pdf'
    ].includes(mimetype);
  }
}

export default BaseUploadProvider;
