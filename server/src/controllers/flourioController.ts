/**
 * @file flourioController.ts
 * @purpose Controller for FlourIO integration API endpoints (Article Management)
 * @created 2025-10-17
 */

import { Request, Response } from 'express';
import { FlourioClient } from '../services/flourio/client/FlourioClient';
import { flourioConfig } from '../services/flourio/client/config';
import { TagSyncService } from '../services/flourio/services/TagSyncService';
import { ArticleService } from '../services/flourio/services/ArticleService';
import { Product } from '../models/Product';
import { Tag } from '../models/Tag';
import logger from '../utils/logger';

logger.debug('Initializing FlourioClient', {
  baseURL: flourioConfig.baseURL,
  bearerTokenLength: flourioConfig.bearerToken?.length || 0,
  mockMode: flourioConfig.mockMode
});

const flourioClient = new FlourioClient(flourioConfig);

const tagSyncService = new TagSyncService(flourioClient);
const articleService = new ArticleService(flourioClient);

/**
 * GET /api/admin/flourio/tags
 * Get FlourIO synced tags
 */
export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await tagSyncService.getFlourioSyncedTags();
    const stats = await tagSyncService.getSyncStats();

    res.json({
      success: true,
      data: tags,
      stats
    });
  } catch (error: any) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/flourio/tags/sync
 * Trigger tag sync from FlourIO
 */
export const /**
 * @deprecated Since 2025-11-14 - Tags are now synced automatically when Articles are created
 * Returns HTTP 410 Gone
 */
syncTags = async (req: Request, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Tag sync endpoint has been deprecated. Tags are now automatically created by FlourIO when Articles are synced via ArticleService.syncProduct(). No manual tag synchronization is needed.',
    deprecatedSince: '2025-11-14',
    migration: {
      old: 'POST /api/admin/flourio/tags/sync',
      new: 'POST /api/admin/flourio/products/{id}/sync',
      reason: 'housnkuh is now the leading data source for tags'
    }
  });
};;

/**
 * GET /api/admin/flourio/categories
 * Get FlourIO categories (Tags with flourioId)
 * Access: Admin + Vendor (read-only)
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Tag.find({
      flourioId: { $exists: true, $ne: null },
      isActive: true
    })
      .select('name flourioId isActive createdAt updatedAt')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/flourio/categories/sync
 * Sync categories from FlourIO (uses TagSyncService)
 * Access: Admin only
 */
export const syncCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const syncResult = await tagSyncService.syncTags();

    const categories = await Tag.find({
      flourioId: { $exists: true, $ne: null },
      isActive: true
    })
      .select('name flourioId isActive')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
      syncResult,
      message: `Synced ${syncResult.synced} categories (${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deactivated} deactivated)`
    });
  } catch (error: any) {
    logger.error('Error syncing categories:', error);
    res.status(500).json({
      success: false,
      message: 'Category sync failed',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/products (Admin + Vendor)
 * Get products with sync status filtering
 * Vendors see only their own products, Admins see all
 */
export const getProducts = async (req: any, res: Response): Promise<void> => {
  try {
    const { search, syncStatus, category } = req.query;
    const user = req.user;

    const filter: any = {};

    // Vendors can only see their own products
    if (user?.isVendor && !user?.isAdmin) {
      filter.vendorId = user.id;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (syncStatus) {
      filter['flourioSync.status'] = syncStatus;
    }

    // Category filter now uses tags with flourioId
    if (category) {
      const categoryTag = await Tag.findOne({
        name: category,
        flourioId: { $exists: true, $ne: null }
      }).select('_id');

      if (categoryTag) {
        filter.tags = categoryTag._id;
      }
    }

    const products = await Product.find(filter)
      .populate('vendorId', 'name email')
      .populate('tags', 'name color flourioId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: products
    });
  } catch (error: any) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/products/:id/sync (Admin + Vendor)
 * Sync single product to FlourIO article
 * Vendors can only sync their own products
 */
export const syncProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Vendors can only sync their own products
    if (user?.isVendor && !user?.isAdmin) {
      if (product.vendorId.toString() !== user.id) {
        res.status(403).json({
          success: false,
          message: 'You can only sync your own products'
        });
        return;
      }
    }

    const syncResult = await articleService.syncProduct(product);

    const updatedProduct = await Product.findById(id)
      .populate('vendorId', 'name email')
      .populate('tags', 'name color');

    res.json({
      success: true,
      data: {
        product: updatedProduct,
        flourioArticle: syncResult.article
      },
      message: syncResult.created ? 'Article created successfully' : 'Article updated successfully'
    });
  } catch (error: any) {
    logger.error('Error syncing product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync product',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/products/sync-bulk (Admin + Vendor)
 * Bulk sync multiple products
 * Vendors can only sync their own products
 */
export const syncBulkProducts = async (req: any, res: Response): Promise<void> => {
  try {
    const { productIds } = req.body;
    const user = req.user;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'productIds array is required'
      });
      return;
    }

    // Vendors: Filter to only their own products
    let validProductIds = productIds;
    if (user?.isVendor && !user?.isAdmin) {
      const products = await Product.find({
        _id: { $in: productIds },
        vendorId: user.id
      }).select('_id');

      validProductIds = products.map(p => p._id.toString());

      if (validProductIds.length === 0) {
        res.status(403).json({
          success: false,
          message: 'None of the provided products belong to you'
        });
        return;
      }
    }

    const result = await articleService.bulkSyncProducts(validProductIds);

    res.json({
      success: true,
      data: result,
      message: `Sync completed: ${result.synced} synced, ${result.failed} failed`
    });
  } catch (error: any) {
    logger.error('Error bulk syncing products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk sync products',
      error: error.message
    });
  }
};
