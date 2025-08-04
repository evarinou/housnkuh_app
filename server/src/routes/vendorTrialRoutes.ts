/**
 * @file Vendor Trial Routes - Express router for vendor trial management endpoints
 * @description Provides REST API routes for vendor trial operations including trial
 * status checking, conversion to regular subscription, trial extension, cancellation,
 * and history retrieval. All routes require vendor authentication and support the
 * complete trial lifecycle management for vendors.
 * @module VendorTrialRoutes
 * @requires express.Router
 * @requires ../controllers/vendorTrialController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as vendorTrialController from '../controllers/vendorTrialController';
import { vendorAuth } from '../middleware/auth';

const router = Router();

// All routes require vendor authentication
router.use(vendorAuth);

// Trial status endpoint - GET /api/vendor/trial/status
router.get('/status', vendorTrialController.getTrialStatus);

// Trial conversion endpoint - POST /api/vendor/trial/convert
router.post('/convert', vendorTrialController.convertTrialToRegular);

// Trial extension endpoint - POST /api/vendor/trial/extend
router.post('/extend', vendorTrialController.extendTrial);

// Trial cancellation endpoint - POST /api/vendor/trial/cancel
router.post('/cancel', vendorTrialController.cancelTrial);

// Get trial history - GET /api/vendor/trial/history
router.get('/history', vendorTrialController.getTrialHistory);

export default router;