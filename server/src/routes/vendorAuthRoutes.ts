// server/src/routes/vendorAuthRoutes.ts
import { Router } from 'express';
import * as vendorAuthController from '../controllers/vendorAuthController';
import { vendorAuth } from '../middleware/auth';

const router = Router();

// Öffentliche Routen
router.post('/register', vendorAuthController.registerVendorWithBooking);
router.post('/login', vendorAuthController.loginVendor);
router.get('/confirm/:token', vendorAuthController.confirmVendorEmail);

// Geschützte Routen (mit Vendor-Auth-Middleware)
router.post('/complete-booking/:userId', vendorAuth, vendorAuthController.completeBooking);

// Auth-Check Route (optional)
router.get('/check', vendorAuth, (req, res) => {
  res.json({ success: true, message: 'Vendor-Authentifizierung erfolgreich' });
});

export default router;