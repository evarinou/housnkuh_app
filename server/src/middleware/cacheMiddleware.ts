/**
 * @file Cache middleware for API endpoint response caching
 * @description Provides middleware for caching API responses and cache invalidation
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response, NextFunction } from 'express';
import { cache } from '../utils/cache';
import logger from '../utils/logger';

/**
 * Cache middleware factory for API endpoints
 * @description Creates middleware that caches GET requests based on URL and query parameters
 * @param {number} ttlSeconds - Time to live in seconds (default: 300)
 * @returns {function} Express middleware function
 * @complexity O(1) for cache hits, O(n) for cache misses
 */
export const cacheMiddleware = (ttlSeconds: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from full URL including query parameters
    const cacheKey = `api_cache:${req.originalUrl}`;
    
    try {
      // Try to get cached response
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache the response
      res.json = function(body: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, body, ttlSeconds);
        }
        
        // Add cache miss header
        res.set('X-Cache', 'MISS');
        
        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      // If caching fails, continue without caching
      next();
    }
  };
};

/**
 * Invalidates cache entries by pattern matching
 * @param {string} pattern - Pattern to match against cache keys
 * @returns {number} Number of cache entries deleted
 * @complexity O(n) where n is number of cache entries
 */
export const invalidateCache = (pattern: string): number => {
  const stats = cache.getStats();
  const keysToDelete = stats.keys.filter(key => key.includes(pattern));
  
  keysToDelete.forEach(key => cache.delete(key));
  
  logger.debug('Cache invalidation', { removedCount: keysToDelete.length, pattern });
  return keysToDelete.length;
};

/**
 * Cache invalidation middleware factory for modifying operations
 * @description Creates middleware that invalidates cache entries after successful operations
 * @param {string[]} patterns - Array of patterns to match for cache invalidation
 * @returns {function} Express middleware function
 * @complexity O(n*m) where n is number of patterns and m is number of cache entries
 */
export const cacheInvalidationMiddleware = (patterns: string[]) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to invalidate cache after successful operations
    res.json = function(body: any) {
      // Invalidate cache for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          invalidateCache(pattern);
        });
      }
      
      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

export default cacheMiddleware;

/**
 * Antwort-Header gegen Browser-/Proxy-Caching (für Admin-Live-Daten).
 * Ausgelagert aus adminRoutes (AUDIT S16).
 */
export const noCacheHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};
