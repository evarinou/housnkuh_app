// server/src/routes/vendorAuthRoutes.ts
import { Router } from 'express';
import * as vendorAuthController from '../controllers/vendorAuthController';
import { vendorAuth } from '../middleware/auth';

const router = Router();

// Öffentliche Routen
router.post('/preregister', vendorAuthController.preRegisterVendor); // Neue Pre-Registration Route
router.post('/register', vendorAuthController.registerVendorWithBooking);
router.post('/login', vendorAuthController.loginVendor);
router.get('/confirm/:token', vendorAuthController.confirmVendorEmail);
router.get('/public/profiles', vendorAuthController.getAllVendorProfiles);
router.get('/public/profile/:vendorId', vendorAuthController.getPublicVendorProfile);

// Geschützte Routen (mit Vendor-Auth-Middleware)
router.post('/complete-booking/:userId', vendorAuth, vendorAuthController.completeBooking);

// Vendor Profile Management
router.get('/profile/:userId', vendorAuth, vendorAuthController.getVendorProfile);
router.put('/profile/:userId', vendorAuth, vendorAuthController.updateVendorProfile);
router.post('/upload-image', vendorAuth, vendorAuthController.uploadVendorImage);

// Auth-Check Route (optional)
router.get('/check', vendorAuth, (_req, res) => {
  res.json({ success: true, message: 'Vendor-Authentifizierung erfolgreich' });
});

// Vendor Verträge
router.get('/contracts/:userId', vendorAuth, vendorAuthController.getVendorContracts);

// Vendor Subscription Management
router.post('/cancel/:userId', vendorAuth, vendorAuthController.cancelVendorSubscription);

export default router;