/**
 * @file Product model for the housnkuh marketplace application
 * @description Comprehensive product model with seasonal availability, pricing, and vendor management
 * Supports bulk pricing, seasonal products, and SEO optimization
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import logger from '../utils/logger';

/**
 * Interface for bulk pricing tiers
 * @description Defines structure for quantity-based pricing
 */
export interface IBulkPrice {
  minQuantity: number;
  price: number;
  unit: string;
}

/**
 * Interface for seasonal product information
 * @description Defines seasonal availability periods
 */
export interface ISeasonalInfo {
  seasonStart: Date;
  seasonEnd: Date;
  description?: string;
}

/**
 * Interface for Product document
 * @description Comprehensive product structure with vendor, pricing, and availability management
 */
export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  
  // Basic Info
  name: string;
  description: string;
  shortDescription?: string;
  
  // Classification
  tags: mongoose.Types.ObjectId[];
  
  // Pricing & Units
  price?: number;
  priceUnit?: string;
  minimumQuantity?: number;
  bulkPricing?: IBulkPrice[];
  
  // Availability
  availability: 'available' | 'seasonal' | 'out_of_stock' | 'preorder';
  seasonalInfo?: ISeasonalInfo;
  
  // Media
  images: string[];
  primaryImageIndex: number;
  
  // SEO & Discovery
  slug: string;
  metaDescription?: string;
  keywords: string[];
  
  // Management
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  // FlourIO Sync (Push: housnkuh → Flourio)
  flourioSync?: {
    articleId?: string;
    status: 'synced' | 'pending' | 'error' | 'never';
    lastSyncedAt?: Date;
    error?: string;
  };

  // FlourIO Stock (Pull: Flourio → housnkuh) — Flourio is source of truth for inventory
  flourioStock?: {
    totalAmount: number;
    entries: Array<{
      warehouseId: string;
      warehouseName?: string;
      amount: number;
    }>;
    lastPulledAt?: Date;
  };
}

/**
 * Schema for bulk pricing tiers
 * @description Defines quantity-based pricing with validation for minimum quantities and units
 */
const BulkPriceSchema = new Schema({
  minQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'piece', 'liter', 'ml', 'bunch', 'pack', 'box']
  }
});

/**
 * Schema for seasonal product information
 * @description Defines seasonal availability periods with start/end dates and optional description
 */
const SeasonalInfoSchema = new Schema({
  seasonStart: {
    type: Date,
    required: true
  },
  seasonEnd: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    maxlength: 200
  }
});

/**
 * Main product schema with comprehensive fields for marketplace products
 * @description Full product schema with vendor association, pricing, availability, and SEO features
 */
