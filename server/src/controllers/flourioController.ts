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
// StockItemEntryPullService is used via ScheduledJobs.triggerStockPull()
import { Product } from '../models/Product';
import { FlourioDocument } from '../models/FlourioDocument';
import { Tag } from '../models/Tag';
import { ScheduledJobs } from '../services/scheduledJobs';
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
 * @deprecated Tags are now synced automatically when Articles are created.
 * Returns HTTP 410 Gone.
 */
export const syncCategories = async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({
    success: false,
    message: 'Category sync ist deprecated. Tags werden automatisch beim Artikel-Sync erstellt.',
    deprecatedSince: '2025-11-14'
  });
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
    logger.error('Error syncing product:', {
      message: error.message,
      stack: error.stack?.split('\n')[1]?.trim(),
      response: error.response?.data
    });
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

// ─── Stock Level Endpoints ────────────────────────────────────────────

/**
 * GET /api/admin/flourio/stock/levels
 * Get all products with their Flourio stock levels (Admin only)
 */
export const getStockLevels = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({
      'flourioSync.articleId': { $exists: true, $ne: null }
    })
      .select('name vendorId flourioSync flourioStock availability')
      .populate('vendorId', 'kontakt.name vendorProfile.unternehmen')
      .sort({ 'flourioStock.totalAmount': 1 })
      .lean();

    const stats = {
      total: products.length,
      inStock: products.filter(p => (p.flourioStock?.totalAmount ?? 0) > 0).length,
      outOfStock: products.filter(p => (p.flourioStock?.totalAmount ?? 0) === 0).length,
      neverPulled: products.filter(p => !p.flourioStock?.lastPulledAt).length
    };

    res.json({
      success: true,
      data: products,
      stats
    });
  } catch (error: any) {
    logger.error('Error fetching stock levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock levels',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/flourio/stock/pull
 * Manually trigger stock pull from Flourio (Admin only)
 */
export const triggerStockPull = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.triggerStockPull();

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Stock pull completed' : 'Stock pull failed'
    });
  } catch (error: any) {
    logger.error('Error triggering stock pull:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger stock pull',
      error: error.message
    });
  }
};

// ─── Document Endpoints ───────────────────────────────────────────────

/**
 * GET /api/admin/flourio/documents
 * List documents (Admin: all, Vendor: own)
 */
export const getDocuments = async (req: any, res: Response): Promise<void> => {
  try {
    const { type, status, fromDate, toDate } = req.query;
    const user = req.user;

    const filter: any = {};

    // Vendors can only see their own documents
    if (user?.isVendor && !user?.isAdmin) {
      filter.vendorId = user.id;
    }

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate as string);
      if (toDate) filter.date.$lte = new Date(toDate as string);
    }

    const documents = await FlourioDocument.find(filter)
      .populate('vendorId', 'kontakt.name vendorProfile.unternehmen')
      .sort({ date: -1 })
      .limit(200)
      .lean();

    res.json({
      success: true,
      data: documents
    });
  } catch (error: any) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/flourio/documents/stats
 * Get document statistics (Admin only)
 */
export const getDocumentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [total, byType, byStatus] = await Promise.all([
      FlourioDocument.countDocuments(),
      FlourioDocument.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$total' } } }
      ]),
      FlourioDocument.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const lastPull = await FlourioDocument.findOne()
      .sort({ lastPulledAt: -1 })
      .select('lastPulledAt')
      .lean();

    res.json({
      success: true,
      data: {
        total,
        byType: Object.fromEntries(byType.map(t => [t._id, { count: t.count, totalAmount: t.totalAmount }])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        lastPulledAt: lastPull?.lastPulledAt
      }
    });
  } catch (error: any) {
    logger.error('Error fetching document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document stats',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/flourio/documents/:id
 * Get single document detail (Admin: any, Vendor: own)
 */
export const getDocumentById = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const filter: any = { _id: id };
    if (user?.isVendor && !user?.isAdmin) {
      filter.vendorId = user.id;
    }

    const document = await FlourioDocument.findOne(filter)
      .populate('vendorId', 'kontakt.name vendorProfile.unternehmen')
      .populate('items.productId', 'name price priceUnit')
      .lean();

    if (!document) {
      res.status(404).json({ success: false, message: 'Dokument nicht gefunden' });
      return;
    }

    res.json({ success: true, data: document });
  } catch (error: any) {
    logger.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/flourio/documents/sync
 * Manually trigger document sync (Admin only)
 */
export const triggerDocumentSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ScheduledJobs.triggerDocumentSync();

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Document sync completed' : 'Document sync failed'
    });
  } catch (error: any) {
    logger.error('Error triggering document sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger document sync',
      error: error.message
    });
  }
};
