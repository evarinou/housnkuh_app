import mongoose, { Schema, Document, Model } from 'mongoose';

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

// Indexes for performance
TagSchema.index({ slug: 1 });
TagSchema.index({ category: 1, isActive: 1 });
TagSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to generate slug
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

// Static method to find or create tags
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

export interface ITagModel extends Model<ITag> {
  findOrCreateTags(tagNames: string[], category?: string): Promise<ITag[]>;
}

export const Tag = mongoose.model<ITag, ITagModel>('Tag', TagSchema);