/**
 * @file Admin management routes
 * @description Defines all administrative routes for the housnkuh marketplace platform.
 * Includes dashboard management, user administration, booking management, revenue tracking,
 * trial management, system monitoring, and Zusatzleistungen management.
 * 
 * @module routes/adminRoutes
 * @requires express.Router
 * @requires controllers/adminController
 * @requires controllers/vertragController
 * @requires middleware/auth
 * @requires services/scheduledJobs
 */

import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as vertragController from '../controllers/vertragController';
import { adminAuth } from '../middleware/auth';
// import { cacheMiddleware, cacheInvalidationMiddleware } from '../middleware/cacheMiddleware';
import ScheduledJobs from '../services/scheduledJobs';

/**
 * Admin routes router instance
 * @description Router for all administrative functionality including dashboard, user management,
 * booking management, revenue tracking, trial management, and system monitoring
 */
const router = Router();

// Temporary debug route (without auth) - should be removed in production
router.post('/debug/clear-cache', (req, res) => {
  const { cache } = require('../utils/cache');
  cache.clear();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

// Add no-cache headers middleware for debugging
const noCacheHeaders = (req: any, res: any, next: any) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

// Alle Routen mit adminAuth schützen
router.use(adminAuth);

// Dashboard-Übersicht (no cache for debugging)
router.get('/dashboard', noCacheHeaders, adminController.getDashboardOverview);

// Newsletter-Abonnenten (no cache for debugging)
router.get('/newsletter/subscribers', noCacheHeaders, adminController.getNewsletterSubscribers);
router.get('/newsletter/subscribers/:type', noCacheHeaders, adminController.getNewsletterSubscribersByType);
router.delete('/newsletter/subscribers/:id', 
  noCacheHeaders, 
  adminController.deleteNewsletterSubscriber
);

// Ausstehende Buchungen verwalten (no cache for debugging)
router.get('/pending-bookings', noCacheHeaders, adminController.getPendingBookings);
router.get('/available-mietfaecher', noCacheHeaders, adminController.getAvailableMietfaecher);
router.post('/pending-bookings/confirm/:userId', 
  noCacheHeaders, 
  adminController.confirmPendingBooking
);
router.post('/pending-bookings/reject/:userId', 
  noCacheHeaders, 
  adminController.rejectPendingBooking
);

// M005 Implementation: Mietfach Availability API
// router.get('/mietfaecher/availability', noCacheHeaders, adminController.getMietfachAvailability);
// router.post('/check-mietfach-availability', adminController.checkMietfachAvailability);

// M005 Implementation: Booking Schedule Management API
// router.put('/bookings/:bookingId/schedule', adminController.updateBookingSchedule);
router.post('/bookings/:bookingId/confirm-with-schedule', adminController.confirmPendingBookingWithSchedule);

// Benutzerverwaltung (no cache for debugging)
router.get('/users', noCacheHeaders, adminController.getAllUsers);
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

// Email Queue Monitoring (M005 Sprint 5)
router.get('/email-queue/stats', adminController.getEmailQueueStats);
router.post('/email-queue/retry-failed', adminController.retryFailedEmailJobs);

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
router.get('/monitoring/dashboard', adminController.getTrialMonitoringDashboard);

// Trial Monitoring Routes
router.get('/monitoring/trials', adminController.getTrialMonitoringDashboard);
router.get('/monitoring/trials/metrics', adminController.getTrialMetrics);
// router.get('/monitoring/trials/health', adminController.getTrialHealthMetrics);

// Trial Management Routes
router.post('/trials/extend/:userId', adminController.extendVendorTrial);
router.post('/trials/bulk-update', adminController.bulkUpdateTrials);
router.get('/trials/audit-log', adminController.getTrialAuditLog);
router.get('/trials/expiring', adminController.getExpiringTrials);
// router.get('/trials/search', adminController.searchTrialVendors);

// Feature Flag Management Routes
router.get('/feature-flags', adminController.getFeatureFlags);
router.put('/feature-flags', adminController.updateFeatureFlags);
router.post('/feature-flags/trial-automation/rollout', adminController.setTrialAutomationRollout);
router.get('/feature-flags/trial-automation/status', adminController.getTrialAutomationStatus);

// ===============================================
// REVENUE MANAGEMENT ROUTES (M006)
// ===============================================

// Revenue Overview and Statistics (temporarily no cache for debugging)
router.get('/revenue/overview', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, adminController.getRevenueOverview);
router.get('/revenue/by-unit', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, adminController.getRevenueByUnit);
router.get('/revenue/trends', noCacheHeaders, adminController.getRevenueTrends);
router.get('/revenue/mietfach-analysis', noCacheHeaders, adminController.getMietfachAnalysis);

// Detailed Monthly Revenue (temporarily no cache for debugging)
router.get('/revenue/details/:year/:month', noCacheHeaders, adminController.getMonthlyRevenueDetails);

// Revenue Export (no caching for downloads)
router.get('/revenue/export', noCacheHeaders, adminController.exportRevenueData);

// Revenue Data Maintenance (admin only, no cache)
router.post('/revenue/refresh', 
  noCacheHeaders, 
  adminController.refreshRevenueData
);

// Manual Revenue Calculation Trigger (admin only)
router.post('/revenue/calculate', noCacheHeaders, adminController.triggerRevenueCalculation);

// Future Revenue Projections (temporarily no cache for debugging)
router.get('/revenue/projections', noCacheHeaders, adminController.getFutureRevenueProjections);
router.get('/revenue/combined', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, adminController.getCombinedRevenueData);
router.get('/revenue/pipeline', noCacheHeaders, adminController.getContractPipeline);
router.get('/revenue/projected-occupancy', noCacheHeaders, adminController.getProjectedOccupancy);

// ===============================================
// ZUSATZLEISTUNGEN MANAGEMENT ROUTES (M013) - Updated Implementation
// ===============================================

// Package confirmation routes for zusatzleistungen
router.post('/contracts/:id/confirm-package-arrival', adminController.confirmPackageArrival);
router.post('/contracts/:id/confirm-package-stored', adminController.confirmPackageStored);

// Contract zusatzleistungen management
router.put('/contracts/:id/zusatzleistungen', adminController.adminUpdateZusatzleistungen);

// Overview of contracts with zusatzleistungen
router.get('/contracts/zusatzleistungen', adminController.getContractsWithZusatzleistungen);

export default router;