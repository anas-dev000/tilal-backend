/**
 * Provider Factory
 * Creates the appropriate upload provider based on environment configuration.
 * 
 * Usage:
 *   const provider = getUploadProvider();
 *   const result = await provider.upload(buffer, options);
 */
import CloudinaryProvider from './CloudinaryProvider.js';
import LocalProvider from './LocalProvider.js';
import HttpStorageProvider from './HttpStorageProvider.js';

// Singleton instances for reuse
let cloudinaryInstance = null;
let localInstance = null;
let httpStorageInstance = null;

/**
 * Get the configured upload provider
 * @returns {BaseUploadProvider} The upload provider instance
 */
export const getUploadProvider = () => {
  const provider = process.env.UPLOAD_PROVIDER || 'cloudinary';
  
  console.log(`📦 Using upload provider: ${provider}`);
  
  switch (provider.toLowerCase()) {
    case 'http_storage':
    case 'remote':
      if (!httpStorageInstance) {
        httpStorageInstance = new HttpStorageProvider();
      }
      return httpStorageInstance;
      
    case 'local':
      if (!localInstance) {
        localInstance = new LocalProvider();
      }
      return localInstance;
    
    case 'cloudinary':
    default:
      if (!cloudinaryInstance) {
        cloudinaryInstance = new CloudinaryProvider();
      }
      return cloudinaryInstance;
  }
};

/**
 * Get a specific provider by name (for migration/debugging)
 * @param {string} name - Provider name ('cloudinary' | 'local')
 * @returns {BaseUploadProvider}
 */
export const getProviderByName = (name) => {
  switch (name.toLowerCase()) {
    case 'local':
      return new LocalProvider();
    case 'cloudinary':
      return new CloudinaryProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
};

export default { getUploadProvider, getProviderByName };
