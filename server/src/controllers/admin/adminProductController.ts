/**
 * @file adminProductController.ts
 * @purpose Admin product creation/editing for arbitrary vendors
 * @created 2026-06-10
 *
 * Admins legen Produkte FÜR einen Vendor an (vendorId im Body) und
 * dürfen jedes Produkt bearbeiten — ohne Mietfach-/Ownership-Checks.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import User from '../../models/User';
import { Product } from '../../models/Product';
import {
  createProductForVendor,
  applyProductUpdates,
  findPopulatedProduct
} from '../../services/productService';
import logger from '../../utils/logger';
import AppError from '../../utils/AppError';

/**
 * POST /api/admin/products
 * Create a product on behalf of a vendor (vendorId required in body).
 */
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendorId } = req.body;

    const vendor = await User.findOne({ _id: vendorId, isVendor: true }).select('_id').lean();
    if (!vendor) {
      res.status(400).json({
        success: false,
        message: 'Kein Vendor mit dieser ID gefunden'
      });
      return;
    }

    const product = await createProductForVendor(vendorId, req.body);

    logger.info('[AdminProduct] Product created', {
      productId: product._id,
      vendorId,
      admin: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: await findPopulatedProduct(String(product._id)),
      message: 'Produkt erfolgreich erstellt'
    });
  } catch (error) {
    next(new AppError('Fehler beim Erstellen des Produkts', 500, error));
  }
};

/**
 * PUT /api/admin/products/:id
 * Update any product. vendorId is intentionally not updatable.
 */
export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produkt nicht gefunden' });
      return;
    }

    applyProductUpdates(product, req.body);
    await product.save(); // Triggers post-save hook → Flourio re-sync

    logger.info('[AdminProduct] Product updated', { productId: id, admin: req.user?.id });

    res.json({
      success: true,
      data: await findPopulatedProduct(id),
      message: 'Produkt erfolgreich aktualisiert'
    });
  } catch (error) {
    next(new AppError('Fehler beim Aktualisieren des Produkts', 500, error));
  }
};
