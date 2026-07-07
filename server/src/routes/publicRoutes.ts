/**
 * @file Public Routes - Express router for public API endpoints accessible without authentication
 * @description Provides REST API routes for public access to vendor listings and statistics.
 * Includes optimized endpoints for vendor search, filtering, and detail retrieval with
 * caching middleware to improve performance. All routes serve public-safe data without
 * exposing sensitive vendor information.
 * @module PublicRoutes
 * @requires express
 * @requires ../services/vendorService
 * @requires express.Request
 * @requires express.Response
 * @requires ../middleware/cacheMiddleware
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import express from 'express';
import VendorService from '../services/vendorService';
import { Request, Response, NextFunction } from 'express';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { getStoreMapData } from '../services/storeMapService';
import { searchPublicProducts } from '../services/publicProductService';
import AppError from '../utils/AppError';

const router = express.Router();

// Öffentliche Produktsuche für Käufer (F1) — cached 5 min.
router.get('/products', cacheMiddleware(300), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = req.query.categories
      ? (req.query.categories as string).split(',').filter(Boolean)
      : undefined;
    const result = await searchPublicProducts({
      q: req.query.q as string,
      categories,
      availability: req.query.availability as string,
      location: req.query.location as string,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 50)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(new AppError('Serverfehler', 500, error));
  }
});

// Get public vendor listings with optimized performance (cached for 5 minutes)
router.get('/vendors', cacheMiddleware(300), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
    const search = req.query.search as string;
    const categories = req.query.categories ? 
      (req.query.categories as string).split(',').filter(Boolean) : 
      undefined;
    const location = req.query.location as string;
    
    const result = await VendorService.getPublicVendors({
      page,
      limit,
      search,
      categories,
      location
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Direktvermarkter', 500, error));
  }
});

// Get single vendor details (cached for 10 minutes)
router.get('/vendors/:id', cacheMiddleware(600), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const vendor = await VendorService.getVendorDetails(id);
    
    if (!vendor) {
      res.status(404).json({
        success: false,
        message: 'Direktvermarkter nicht gefunden'
      });
      return;
    }
    
    res.json({
      success: true,
      vendor
    });
  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Direktvermarkter-Details', 500, error));
  }
});

// Get store map data: positioned Mietfächer with public-safe occupancy (cached for 5 minutes)
router.get('/store-map', cacheMiddleware(300), async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mietfaecher = await getStoreMapData();
    res.json({
      success: true,
      mietfaecher
    });
  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Ladenkarte', 500, error));
  }
});

// Get vendor statistics (public summary) (cached for 5 minutes)
router.get('/stats', cacheMiddleware(300), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await VendorService.getVendorStatistics();
    
    // Only return public-safe statistics
    res.json({
      success: true,
      stats: {
        totalActiveVendors: stats.active,
        totalPublicVendors: stats.publiclyVisible,
        verifiedVendors: stats.verified
      }
    });
  } catch (error) {
    next(new AppError('Fehler beim Abrufen der Statistiken', 500, error));
  }
});

export default router;