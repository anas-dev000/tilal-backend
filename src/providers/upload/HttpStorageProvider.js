import axios from 'axios';
import FormData from 'form-data';
import BaseUploadProvider from './BaseUploadProvider.js';

/**
 * Http Storage Provider
 * Forwards file uploads to a remote Storage Server (e.g. on Hostinger) via HTTP.
 */
class HttpStorageProvider extends BaseUploadProvider {
  constructor() {
    super();
    this.apiUrl = process.env.STORAGE_SERVER_URL;
    this.apiKey = process.env.STORAGE_SERVER_API_KEY;

    if (!this.apiUrl || !this.apiKey) {
      console.warn('⚠️ HttpStorageProvider: STORAGE_SERVER_URL or STORAGE_SERVER_API_KEY is missing');
    }
  }

  /**
   * Forward file buffer to remote storage server
   * @param {Buffer} buffer - File buffer
   * @param {Object} options - Upload options
   */
  async upload(buffer, options = {}) {
    const { folder = 'general', mimetype, filename } = options;

    if (!this.apiUrl || !this.apiKey) {
      throw new Error('Storage service configuration is incomplete.');
    }

    try {
      const form = new FormData();
      form.append('file', buffer, {
        filename: filename || 'file',
        contentType: mimetype,
      });
      form.append('folder', folder);

      const response = await axios.post(`${this.apiUrl}/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Upload failed on storage server');
      }

      return {
        ...response.data.data,
        provider: 'http_storage'
      };
    } catch (error) {
      console.error('❌ HttpStorageProvider upload error:', error.response?.data || error.message);
      throw new Error(`Remote storage upload failed: ${error.message}`);
    }
  }

  /**
   * Request file deletion from remote storage server
   * @param {string} publicId - File publicId (folder/filename)
   */
  async delete(publicId, resourceType = 'image') {
    if (!this.apiUrl || !this.apiKey) return false;

    try {
      const response = await axios.delete(`${this.apiUrl}/delete`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        data: { publicId }
      });

      return !!response.data?.success;
    } catch (error) {
      console.error('❌ HttpStorageProvider deletion error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get the full URL (usually returned directly from the server, but reconstructed here if needed)
   */
  getUrl(publicId, options = {}) {
    // Reconstruct URL if we know the storage server maps publicId to its static serve path
    return `${this.apiUrl}/uploads/${publicId}`;
  }
}

export default HttpStorageProvider;
