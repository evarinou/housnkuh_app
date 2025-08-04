/**
 * @file Vendor Contract Routes - Express router for vendor contract management endpoints
 * @description Provides REST API routes for vendor contract operations including trial
 * management, booking operations, and additional service management (Zusatzleistungen).
 * All routes require vendor authentication and include rate limiting for sensitive
 * operations. Supports trial validation, contract creation, and price calculations.
 * @module VendorContractRoutes
 * @requires express.Router
 * @requires ../controllers/vendorContractController
 * @requires ../controllers/vertragController
 * @requires ../middleware/auth
 * @requires express-rate-limit
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import { vendorContractController } from '../controllers/vendorContractController';
import { calculatePriceWithZusatzleistungen, createVertragWithZusatzleistungen, updateZusatzleistungen } from '../controllers/vertragController';
import { vendorAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for trial operations (only for sensitive operations)
const trialRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Increased limit for trial operations
  message: {
    success: false,
    error: 'Zu viele Testanfragen. Bitte versuchen Sie es später erneut.'
  }
});

// All routes require vendor authentication
router.use(vendorAuth);

// Trial status and management
router.get('/trial-status', vendorContractController.getTrialStatus);
router.post('/validate-trial', trialRateLimit, vendorContractController.validateTrialBooking);
router.post('/trial-cancel/:vertragId', trialRateLimit, vendorContractController.cancelTrialBooking);

// Contract management
router.get('/my-bookings', vendorContractController.getMyBookings);
router.get('/zusatzleistungen', vendorContractController.getContractsWithZusatzleistungen);
router.get('/:contractId', vendorContractController.getContractDetails);

// Zusatzleistungen endpoints
router.post('/calculate-price', calculatePriceWithZusatzleistungen);
router.post('/create', createVertragWithZusatzleistungen);
router.put('/:id/zusatzleistungen', updateZusatzleistungen);

export default router;