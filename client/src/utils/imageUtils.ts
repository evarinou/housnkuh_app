/**
 * @file imageUtils.ts
 * @purpose Image URL resolution and fallback utilities for handling relative/absolute paths and vendor image hierarchies
 * @created 2025-01-15
 * @modified 2025-08-05
 */

/**
 * Resolves image URLs to ensure they are complete URLs
 * 
 * @description Converts relative image paths to absolute URLs by prepending the server base URL.
 * Leaves already absolute URLs unchanged. Handles empty/null URLs gracefully.
 * 
 * @param {string} url - Image URL or path to resolve
 * @returns {string} Complete absolute URL or empty string for invalid input
 */
export const resolveImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If URL is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is relative, prepend the server base URL
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:4000';
  return `${baseUrl}${url}`;
};

/**
 * Creates a fallback chain for vendor images with priority hierarchy
 * 
 * @description Implements image fallback logic: banner → profile → placeholder.
 * Used for vendor listings where multiple image types may be available.
 * Each URL is resolved through resolveImageUrl before returning.
 * 
 * @param {string} bannerUrl - Primary banner image URL (highest priority)
 * @param {string} profileUrl - Fallback profile image URL (medium priority)
 * @param {string} placeholderUrl - Final fallback placeholder URL (lowest priority)
 * @returns {string} First available image URL or placeholder
 */
export const getVendorImageWithFallback = (bannerUrl: string, profileUrl: string, placeholderUrl: string = ''): string => {
  if (bannerUrl) return resolveImageUrl(bannerUrl);
  if (profileUrl) return resolveImageUrl(profileUrl);
  return placeholderUrl;
};