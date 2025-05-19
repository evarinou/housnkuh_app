// server/src/routes/index.ts - Erweitert für Vendor-Auth
import { Router } from 'express';
import userRoutes from './userRoutes';
import mietfachRoutes from './mietfachRoutes';
import vertragRoutes from './vertragRoutes';
import newsletterRoutes from './newsletterRoutes';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import vendorAuthRoutes from './vendorAuthRoutes'; // Neu

const router = Router();

router.use('/users', userRoutes);
router.use('/mietfaecher', mietfachRoutes);
router.use('/vertraege', vertragRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/vendor-auth', vendorAuthRoutes); // Neu

export default router;