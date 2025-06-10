// server/src/services/vendorService.ts
import User from '../models/User';
import { IUser } from '../types/modelTypes';

// Simple in-memory cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlMs: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
    
    // Simple cleanup to prevent memory leaks
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new SimpleCache();

export class VendorService {
  /**
   * Get optimized public vendor listing with caching and proper indexing
   */
  static async getPublicVendors(filters: {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string[];
    location?: string;
  } = {}): Promise<{
    vendors: any[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 20, search, categories, location } = filters;
    
    // Create cache key based on filters
    const cacheKey = `public_vendors_${JSON.stringify(filters)}`;
    const cached = cache.get<{
      vendors: any[];
      total: number;
      pages: number;
      currentPage: number;
    }>(cacheKey);
    if (cached) {
      console.log('Cache hit for public vendors');
      return cached;
    }
    
    // Build optimized aggregation pipeline
    const pipeline: any[] = [
      // Match stage - uses indexes for optimal performance
      {
        $match: {
          isVendor: true,
          isPubliclyVisible: true,
          'kontakt.status': 'aktiv',
          registrationStatus: { $in: ['trial_active', 'active'] }
        }
      }
    ];
    
    // Add text search if provided
    if (search) {
      pipeline[0].$match.$text = { $search: search };
    }
    
    // Add category filter if provided
    if (categories && categories.length > 0) {
      pipeline[0].$match['vendorProfile.kategorien'] = { $in: categories };
    }
    
    // Add location filter if provided
    if (location) {
      pipeline[0].$match['adressen.ort'] = new RegExp(location, 'i');
    }
    
    // Project only needed fields for performance
    pipeline.push({
      $project: {
        'kontakt.name': 1,
        'kontakt.email': 1,
        'vendorProfile.unternehmen': 1,
        'vendorProfile.beschreibung': 1,
        'vendorProfile.profilBild': 1,
        'vendorProfile.kategorien': 1,
        'vendorProfile.slogan': 1,
        'vendorProfile.website': 1,
        'vendorProfile.socialMedia': 1,
        'vendorProfile.verifyStatus': 1,
        'vendorProfile.oeffnungszeiten': 1,
        'adressen': 1,
        'registrationStatus': 1,
        'createdAt': 1,
        'updatedAt': 1
      }
    });
    
    // Add text search score if searching
    if (search) {
      pipeline[1].$project.score = { $meta: 'textScore' };
    }
    
    // Sort stage
    const sortStage: any = {};
    if (search) {
      sortStage.score = { $meta: 'textScore' };
    } else {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });
    
    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    // Execute queries in parallel for better performance
    const [vendors, totalResult] = await Promise.all([
      User.aggregate(pipeline),
      User.aggregate([
        pipeline[0], // Use same match stage
        { $count: 'total' }
      ])
    ]);
    
    const total = totalResult[0]?.total || 0;
    const pages = Math.ceil(total / limit);
    
    const result = {
      vendors,
      total,
      pages,
      currentPage: page
    };
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300000);
    
    return result;
  }
  
  /**
   * Get vendor details by ID with caching
   */
  static async getVendorDetails(vendorId: string): Promise<IUser | null> {
    const cacheKey = `vendor_details_${vendorId}`;
    const cached = cache.get<IUser>(cacheKey);
    if (cached) {
      console.log('Cache hit for vendor details');
      return cached;
    }
    
    // Use optimized query with specific field selection
    const vendor = await User.findOne({
      _id: vendorId,
      isVendor: true,
      isPubliclyVisible: true,
      'kontakt.status': 'aktiv'
    }).select(
      'kontakt vendorProfile adressen registrationStatus createdAt updatedAt'
    );
    
    if (vendor) {
      // Cache for 10 minutes
      cache.set(cacheKey, vendor, 600000);
    }
    
    return vendor;
  }
  
  /**
   * Get vendor statistics for admin dashboard with caching
   */
  static async getVendorStatistics(): Promise<{
    total: number;
    active: number;
    publiclyVisible: number;
    trialActive: number;
    preregistered: number;
    verified: number;
  }> {
    const cacheKey = 'vendor_statistics';
    const cached = cache.get<{
      total: number;
      active: number;
      publiclyVisible: number;
      trialActive: number;
      preregistered: number;
      verified: number;
    }>(cacheKey);
    if (cached) {
      console.log('Cache hit for vendor statistics');
      return cached;
    }
    
    // Use aggregation pipeline for efficient counting
    const stats = await User.aggregate([
      {
        $match: { isVendor: true }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$kontakt.status', 'aktiv'] }, 1, 0]
            }
          },
          publiclyVisible: {
            $sum: {
              $cond: ['$isPubliclyVisible', 1, 0]
            }
          },
          trialActive: {
            $sum: {
              $cond: [{ $eq: ['$registrationStatus', 'trial_active'] }, 1, 0]
            }
          },
          preregistered: {
            $sum: {
              $cond: [{ $eq: ['$registrationStatus', 'preregistered'] }, 1, 0]
            }
          },
          verified: {
            $sum: {
              $cond: [{ $eq: ['$vendorProfile.verifyStatus', 'verified'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0,
      active: 0,
      publiclyVisible: 0,
      trialActive: 0,
      preregistered: 0,
      verified: 0
    };
    
    // Cache for 2 minutes
    cache.set(cacheKey, result, 120000);
    
    return result;
  }
  
  /**
   * Invalidate vendor-related cache entries
   */
  static invalidateCache(vendorId?: string): void {
    if (vendorId) {
      cache.invalidate(`vendor_details_${vendorId}`);
    }
    cache.invalidate('public_vendors');
    cache.invalidate('vendor_statistics');
  }
  
  /**
   * Bulk update vendor visibility with optimized queries
   */
  static async bulkUpdateVisibility(vendorIds: string[], isVisible: boolean): Promise<{
    success: boolean;
    modifiedCount: number;
  }> {
    try {
      const result = await User.updateMany(
        { 
          _id: { $in: vendorIds },
          isVendor: true
        },
        { 
          isPubliclyVisible: isVisible
        }
      );
      
      // Invalidate cache after bulk update
      this.invalidateCache();
      
      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Error in bulk update visibility:', error);
      return {
        success: false,
        modifiedCount: 0
      };
    }
  }
}

export default VendorService;