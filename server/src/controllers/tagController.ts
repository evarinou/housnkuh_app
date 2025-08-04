/**
 * @file Tag controller for the housnkuh marketplace application
 * @description Tag management controller with CRUD operations, categorization, and search functionality
 * Handles tag creation, retrieval, updates, deletion, and bulk operations with product integration
 */

import { Request, Response } from 'express';
import { Tag, ITag } from '../models/Tag';
import { Product } from '../models/Product';

/**
 * Retrieves all tags with optional filtering
 * @description Fetches tags with optional category and active status filtering
 * @param req - Express request object with optional query parameters (category, active)
 * @param res - Express response object with filtered tag data
 * @returns Promise<void> - Resolves with filtered tag list or error message
 * @complexity O(n log n) where n is number of matching tags (due to sorting)
 * @security Public endpoint with optional filtering
 */
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

/**
 * Retrieves active tags grouped by category
 * @description Fetches active tags and groups them by category for organizational display
 * @param req - Express request object
 * @param res - Express response object with categorized tag data
 * @returns Promise<void> - Resolves with categorized tag groups or error message
 * @complexity O(n) where n is number of active tags
 * @security Public endpoint - only returns active tags
 */
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

/**
 * Retrieves a specific tag by ID or slug with product count
 * @description Fetches single tag by ID or slug and includes associated product count
 * @param req - Express request object with identifier parameter (ID or slug)
 * @param res - Express response object with tag data and product count
 * @returns Promise<void> - Resolves with tag data or error message
 * @complexity O(1) for tag lookup + O(n) for product count
 * @security Public endpoint with product count aggregation
 */
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

/**
 * Creates a new tag with duplicate validation
 * @description Creates new tag with validation for duplicate names within category
 * @param req - Express request object with tag data (name, description, category, color, icon)
 * @param res - Express response object with created tag data
 * @returns Promise<void> - Resolves with created tag or error message
 * @complexity O(1) - Single database insertion with duplicate check
 * @security Admin only endpoint with duplicate validation
 */
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

/**
 * Updates an existing tag with duplicate validation
 * @description Updates tag with validation for duplicate names within category
 * @param req - Express request object with tag ID parameter and update data
 * @param res - Express response object with updated tag data
 * @returns Promise<void> - Resolves with updated tag or error message
 * @complexity O(1) - Single database update with duplicate check
 * @security Admin only endpoint with existence and duplicate validation
 */
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

/**
 * Deletes a tag with product usage validation
 * @description Deletes tag only if not used by any products
 * @param req - Express request object with tag ID parameter
 * @param res - Express response object with deletion confirmation
 * @returns Promise<void> - Resolves with deletion confirmation or error message
 * @complexity O(1) for tag lookup + O(n) for product usage check
 * @security Admin only endpoint with product usage validation
 */
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

/**
 * Searches tags using text search with optional category filtering
 * @description Performs full-text search on tags with optional category filtering and result limiting
 * @param req - Express request object with search query parameters (q, category, limit)
 * @param res - Express response object with matching tag data
 * @returns Promise<void> - Resolves with matching tags or error message
 * @complexity O(n log n) where n is number of matching tags (due to text search scoring)
 * @security Public endpoint with search term validation
 */
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

/**
 * Bulk creates or finds existing tags
 * @description Creates multiple tags or finds existing ones using findOrCreateTags method
 * @param req - Express request object with tagNames array and category
 * @param res - Express response object with processed tag data
 * @returns Promise<void> - Resolves with processed tags or error message
 * @complexity O(n) where n is number of tag names to process
 * @security Admin endpoint with array validation
 */
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