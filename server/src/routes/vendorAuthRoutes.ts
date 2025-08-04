/**
 * @file Vendor Authentication Routes - Express router for vendor authentication and account management
 * @description Provides REST API routes for vendor registration, authentication, profile management,
 * and booking operations. Includes both public routes for registration/login and protected routes
 * for authenticated vendor operations. Supports trial management, subscription handling, and
 * comprehensive vendor dashboard functionality with rate limiting and validation.
 * @module VendorAuthRoutes
 * @requires express.Router
 * @requires ../controllers/vendorAuthController
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../middleware/rateLimiting
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as vendorAuthController from '../controllers/vendorAuthController';
import { vendorAuth } from '../middleware/auth';
import { validateVendorRegistration, validateEmailConfirmationParam } from '../middleware/validation';
import { 
  vendorRegistrationRateLimit, 
  emailConfirmationRateLimit, 
  authRateLimit 
} from '../middleware/rateLimiting';

const router = Router();

// Öffentliche Routen
router.post('/preregister', vendorRegistrationRateLimit, validateVendorRegistration, vendorAuthController.preRegisterVendor); // Neue Pre-Registration Route
router.post('/register', vendorRegistrationRateLimit, validateVendorRegistration, vendorAuthController.registerVendorWithBooking);
router.post('/login', authRateLimit, vendorAuthController.loginVendor);
router.get('/confirm/:token', emailConfirmationRateLimit, validateEmailConfirmationParam, vendorAuthController.confirmVendorEmail);
router.get('/public/profiles', vendorAuthController.getAllVendorProfiles);
router.get('/public/profile/:vendorId', vendorAuthController.getPublicVendorProfile);

// Geschützte Routen (mit Vendor-Auth-Middleware)
router.post('/complete-booking/:userId', vendorAuth, vendorAuthController.completeBooking);

// Vendor Profile Management
router.get('/profile/:userId', vendorAuth, vendorAuthController.getVendorProfile);
router.put('/profile/:userId', vendorAuth, vendorAuthController.updateVendorProfile);
router.post('/upload-image', vendorAuth, vendorAuthController.uploadVendorImage);

// Tag Management for Vendors
router.post('/create-tag', vendorAuth, vendorAuthController.createVendorTag);

// Auth-Check Route (optional)
router.get('/check', vendorAuth, (_req, res) => {
  res.json({ success: true, message: 'Vendor-Authentifizierung erfolgreich' });
});

// Vendor Verträge
router.get('/contracts/:userId', vendorAuth, vendorAuthController.getVendorContracts);

// Vendor Subscription Management
router.post('/cancel/:userId', vendorAuth, vendorAuthController.cancelVendorSubscription);

// Additional Booking for authenticated vendors
router.post('/additional-booking', vendorAuth, vendorAuthController.additionalBooking);

// Vendor Booking Status API - M005 Implementation
router.get('/bookings/:userId', vendorAuth, vendorAuthController.getVendorBookings);
router.get('/bookings/:userId/:bookingId', vendorAuth, vendorAuthController.getVendorBookingById);

// Vendor Dashboard Messages API - M005 Implementation
router.get('/dashboard/messages/:userId', vendorAuth, vendorAuthController.getDashboardMessages);
router.delete('/dashboard/messages/:messageId', vendorAuth, vendorAuthController.dismissDashboardMessage);

// Trial Management API - M006 S004 Implementation
router.get('/trial-status', vendorAuth, vendorAuthController.getTrialStatus);
router.post('/cancel-trial-booking/:bookingId', vendorAuth, vendorAuthController.cancelTrialBooking);
router.post('/bookings/confirm', vendorAuth, vendorAuthController.confirmTrialBooking);

export default router;