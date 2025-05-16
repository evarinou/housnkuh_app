// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Alle Routen mit adminAuth schützen
router.use(adminAuth);

// Dashboard-Übersicht
router.get('/dashboard', adminController.getDashboardOverview);

// Newsletter-Abonnenten
router.get('/newsletter/subscribers', adminController.getNewsletterSubscribers);
router.get('/newsletter/subscribers/:type', adminController.getNewsletterSubscribersByType);
router.delete('/newsletter/subscribers/:id', adminController.deleteNewsletterSubscriber);

export default router;