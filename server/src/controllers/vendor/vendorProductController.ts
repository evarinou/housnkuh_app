/**
 * @file vendorProductController.ts
 * @purpose Vendor product creation and stock booking with Mietfach validation
 * @created 2026-03-31
 *
 * Kernregel: Vendors dürfen Bestand NUR auf Mietfächer buchen,
 * für die sie eine aktive Buchung (Vertrag) haben.
 */

import { Request, Response } from 'express';
import { Product } from '../../models/Product';
import Mietfach from '../../models/Mietfach';
import mongoose from 'mongoose';
import logger from '../../utils/logger';

// Dynamic import to avoid loading Flourio at module level
const getVertragModel = () => mongoose.model('Vertrag');

/**
 * Get all Mietfächer that a vendor has active bookings for.
 * Reusable helper for product creation and stock booking validation.
 */
async function getVendorActiveMietfaecher(vendorId: string) {
  const Vertrag = getVertragModel();
  const now = new Date();

  const activeVertraege = await Vertrag.find({
    user: vendorId,
    status: 'active'
  }).populate('services.mietfach').lean();

  const mietfaecher: any[] = [];
  const seenIds = new Set<string>();

  for (const vertrag of activeVertraege) {
    for (const service of (vertrag as any).services || []) {
      if (!service.mietfach) continue;

      const mietbeginn = new Date(service.mietbeginn);
      const mietende = service.mietende ? new Date(service.mietende) : null;

      // Check if booking is currently active
      if (mietbeginn <= now && (!mietende || mietende >= now)) {
        const mfId = String(service.mietfach._id || service.mietfach);
        if (!seenIds.has(mfId)) {
          seenIds.add(mfId);
          mietfaecher.push(service.mietfach);
        }
      }
    }
  }

  return mietfaecher;
}

/**
 * GET /api/vendor-auth/mietfaecher
 * Returns Mietfächer the vendor has active bookings for.
 */
export const getVendorMietfaecher = async (req: any, res: Response): Promise<void> => {
  try {
    const vendorId = req.user.id;
    const mietfaecher = await getVendorActiveMietfaecher(vendorId);

    res.json({
      success: true,
      data: mietfaecher
    });
  } catch (error: any) {
    logger.error('Error fetching vendor Mietfaecher:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Mietfächer',
      error: error.message
    });
  }
};

/**
 * POST /api/vendor-auth/products
 * Create a product for the authenticated vendor.
 * Optionally books initial stock to a Mietfach.
 */
