import { Request, Response, NextFunction } from 'express';
import { cache } from '../utils/cache';

/**
 * Cache middleware for API endpoints
 * Caches GET requests based on the full URL and query parameters
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
      console.error('Cache middleware error:', error);
      // If caching fails, continue without caching
      next();
    }
  };
};

/**
 * Invalidate cache entries by pattern
 */
export const invalidateCache = (pattern: string): number => {
  const stats = cache.getStats();
  const keysToDelete = stats.keys.filter(key => key.includes(pattern));
  
  keysToDelete.forEach(key => cache.delete(key));
  
  console.log(`Cache invalidation: Removed ${keysToDelete.length} entries matching pattern: ${pattern}`);
  return keysToDelete.length;
};

/**
 * Cache invalidation middleware for POST/PUT/DELETE requests
 * Automatically invalidates related cache entries
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