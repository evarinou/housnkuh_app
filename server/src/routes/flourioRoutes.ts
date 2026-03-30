/**
 * @file flourioRoutes.ts
 * @purpose Routes for FlourIO integration API endpoints (Article Management)
 * @created 2025-10-17
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  getTags,
  getCategories,
  syncCategories,
  getProducts,
  syncProduct,
  syncBulkProducts
} from '../controllers/flourioController';
import { adminAuth, auth } from '../middleware/auth';

const router = express.Router();

// Middleware that allows both admins and vendors
const adminOrVendorAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token, authorization denied'
    });
  }

  // First authenticate the token
  auth(req, res, () => {
    const user = (req as any).user;

    // Check if user is either admin or vendor
    if (!user?.isAdmin && !user?.isVendor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Vendor rights required.'
      });
    }

    next();
  });
};

/**
 * GET /api/admin/flourio/tags
 * Get FlourIO synced tags (Admin + Vendor)
 */
router.get('/tags', adminOrVendorAuth, getTags);

/**
 * POST /api/admin/flourio/tags/sync
 * @deprecated Since 2025-11-14 - Endpoint deprecated, returns HTTP 410 Gone
 * Tags are now synced automatically when Articles are created
 */
// router.post('/tags/sync', adminAuth, syncTags);

/**
 * GET /api/admin/flourio/categories
 * Get FlourIO categories (Tags with flourioId) (Admin + Vendor)
 */
router.get('/categories', adminOrVendorAuth, getCategories);

/**
 * POST /api/admin/flourio/categories/sync
 * Sync categories from FlourIO (Admin only)
 */
router.post('/categories/sync', adminAuth, syncCategories);

/**
 * GET /api/admin/products
 * Get products with sync status filtering (Admin + Vendor)
 * Vendors see only their own products
 * Query params: search, syncStatus, category
 */
router.get('/products', adminOrVendorAuth, getProducts);

/**
 * POST /api/admin/products/:id/sync
 * Sync single product to FlourIO article (Admin + Vendor)
 * Vendors can only sync their own products
 */
router.post('/products/:id/sync', adminOrVendorAuth, syncProduct);

/**
 * POST /api/admin/products/sync-bulk
 * Bulk sync multiple products (Admin + Vendor)
 * Vendors can only sync their own products
 * Body: { productIds: string[] }
 */
router.post('/products/sync-bulk', adminOrVendorAuth, syncBulkProducts);

export default router;
