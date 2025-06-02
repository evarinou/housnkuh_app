// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as vertragController from '../controllers/vertragController';
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

// Ausstehende Buchungen verwalten
router.get('/pending-bookings', adminController.getPendingBookings);
router.get('/available-mietfaecher', adminController.getAvailableMietfaecher);
router.post('/pending-bookings/confirm/:userId', adminController.confirmPendingBooking);
router.post('/pending-bookings/reject/:userId', adminController.rejectPendingBooking);

// Benutzerverwaltung
router.get('/users', adminController.getAllUsers);

// Vertragsverwaltung
router.get('/vertraege', vertragController.getAllVertraege);

// Store Opening Settings
router.get('/settings/store-opening', adminController.getStoreOpeningSettings);
router.put('/settings/store-opening', adminController.updateStoreOpeningSettings);

export default router;