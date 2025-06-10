// server/src/routes/publicRoutes.ts
import express from 'express';
import VendorService from '../services/vendorService';
import { Request, Response } from 'express';
import { cacheMiddleware } from '../middleware/cacheMiddleware';

const router = express.Router();

// Get public vendor listings with optimized performance (cached for 5 minutes)
router.get('/vendors', cacheMiddleware(300), async (req: Request, res: Response): Promise<void> => {
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
    console.error('Error getting public vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Direktvermarkter'
    });
  }
});

// Get single vendor details (cached for 10 minutes)
router.get('/vendors/:id', cacheMiddleware(600), async (req: Request, res: Response): Promise<void> => {
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
    console.error('Error getting vendor details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Direktvermarkter-Details'
    });
  }
});

// Get vendor statistics (public summary) (cached for 5 minutes)
router.get('/stats', cacheMiddleware(300), async (req: Request, res: Response): Promise<void> => {
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
    console.error('Error getting public vendor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken'
    });
  }
});

export default router;