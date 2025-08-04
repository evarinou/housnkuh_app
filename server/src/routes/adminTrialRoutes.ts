/**
 * @file Admin Trial Routes - Express router for trial management administrative endpoints
 * @description Provides REST API routes for administrators to manage vendor trials including
 * viewing, filtering, updating, bulk operations, statistics, data export, and manual trial
 * lifecycle operations (conversion, extension, cancellation). All routes require admin authentication.
 * @module AdminTrialRoutes
 * @requires express.Router
 * @requires ../controllers/adminTrialController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as adminTrialController from '../controllers/adminTrialController';
import { adminAuth } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(adminAuth);

// Get all trials with filtering - GET /api/admin/trials
router.get('/', adminTrialController.getAllTrials);

// Get trial by ID - GET /api/admin/trials/:id
router.get('/:id', adminTrialController.getTrialById);

// Update trial - PATCH /api/admin/trials/:id
router.patch('/:id', adminTrialController.updateTrial);

// Bulk operations - POST /api/admin/trials/bulk
router.post('/bulk', adminTrialController.bulkOperations);

// Trial statistics - GET /api/admin/trials/stats
router.get('/stats', adminTrialController.getTrialStatistics);

// Export trial data - GET /api/admin/trials/export
router.get('/export', adminTrialController.exportTrialData);

// Manual trial conversion - POST /api/admin/trials/:id/convert
router.post('/:id/convert', adminTrialController.manualTrialConversion);

// Manual trial extension - POST /api/admin/trials/:id/extend
router.post('/:id/extend', adminTrialController.manualTrialExtension);

// Manual trial cancellation - POST /api/admin/trials/:id/cancel
router.post('/:id/cancel', adminTrialController.manualTrialCancellation);

export default router;