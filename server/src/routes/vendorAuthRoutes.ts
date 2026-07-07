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
import * as vendorProfileController from '../controllers/vendor/vendorProfileController';
import * as vendorBookingController from '../controllers/vendor/vendorBookingController';
import { vendorAuth } from '../middleware/auth';
import { validateVendorRegistration, validateEmailConfirmationParam } from '../middleware/validation';
import {
  vendorRegistrationRateLimit,
  emailConfirmationRateLimit,
  authRateLimit,
  passwordResetRateLimit
} from '../middleware/rateLimiting';
import { validatePasswordReset, validatePasswordResetToken } from '../middleware/validation';

const router = Router();

// Öffentliche Routen
router.post('/preregister', vendorRegistrationRateLimit, validateVendorRegistration, vendorAuthController.preRegisterVendor); // Neue Pre-Registration Route
router.post('/register', vendorRegistrationRateLimit, validateVendorRegistration, vendorAuthController.registerVendorWithBooking);
router.post('/login', authRateLimit, vendorAuthController.loginVendor);
router.get('/confirm/:token', emailConfirmationRateLimit, validateEmailConfirmationParam, vendorAuthController.confirmVendorEmail);
router.get('/public/profiles', vendorProfileController.getAllVendorProfiles);
router.get('/public/profile/:vendorId', vendorProfileController.getPublicVendorProfile);

// Password Reset & Email Confirmation (öffentlich)
router.post('/request-password-reset', passwordResetRateLimit, validatePasswordReset, vendorAuthController.requestPasswordReset);
router.post('/reset-password', validatePasswordResetToken, vendorAuthController.resetPassword);
router.post('/resend-confirmation', emailConfirmationRateLimit, vendorAuthController.resendConfirmationEmail);

// Geschützte Routen (mit Vendor-Auth-Middleware)
router.post('/complete-booking/:userId', vendorAuth, vendorBookingController.completeBooking);

// Vendor Profile Management
router.get('/profile/:userId', vendorAuth, vendorProfileController.getVendorProfile);
router.put('/profile/:userId', vendorAuth, vendorProfileController.updateVendorProfile);
router.post('/upload-image', vendorAuth, vendorProfileController.uploadVendorImage);

// Tag Management for Vendors
router.post('/create-tag', vendorAuth, vendorProfileController.createVendorTag);

// Password Change (authenticated)
router.put('/change-password', vendorAuth, vendorAuthController.changeVendorPassword);

// Auth-Check Route (optional)
router.get('/check', vendorAuth, (_req, res) => {
  res.json({ success: true, message: 'Vendor-Authentifizierung erfolgreich' });
});

// Vendor Verträge
router.get('/contracts/:userId', vendorAuth, vendorBookingController.getVendorContracts);

// Vendor Subscription Management
router.post('/cancel/:userId', vendorAuth, vendorProfileController.cancelVendorSubscription);

// Additional Booking for authenticated vendors
router.post('/additional-booking', vendorAuth, vendorBookingController.additionalBooking);

// Vendor Booking Status API - M005 Implementation
router.get('/bookings/:userId', vendorAuth, vendorBookingController.getVendorBookings);
router.get('/bookings/:userId/:bookingId', vendorAuth, vendorBookingController.getVendorBookingById);

// Vendor Dashboard Messages API - M005 Implementation
router.get('/dashboard/messages/:userId', vendorAuth, vendorBookingController.getDashboardMessages);
router.delete('/dashboard/messages/:messageId', vendorAuth, vendorBookingController.dismissDashboardMessage);

// Trial Management API - M006 S004 Implementation
router.get('/trial-status', vendorAuth, vendorBookingController.getTrialStatus);
router.post('/cancel-trial-booking/:bookingId', vendorAuth, vendorBookingController.cancelTrialBooking);
router.post('/bookings/confirm', vendorAuth, vendorBookingController.confirmTrialBooking);

// Vendor Invoice Management API - TASK-014 Implementation
router.get('/invoices', vendorAuth, vendorBookingController.getVendorInvoices);
router.get('/invoices/summary', vendorAuth, vendorBookingController.getVendorInvoiceSummary);
router.get('/invoices/:id', vendorAuth, vendorBookingController.getVendorInvoiceById);
router.get('/invoices/:id/download', vendorAuth, vendorBookingController.downloadVendorInvoicePdf);

// Vendor Sales Invoices (F2a, Gutschrift) + Sales Reporting (F3)
import * as vendorSalesInvoiceController from '../controllers/vendor/vendorSalesInvoiceController';
router.get('/sales-report', vendorAuth, vendorSalesInvoiceController.getVendorSalesReport);
router.get('/sales-invoices', vendorAuth, vendorSalesInvoiceController.getVendorSalesInvoices);
router.get('/sales-invoices/:id', vendorAuth, vendorSalesInvoiceController.getVendorSalesInvoiceById);
router.get('/sales-invoices/:id/download', vendorAuth, vendorSalesInvoiceController.downloadVendorSalesInvoicePdf);

// Flourio Documents & Products for Vendors (vendor-auth path avoids global adminAuth)
import { getDocuments, getProducts, syncProduct, syncBulkProducts } from '../controllers/flourioController';
router.get('/flourio/documents', vendorAuth, getDocuments);
router.get('/flourio/products', vendorAuth, getProducts);
router.post('/flourio/products/:id/sync', vendorAuth, syncProduct);
router.post('/flourio/products/sync-bulk', vendorAuth, syncBulkProducts);

// Vendor Product Management & Stock Booking
import * as vendorProductController from '../controllers/vendor/vendorProductController';
import { validateProductCreate, validateProductUpdate } from '../middleware/validation';
import { uploadProductImage } from '../controllers/productImageController';
router.get('/mietfaecher', vendorAuth, vendorProductController.getVendorMietfaecher);
router.post('/products/upload-image', vendorAuth, uploadProductImage);
router.post('/products', vendorAuth, validateProductCreate, vendorProductController.createProduct);
router.put('/products/:id', vendorAuth, validateProductUpdate, vendorProductController.updateProduct);
router.post('/products/:id/stock', vendorAuth, vendorProductController.bookStock);

export default router;