/**
 * @file Simple in-memory cache implementation for frequently accessed data
 * @description Provides basic caching without external dependencies like Redis
 * with TTL support and automatic cleanup
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Interface for cache items with expiry
 * @interface CacheItem
 * @template T - Type of cached data
 */
interface CacheItem<T> {
  /** The cached data */
  data: T;
  /** Expiry timestamp in milliseconds */
  expiry: number;
}

/**
 * In-memory cache implementation with TTL support
 * @class InMemoryCache
 * @description Thread-safe in-memory cache with automatic cleanup
 */
class InMemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  /**
   * Creates a new InMemoryCache instance
   * @constructor
   * @description Initializes cache with automatic cleanup every 5 minutes
   * @complexity O(1)
   */
  constructor() {
    /** Clean up expired items every 5 minutes */
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Store data in cache with TTL (time to live) in seconds
   * @method set
   * @template T - Type of data to store
   * @param {string} key - Cache key
   * @param {T} data - Data to store
   * @param {number} ttlSeconds - Time to live in seconds (default: 300)
   * @returns {void}
   * @complexity O(1)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Retrieve data from cache
   * @method get
   * @template T - Type of data to retrieve
   * @param {string} key - Cache key
   * @returns {T | null} Cached data or null if not found/expired
   * @complexity O(1)
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    /** Check if item has expired */
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Delete specific key from cache
   * @method delete
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if key was found and deleted, false otherwise
   * @complexity O(1)
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   * @method clear
   * @returns {void}
   * @complexity O(n) where n is the number of cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @method getStats
   * @returns {Object} Cache statistics containing size and keys
   * @returns {number} returns.size - Number of items in cache
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
   * Remove expired entries
   * @method cleanup
   * @private
   * @returns {void}
   * @complexity O(n) where n is the number of cache entries
   * @description Iterates through all cache entries and removes expired ones
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: Removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Get or set pattern for efficient caching
   * @method getOrSet
   * @template T - Type of data to cache
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not in cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 300)
   * @returns {Promise<T>} Cached data or freshly fetched data
   * @complexity O(1) for cache hit, O(f) for cache miss where f is fetchFunction complexity
   * @description Implements cache-aside pattern for efficient data access
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Cleanup on shutdown
   * @method destroy
   * @returns {void}
   * @complexity O(n) where n is the number of cache entries
   * @description Clears cleanup interval and removes all cache entries
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Singleton cache instance for application-wide use
 * @constant {InMemoryCache} cache
 */
export const cache = new InMemoryCache();

/**
 * Cache key constants for consistency
 * @constant {object} CACHE_KEYS
 * @description Predefined cache keys to prevent typos and ensure consistency
 */
export const CACHE_KEYS = {
  /** Store settings cache key */
  STORE_SETTINGS: 'store_settings',
  /** Public vendors cache key */
  PUBLIC_VENDORS: 'public_vendors',
  /** Vendor categories cache key */
  VENDOR_CATEGORIES: 'vendor_categories',
  /** Admin statistics cache key */
  ADMIN_STATS: 'admin_stats',
  /** Email templates cache key */
  EMAIL_TEMPLATES: 'email_templates'
} as const;

/**
 * Cache TTL constants (in seconds)
 * @constant {object} CACHE_TTL
 * @description Predefined TTL values for different cache duration needs
 */
export const CACHE_TTL = {
  /** Short cache duration - 1 minute */
  SHORT: 60,
  /** Medium cache duration - 5 minutes */
  MEDIUM: 300,
  /** Long cache duration - 1 hour */
  LONG: 3600,
  /** Very long cache duration - 24 hours */
  VERY_LONG: 86400
} as const;

export default cache;