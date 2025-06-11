// client/src/utils/imageUtils.ts

/**
 * Resolves image URLs to ensure they are complete URLs
 * Handles both relative paths and absolute URLs correctly
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
 * Creates a fallback chain for vendor images (banner -> profile -> placeholder)
 */
export const getVendorImageWithFallback = (bannerUrl: string, profileUrl: string, placeholderUrl: string = ''): string => {
  if (bannerUrl) return resolveImageUrl(bannerUrl);
  if (profileUrl) return resolveImageUrl(profileUrl);
  return placeholderUrl;
};