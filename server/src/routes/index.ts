// server/src/routes/index.ts - Erweitert für Kontaktformular
import { Router, Request, Response } from 'express';
import userRoutes from './userRoutes';
import mietfachRoutes from './mietfachRoutes';
import vertragRoutes from './vertragRoutes';
import newsletterRoutes from './newsletterRoutes';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import vendorAuthRoutes from './vendorAuthRoutes';
import contactRoutes from './contactRoutes'; // Neu
import vendorContestRoutes from './vendorContestRoutes'; // Neu für Vendor Contest
import publicRoutes from './publicRoutes'; // Performance-optimized public endpoints
import tagRoutes from './tagRoutes'; // Tag management
import faqRoutes from './faqRoutes'; // FAQ management
import Settings from '../models/Settings';
import HealthCheckService from '../services/healthCheckService';

const router = Router();

router.use('/users', userRoutes);
router.use('/mietfaecher', mietfachRoutes);
router.use('/vertraege', vertragRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/vendor-auth', vendorAuthRoutes);
router.use('/contact', contactRoutes); // Neu
router.use('/vendor-contest', vendorContestRoutes); // Neu für Vendor Contest
router.use('/public', publicRoutes); // Performance-optimized public endpoints
router.use('/tags', tagRoutes); // Tag management
router.use('/faqs', faqRoutes); // FAQ management

// Public health check endpoint (no authentication required)
router.get('/health', async (req: Request, res: Response) => {
  try {
    const simpleStatus = await HealthCheckService.getSimpleStatus();
    res.json(simpleStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      message: 'Health check failed'
    });
  }
});

// Detailed health check for monitoring services
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const healthStatus = await HealthCheckService.performHealthCheck();
    res.json({
      success: true,
      ...healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      overall: 'unhealthy',
      components: [],
      timestamp: new Date(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Public endpoint for store opening date
router.get('/public/store-opening', async (req: Request, res: Response) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      storeOpening: {
        enabled: settings.storeOpening.enabled,
        openingDate: settings.storeOpening.openingDate,
        isStoreOpen: settings.isStoreOpen()
      }
    });
  } catch (err) {
    console.error('Error fetching public store opening:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching store opening information' 
    });
  }
});

export default router;