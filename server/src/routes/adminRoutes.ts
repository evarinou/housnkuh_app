// server/src/routes/adminRoutes.ts
import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as vertragController from '../controllers/vertragController';
import { adminAuth } from '../middleware/auth';
import { cacheMiddleware, cacheInvalidationMiddleware } from '../middleware/cacheMiddleware';
import ScheduledJobs from '../services/scheduledJobs';

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

// Manual monitoring triggers
router.post('/monitoring/health-check', async (_req, res) => {
  try {
    const result = await ScheduledJobs.triggerHealthCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/monitoring/performance-check', async (_req, res) => {
  try {
    const result = await ScheduledJobs.triggerPerformanceCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/monitoring/statistics', (_req, res) => {
  try {
    const stats = ScheduledJobs.getMonitoringStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Launch Day Monitoring
router.get('/launch-day/metrics', adminController.getLaunchDayMetrics);

// Health Check Routes
router.get('/health', adminController.getSystemHealth);
router.get('/health/simple', adminController.getSimpleHealthCheck);
router.get('/health/component/:component', adminController.getComponentHealth);

// Performance Monitoring Routes
router.get('/performance/metrics', adminController.getPerformanceMetrics);
router.get('/performance/detailed', adminController.getDetailedMetrics);
router.get('/performance/endpoint/:path', adminController.getEndpointMetrics);

// Alerting System Routes
router.get('/alerts/active', adminController.getActiveAlerts);
router.get('/alerts/history', adminController.getAlertHistory);
router.post('/alerts/:alertId/resolve', adminController.resolveAlert);
router.post('/alerts/test', adminController.sendTestAlert);

// Monitoring Configuration Routes
router.get('/monitoring/settings', adminController.getMonitoringSettings);
router.put('/monitoring/settings', adminController.updateMonitoringSettings);

// Real-time Monitoring Dashboard
router.get('/monitoring/dashboard', adminController.getMonitoringDashboard);

export default router;