/**
 * @file Query cache system for database query optimization
 * @description In-memory query cache with TTL support, cache invalidation, and decorators
 * for optimizing expensive database operations
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { createHash } from 'crypto';

/**
 * Interface for cache entry with TTL
 * @interface CacheEntry
 * @description Represents a cached item with expiration time
 */
interface CacheEntry {
  /** Cached data of any type */
  data: any;
  /** Expiration timestamp in milliseconds */
  expiresAt: number;
}

/**
 * In-memory query cache with TTL support
 * @class QueryCache
 * @description Provides caching for database queries with automatic expiration and invalidation
 * For production environments, consider using Redis for distributed caching
 */
class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 300; // 5 minutes in seconds

  /**
   * Generate cache key from query parameters
   * @method generateKey
   * @private
   * @description Creates a unique cache key by combining namespace with hashed parameters
   * @param {string} namespace - Cache namespace for grouping related entries
   * @param {Record<string, any>} params - Query parameters to hash
   * @returns {string} Generated cache key
   * @complexity O(n) where n is the size of params
   * @security Uses MD5 hash for key generation (not cryptographically secure)
   */
  private generateKey(namespace: string, params: Record<string, any>): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = createHash('md5').update(paramString).digest('hex').substring(0, 8);
    return `${namespace}:${hash}`;
  }

  /**
   * Get cached data
   * @method get
   * @template T - Type of cached data
   * @description Retrieves cached data for given namespace and parameters
   * @param {string} namespace - Cache namespace
   * @param {Record<string, any>} params - Query parameters
   * @returns {Promise<T | null>} Cached data or null if not found/expired
   * @complexity O(1) average case
   * @security Validates expiration to prevent stale data access
   */
  async get<T>(namespace: string, params: Record<string, any>): Promise<T | null> {
    const key = this.generateKey(namespace, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data
   * @method set
   * @description Stores data in cache with specified TTL
   * @param {string} namespace - Cache namespace
   * @param {Record<string, any>} params - Query parameters
   * @param {any} data - Data to cache
   * @param {number} ttlSeconds - Optional TTL in seconds (default: 300)
   * @returns {Promise<void>} Promise resolving when data is cached
   * @complexity O(1) average case
   * @security Sets expiration time to prevent indefinite storage
   */
  async set(namespace: string, params: Record<string, any>, data: any, ttlSeconds?: number): Promise<void> {
    const key = this.generateKey(namespace, params);
    const ttl = ttlSeconds || this.defaultTTL;
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, {
      data,
      expiresAt
    });
  }

  /**
   * Delete cache entries by namespace pattern
   * @method invalidate
   * @description Removes cache entries matching the namespace pattern
   * @param {string} namespacePattern - Namespace pattern to match for deletion
   * @returns {Promise<number>} Number of entries deleted
   * @complexity O(n) where n is the number of cache entries
   * @security Allows selective cache invalidation to prevent stale data
   */
  async invalidate(namespacePattern: string): Promise<number> {
    let deleted = 0;
    
    for (const [key] of this.cache) {
      if (key.startsWith(namespacePattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Clear all expired entries
   * @method cleanup
   * @description Removes all expired cache entries
   * @returns {number} Number of expired entries removed
   * @complexity O(n) where n is the number of cache entries
   * @security Prevents memory accumulation from expired entries
   */
  cleanup(): number {
    let deleted = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get cache statistics
   * @method getStats
   * @description Retrieves cache statistics including size and keys
   * @returns {Object} Cache statistics
   * @returns {number} returns.size - Number of entries in cache
   * @returns {string[]} returns.keys - Array of all cache keys
   * @complexity O(n) where n is the number of cache entries
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clear all cache
   * @method clear
   * @description Removes all entries from the cache
   * @returns {void}
   * @complexity O(1)
   * @security Provides complete cache reset capability
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance of QueryCache
 * @constant {QueryCache} queryCache
 * @description Application-wide query cache instance
 */
export const queryCache = new QueryCache();

/**
 * Cache decorator for expensive queries
 * @function cached
 * @description Decorator that automatically caches method results based on arguments
 * @param {string} namespace - Cache namespace for the decorated method
 * @param {number} ttlSeconds - Optional TTL in seconds
 * @returns {Function} Method decorator function
 * @complexity O(1) for cache hits, O(f) for cache misses where f is method complexity
 * @security Caches method results, avoid using with sensitive data
 */
export function cached(namespace: string, ttlSeconds?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Create cache key from method arguments
      const cacheParams = {
        method: propertyName,
        args: args.map(arg => 
          typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg
        )
      };

      // Try to get from cache
      const cached = await queryCache.get(namespace, cacheParams);
      if (cached !== null) {
        console.log(`🎯 Cache hit: ${namespace}:${propertyName}`);
        return cached;
      }

      // Execute method and cache result
      console.log(`🔄 Cache miss: ${namespace}:${propertyName}`);
      const result = await method.apply(this, args);
      
      await queryCache.set(namespace, cacheParams, result, ttlSeconds);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helper
 * @class CacheInvalidator
 * @description Provides methods for selective cache invalidation based on data changes
 */
export class CacheInvalidator {
  /**
   * Invalidate cache entries affected by contract changes
   * @method onContractChange
   * @static
   * @description Clears cache entries that depend on contract data
   * @returns {Promise<void>} Promise resolving when invalidation is complete
   * @complexity O(n) where n is the number of cache entries
   */
  static async onContractChange(): Promise<void> {
    await Promise.all([
      queryCache.invalidate('revenue'),
      queryCache.invalidate('mietfach'),
      queryCache.invalidate('contracts'),
      queryCache.invalidate('vendor-bookings')
    ]);
  }

  /**
   * Invalidate cache entries affected by Mietfach changes
   * @method onMietfachChange
   * @static
   * @description Clears cache entries that depend on Mietfach data
   * @returns {Promise<void>} Promise resolving when invalidation is complete
   * @complexity O(n) where n is the number of cache entries
   */
  static async onMietfachChange(): Promise<void> {
    await Promise.all([
      queryCache.invalidate('mietfach'),
      queryCache.invalidate('availability')
    ]);
  }

  /**
   * Invalidate cache entries affected by user changes
   * @method onUserChange
   * @static
   * @description Clears cache entries that depend on user data
   * @returns {Promise<void>} Promise resolving when invalidation is complete
   * @complexity O(n) where n is the number of cache entries
   */
  static async onUserChange(): Promise<void> {
    await Promise.all([
      queryCache.invalidate('users'),
      queryCache.invalidate('vendors')
    ]);
  }
}

/**
 * Auto-cleanup interval for expired cache entries
 * @description Runs cleanup every 10 minutes to remove expired entries
 * @complexity O(n) where n is the number of cache entries
 */
setInterval(() => {
  const deleted = queryCache.cleanup();
  if (deleted > 0) {
    console.log(`🧹 Cleaned up ${deleted} expired cache entries`);
  }
}, 10 * 60 * 1000);

/**
 * Default export of queryCache instance
 * @default queryCache
 */
export default queryCache;