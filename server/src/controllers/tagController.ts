import { Request, Response } from 'express';
import { Tag, ITag } from '../models/Tag';
import { Product } from '../models/Product';

// Get all tags with optional filtering
export const getAllTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, active } = req.query;
    
    const filter: any = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    
    const tags = await Tag.find(filter).sort({ category: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      data: tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Tags'
    });
  }
};

// Get tags grouped by category
export const getTagsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await Tag.find({ isActive: true }).sort({ category: 1, name: 1 });
    
    const groupedTags = tags.reduce((acc: any, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = [];
      }
      acc[tag.category].push(tag);
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: groupedTags
    });
  } catch (error) {
    console.error('Error fetching tags by category:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Tag-Kategorien'
    });
  }
};

// Get single tag by ID or slug
export const getTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let tag = await Tag.findById(identifier);
    if (!tag) {
      tag = await Tag.findOne({ slug: identifier });
    }
    
    if (!tag) {
      res.status(404).json({
        success: false,
        message: 'Tag nicht gefunden'
      });
      return;
    }
    
    // Get product count for this tag
    const productCount = await Product.countDocuments({
      tags: tag._id,
      isActive: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...tag.toObject(),
        productCount
      }
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Tags'
    });
  }
};

// Create new tag (admin only)
export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, color, icon } = req.body;
    
    // Check if tag with same name and category already exists
    const existingTag = await Tag.findOne({ 
      name: name.trim(), 
      category: category || 'product' 
    });
    
    if (existingTag) {
      res.status(400).json({
        success: false,
        message: 'Tag mit diesem Namen existiert bereits in dieser Kategorie'
      });
      return;
    }
    
    const tag = new Tag({
      name: name.trim(),
      description: description?.trim(),
      category: category || 'product',
      color,
      icon,
      isActive: true
    });
    
    await tag.save();
    
    res.status(201).json({
      success: true,
      data: tag,
      message: 'Tag erfolgreich erstellt'
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Tags'
    });
  }
};

// Update tag (admin only)
export const updateTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, category, color, icon, isActive } = req.body;
    
    const tag = await Tag.findById(id);
    if (!tag) {
      res.status(404).json({
        success: false,
        message: 'Tag nicht gefunden'
      });
      return;
    }
    
    // Check for duplicate name if name is being changed
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({ 
        name: name.trim(), 
        category: category || tag.category,
        _id: { $ne: id }
      });
      
      if (existingTag) {
        res.status(400).json({
          success: false,
          message: 'Tag mit diesem Namen existiert bereits in dieser Kategorie'
        });
        return;
      }
    }
    
    // Update fields
    if (name) tag.name = name.trim();
    if (description !== undefined) tag.description = description?.trim();
    if (category) tag.category = category;
    if (color) tag.color = color;
    if (icon !== undefined) tag.icon = icon;
    if (isActive !== undefined) tag.isActive = isActive;
    
    await tag.save();
    
    res.status(200).json({
      success: true,
      data: tag,
      message: 'Tag erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Tags'
    });
  }
};

// Delete tag (admin only)
export const deleteTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const tag = await Tag.findById(id);
    if (!tag) {
      res.status(404).json({
        success: false,
        message: 'Tag nicht gefunden'
      });
      return;
    }
    
    // Check if tag is used by any products
    const productCount = await Product.countDocuments({ tags: id });
    if (productCount > 0) {
      res.status(400).json({
        success: false,
        message: `Tag kann nicht gelöscht werden. Es wird von ${productCount} Produkt(en) verwendet.`
      });
      return;
    }
    
    await Tag.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Tag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Tags'
    });
  }
};

// Search tags
export const searchTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Suchbegriff ist erforderlich'
      });
      return;
    }
    
    const filter: any = {
      isActive: true,
      $text: { $search: q }
    };
    
    if (category) filter.category = category;
    
    const tags = await Tag.find(filter)
      .limit(parseInt(limit as string))
      .sort({ score: { $meta: 'textScore' }, name: 1 });
    
    res.status(200).json({
      success: true,
      data: tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error searching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Tag-Suche'
    });
  }
};

// Bulk create or find tags
export const bulkCreateTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagNames, category = 'product' } = req.body;
    
    if (!Array.isArray(tagNames) || tagNames.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Tag-Namen Array ist erforderlich'
      });
      return;
    }
    
    const tags = await Tag.findOrCreateTags(tagNames, category);
    
    res.status(200).json({
      success: true,
      data: tags,
      message: `${tags.length} Tags verarbeitet`
    });
  } catch (error) {
    console.error('Error bulk creating tags:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Tags'
    });
  }
};