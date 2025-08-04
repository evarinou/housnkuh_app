/**
 * @file Tag model for the housnkuh marketplace application
 * @description Product and content tagging system with categorization and dynamic creation
 * Supports multiple tag types including product tags, certifications, methods, and features
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interface for Tag document
 * @description Defines structure for categorized tags with slug generation and visual customization
 */
export interface ITag extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  category: 'product' | 'certification' | 'method' | 'feature';
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tag schema with categorization and visual customization
 * @description Manages tags with automatic slug generation and category-based organization
 */
const TagSchema: Schema<ITag> = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 200,
    trim: true
  },
  category: {
    type: String,
    enum: ['product', 'certification', 'method', 'feature'],
    required: true,
    default: 'product'
  },
  color: {
    type: String,
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    default: '#6B7280'
  },
  icon: {
    type: String,
    maxlength: 50
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for tag queries including slug lookups and text search
 */
TagSchema.index({ slug: 1 });
TagSchema.index({ category: 1, isActive: 1 });
TagSchema.index({ name: 'text', description: 'text' });

/**
 * Pre-save middleware to generate URL-friendly slug
 * @description Automatically generates SEO-friendly slug from tag name with German character handling
 * @complexity O(n) where n is the length of the tag name
 */
TagSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
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
  }
  next();
});

/**
 * Static method to find or create tags dynamically
 * @description Finds existing tags or creates new ones with automatic slug generation
 * @param tagNames - Array of tag names to find or create
 * @param category - Tag category (product, certification, method, feature)
 * @returns Promise<ITag[]> - Array of found or created tag documents
 * @complexity O(n*m) where n is tagNames length and m is average database query time
 */
TagSchema.statics.findOrCreateTags = async function(tagNames: string[], category: string = 'product'): Promise<ITag[]> {
  const tags: ITag[] = [];
  
  for (const name of tagNames) {
    let tag = await this.findOne({ name: name.trim(), category });
    
    if (!tag) {
      tag = new this({
        name: name.trim(),
        category,
        isActive: true
      });
      await tag.save();
    }
    
    tags.push(tag);
  }
  
  return tags;
};

/**
 * Interface for Tag model with static methods
 * @description Extends Model interface with tag-specific static methods for dynamic creation
 */
export interface ITagModel extends Model<ITag> {
  findOrCreateTags(tagNames: string[], category?: string): Promise<ITag[]>;
}

/**
 * Tag model export
 * @description Exports the Tag model with categorization and dynamic creation capabilities
 */
export const Tag = mongoose.model<ITag, ITagModel>('Tag', TagSchema);