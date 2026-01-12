/**
 * Upload Providers - Barrel Export
 * Provides a clean import interface for the upload provider system.
 */
export { default as BaseUploadProvider } from './BaseUploadProvider.js';
export { default as CloudinaryProvider } from './CloudinaryProvider.js';
export { default as LocalProvider } from './LocalProvider.js';
export { getUploadProvider, getProviderByName } from './providerFactory.js';