export const createProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const vendorId = req.user.id;
    const {
      name, description, price, priceUnit,
      tags, images, availability, minimumQuantity,
      shortDescription, seasonalInfo, bulkPricing, keywords,
      initialStock // optional: { mietfachId, amount }
    } = req.body;

    // Validate required fields
    if (!name || !description || price == null || !priceUnit) {
      res.status(400).json({
        success: false,
        message: 'Name, Beschreibung, Preis und Einheit sind Pflichtfelder'
      });
      return;
    }

    // If initialStock provided, validate Mietfach access
    if (initialStock?.mietfachId) {
      const activeMietfaecher = await getVendorActiveMietfaecher(vendorId);
      const hasAccess = activeMietfaecher.some(
        (mf: any) => String(mf._id) === String(initialStock.mietfachId)
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Keine aktive Buchung für dieses Mietfach vorhanden'
        });
        return;
      }
    }

    // Generate slug from name (same logic as pre-save hook in Product model)
    const slug = name
      .toLowerCase()
      .replace(/[äöüß]/g, (match: string) => {
        const r: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
        return r[match] || match;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create product
    const product = await Product.create({
      vendorId,
      name,
      description,
      shortDescription,
      slug,
      price,
      priceUnit,
      tags: tags || [],
      images: images || [],
      availability: availability || 'available',
      minimumQuantity: minimumQuantity || 1,
      seasonalInfo,
      bulkPricing,
      keywords: keywords || [],
      isActive: true
    });

    logger.info('[VendorProduct] Product created', {
      productId: product._id,
      vendorId,
      name: product.name
    });

    // Book initial stock if provided (async, non-blocking)
    if (initialStock?.mietfachId && initialStock?.amount > 0 && product.flourioSync?.articleId) {
      setImmediate(async () => {
        try {
          const mietfach = await Mietfach.findById(initialStock.mietfachId);
          if (!mietfach?.flourioWarehouseId || !product.flourioSync?.articleId) return;

          const { StockItemEntryService } = await import('../../services/flourio/services/StockItemEntryService');
          const { FlourioClient } = await import('../../services/flourio/client/FlourioClient');
          const { flourioConfig } = await import('../../services/flourio/client/config');

          const client = new FlourioClient(flourioConfig);
          const stockService = new StockItemEntryService(client);

          await stockService.create({
            item: product.flourioSync.articleId,
            stock: mietfach.flourioWarehouseId,
            amount: initialStock.amount,
            type: 'I'
          });

          logger.info('[VendorProduct] Initial stock booked', {
            productId: product._id,
            mietfachId: initialStock.mietfachId,
            amount: initialStock.amount
          });
        } catch (error: any) {
          logger.error('[VendorProduct] Failed to book initial stock', {
            productId: product._id,
            error: error.message
          });
        }
      });
    }

    // Return created product with populated fields
    const populatedProduct = await Product.findById(product._id)
      .populate('tags', 'name color slug')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedProduct,
      message: 'Produkt erfolgreich erstellt'
    });
  } catch (error: any) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Produkts',
      error: error.message
    });
  }
};

/**
 * POST /api/vendor-auth/products/:id/stock
 * Book stock for a product onto a Mietfach.
 * Validates vendor has active booking for the Mietfach.
 */
export const bookStock = async (req: any, res: Response): Promise<void> => {
  try {
    const vendorId = req.user.id;
    const { id: productId } = req.params;
    const { mietfachId, amount } = req.body;

    if (!mietfachId || !amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Mietfach und Menge (> 0) sind erforderlich'
      });
      return;
    }

    // Verify product belongs to vendor
    const product = await Product.findOne({ _id: productId, vendorId });
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
      return;
    }

    if (!product.flourioSync?.articleId) {
      res.status(400).json({
        success: false,
        message: 'Produkt ist noch nicht zu Flourio synchronisiert'
      });
      return;
    }

    // Validate Mietfach access
    const activeMietfaecher = await getVendorActiveMietfaecher(vendorId);
    const hasAccess = activeMietfaecher.some(
      (mf: any) => String(mf._id) === String(mietfachId)
    );

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Keine aktive Buchung für dieses Mietfach vorhanden'
      });
      return;
    }

    // Get Mietfach warehouse ID
    const mietfach = await Mietfach.findById(mietfachId);
    if (!mietfach?.flourioWarehouseId) {
      res.status(400).json({
        success: false,
        message: 'Mietfach ist noch nicht zu Flourio synchronisiert'
      });
      return;
    }

    // Create StockItemEntry in Flourio
    const { StockItemEntryService } = await import('../../services/flourio/services/StockItemEntryService');
    const { FlourioClient } = await import('../../services/flourio/client/FlourioClient');
    const { flourioConfig } = await import('../../services/flourio/client/config');

    const client = new FlourioClient(flourioConfig);
    const stockService = new StockItemEntryService(client);

    const stockEntry = await stockService.create({
      item: product.flourioSync.articleId,
      stock: mietfach.flourioWarehouseId,
      amount,
      type: 'I'
    });

    logger.info('[VendorProduct] Stock booked', {
      productId,
      mietfachId,
      amount,
      flourioEntryId: stockEntry.id
    });

    res.status(201).json({
      success: true,
      data: stockEntry,
      message: `${amount} Stk. auf ${mietfach.bezeichnung} gebucht`
    });
  } catch (error: any) {
    logger.error('Error booking stock:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Buchen des Bestands',
      error: error.message
    });
  }
};