const ProductSchema: Schema<IProduct> = new Schema({
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  shortDescription: {
    type: String,
    maxlength: 200,
    trim: true
  },
  
  // Classification
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  
  // Pricing & Units
  price: {
    type: Number,
    min: 0
  },
  priceUnit: {
    type: String,
    enum: ['kg', 'g', 'piece', 'liter', 'ml', 'bunch', 'pack', 'box'],
    default: 'piece'
  },
  minimumQuantity: {
    type: Number,
    min: 1,
    default: 1
  },
  bulkPricing: [BulkPriceSchema],
  
  // Availability
  availability: {
    type: String,
    enum: ['available', 'seasonal', 'out_of_stock', 'preorder'],
    required: true,
    default: 'available'
  },
  seasonalInfo: SeasonalInfoSchema,
  
  // Media
  images: [{
    type: String,
    trim: true
  }],
  primaryImageIndex: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // SEO & Discovery
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Management
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // FlourIO Sync (Push: housnkuh → Flourio)
  flourioSync: {
    articleId: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['synced', 'pending', 'error', 'never'],
      default: 'never'
    },
    lastSyncedAt: {
      type: Date
    },
    error: {
      type: String,
      trim: true
    }
  },

  // FlourIO Stock (Pull: Flourio → housnkuh)
  flourioStock: {
    totalAmount: {
      type: Number,
      default: 0
    },
    entries: [{
      warehouseId: { type: String, required: true },
      warehouseName: { type: String },
      amount: { type: Number, required: true }
    }],
    lastPulledAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for product queries including vendor lookups,
 * search functionality, and featured product sorting
 */
ProductSchema.index({ vendorId: 1, isActive: 1 });
ProductSchema.index({ tags: 1, availability: 1 });
ProductSchema.index({ 'flourioSync.articleId': 1 });
ProductSchema.index({ slug: 1, vendorId: 1 }, { unique: true });
ProductSchema.index({ name: 'text', description: 'text', keywords: 'text' });
ProductSchema.index({ featured: 1, sortOrder: 1 });

/**
 * Pre-save middleware to generate slug and validate image index
 * @description Automatically generates SEO-friendly slug from product name and validates image index
 * @complexity O(n) where n is the length of the product name
 */
ProductSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[äöüß]/g, (match) => {
        const replacements: { [key: string]: string } = {
          'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    this.slug = baseSlug;
  }
  
  // Validate primaryImageIndex
  if (this.images && this.images.length > 0) {
    if (this.primaryImageIndex >= this.images.length) {
      this.primaryImageIndex = 0;
    }
  } else {
    this.primaryImageIndex = 0;
  }
  
  next();
});

/**
 * Post-save hook: Auto-sync product to FlourIO when relevant fields change
 * @description Automatically syncs product to FlourIO Article API when:
 * - Product is newly created (isNew)
 * - Relevant fields change (name, description, price, tags, images)
 *
 * Sync runs asynchronously via setImmediate() to avoid blocking save operation.
 * Errors are logged but do not prevent product save from completing.
 *
 * @complexity O(1) for change detection, O(n) for sync operation where n is API latency
 */
ProductSchema.post('save', async function(doc) {
  // Check if sync is needed based on modified fields
  const shouldSync =
    this.isNew || // New product
    this.isModified('name') ||
    this.isModified('description') ||
    this.isModified('price') ||
    this.isModified('tags') ||
    this.isModified('images');

  if (!shouldSync) {
    return; // Skip sync if no relevant changes
  }

  // Async sync (don't block save operation)
  setImmediate(async () => {
    try {
      // Dynamic imports to avoid circular dependency
      const { ArticleService } = await import('../services/flourio/services/ArticleService');
      const { FlourioClient } = await import('../services/flourio/client/FlourioClient');
      const { flourioConfig } = await import('../services/flourio/client/config');

      logger.info('[Product Hook] Auto-syncing product to FlourIO', { productId: doc._id });

      const client = new FlourioClient(flourioConfig);
      const articleService = new ArticleService(client);

      await articleService.syncProduct(doc);

      logger.info('[Product Hook] Successfully synced product', { productId: doc._id });
    } catch (error: any) {
      logger.error('[Product Hook] Failed to sync product', { productId: doc._id, error: error.message });
      // Don't throw - sync errors should not break save operation
      // TODO: Implement retry queue or alerting system
    }
  });
});

/**
 * Virtual field for primary image URL
 * @description Returns the primary image URL based on primaryImageIndex
 * @returns string|null - Primary image URL or null if no images
 * @complexity O(1) - Simple array access
 */
ProductSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[this.primaryImageIndex] || this.images[0];
  }
  return null;
});

/**
 * Virtual field for FlourIO category from tags
 * @description Returns the first tag with flourioId (FlourIO category tag)
 * @returns Tag|null - FlourIO category tag or null if not found
 * @complexity O(1) with proper population
 */
ProductSchema.virtual('flourioCategory', {
  ref: 'Tag',
  localField: 'tags',
  foreignField: '_id',
  justOne: true,
  match: { flourioId: { $exists: true, $ne: null } }
});

/**
 * Instance method to check if product is currently in season
 * @description Determines if seasonal product is available based on current date
 * @returns boolean - True if product is in season or non-seasonal and available
 * @complexity O(1) - Simple date comparisons
 */
ProductSchema.methods.isInSeason = function(): boolean {
  if (this.availability !== 'seasonal' || !this.seasonalInfo) {
    return this.availability === 'available';
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const seasonStart = new Date(currentYear, this.seasonalInfo.seasonStart.getMonth(), this.seasonalInfo.seasonStart.getDate());
  const seasonEnd = new Date(currentYear, this.seasonalInfo.seasonEnd.getMonth(), this.seasonalInfo.seasonEnd.getDate());
  
  // Handle seasons that cross year boundaries
  if (seasonStart > seasonEnd) {
    return now >= seasonStart || now <= seasonEnd;
  }
  
  return now >= seasonStart && now <= seasonEnd;
};

/**
 * Static method to find products by vendor with optional filters
 * @description Retrieves active products for a specific vendor with tag population and sorting
 * @param vendorId - Vendor ID to filter by
 * @param filters - Optional additional filters (availability, category, etc.)
 * @returns Query - Mongoose query with populated tags and sorting
 * @complexity O(n log n) where n is number of vendor products (due to sorting)
 */
ProductSchema.statics.findByVendor = function(vendorId: string, filters: any = {}) {
  const query = { vendorId, isActive: true, ...filters };
  return this.find(query)
    .populate('tags', 'name slug category color')
    .sort({ featured: -1, sortOrder: 1, createdAt: -1 });
};

/**
 * Interface for Product model with static methods
 * @description Extends Model interface with product-specific static methods
 */
export interface IProductModel extends Model<IProduct> {
  findByVendor(vendorId: string, filters?: any): any;
}

/**
 * Product model export
 * @description Exports the Product model with comprehensive marketplace functionality
 */
export const Product = mongoose.model<IProduct, IProductModel>('Product', ProductSchema);