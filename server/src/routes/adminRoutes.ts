// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as vertragController from '../controllers/vertragController';
import { adminAuth } from '../middleware/auth';
import { cacheMiddleware, cacheInvalidationMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

// Alle Routen mit adminAuth schützen
router.use(adminAuth);

// Dashboard-Übersicht (cached for 1 minute)
router.get('/dashboard', cacheMiddleware(60), adminController.getDashboardOverview);

// Newsletter-Abonnenten (cached for 2 minutes)
router.get('/newsletter/subscribers', cacheMiddleware(120), adminController.getNewsletterSubscribers);
router.get('/newsletter/subscribers/:type', cacheMiddleware(120), adminController.getNewsletterSubscribersByType);
router.delete('/newsletter/subscribers/:id', 
  cacheInvalidationMiddleware(['admin_stats', 'newsletter']), 
  adminController.deleteNewsletterSubscriber
);

// Ausstehende Buchungen verwalten (cached for 30 seconds)
router.get('/pending-bookings', cacheMiddleware(30), adminController.getPendingBookings);
router.get('/available-mietfaecher', cacheMiddleware(300), adminController.getAvailableMietfaecher);
router.post('/pending-bookings/confirm/:userId', 
  cacheInvalidationMiddleware(['admin_stats', 'pending_bookings', 'available_mietfaecher']), 
  adminController.confirmPendingBooking
);
router.post('/pending-bookings/reject/:userId', 
  cacheInvalidationMiddleware(['admin_stats', 'pending_bookings']), 
  adminController.rejectPendingBooking
);

// Benutzerverwaltung (cached for 1 minute)
router.get('/users', cacheMiddleware(60), adminController.getAllUsers);
router.get('/users/:id', require('../controllers/userController').getUserById);
router.patch('/users/:id', require('../controllers/userController').updateUser);
router.delete('/users/:id', require('../controllers/userController').deleteUser);

// Vendor Visibility Management (R004)
router.patch('/vendors/:vendorId/visibility', adminController.toggleVendorVisibility);
router.patch('/vendors/bulk-visibility', adminController.bulkToggleVendorVisibility);

// Vendor Verification Management (R007)
router.patch('/vendors/:vendorId/verification', adminController.updateVendorVerification);

// Vertragsverwaltung
router.get('/vertraege', vertragController.getAllVertraege);

// Store Opening Settings
router.get('/settings/store-opening', adminController.getStoreOpeningSettings);
router.put('/settings/store-opening', adminController.updateStoreOpeningSettings);

// Trial Management (R003, R008)
router.get('/trials/statistics', adminController.getTrialStatistics);
router.post('/trials/activate', adminController.triggerTrialActivation);
router.post('/trials/update-status', adminController.triggerTrialStatusUpdate);
router.post('/trials/activate/:vendorId', adminController.activateVendorTrial);
router.get('/jobs/status', adminController.getScheduledJobsStatus);

// Launch Day Monitoring
router.get('/launch-day/metrics', adminController.getLaunchDayMetrics);

// Performance Monitoring
router.get('/performance/metrics', (_req, res) => {
  const { performanceMonitor } = require('../utils/performanceMonitor');
  const metrics = performanceMonitor.getPerformanceSummary();
  res.json({
    success: true,
    metrics,
    timestamp: new Date()
  });
});

export default router;