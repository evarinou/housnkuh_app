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
import Settings from '../models/Settings';

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