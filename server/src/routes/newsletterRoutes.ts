
/**
 * @file Newsletter Routes - Express router for newsletter subscription management endpoints
 * @description Provides REST API routes for newsletter subscription functionality including
 * subscription, confirmation, and unsubscription processes. Includes email connection testing
 * and rate limiting for all public endpoints. All routes handle double opt-in confirmation
 * and GDPR-compliant unsubscription processes.
 * @module NewsletterRoutes
 * @requires express.Router
 * @requires ../controllers/newsletterController
 * @requires ../utils/emailService
 * @requires ../middleware/validation
 * @requires ../middleware/rateLimiting
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as newsletterController from '../controllers/newsletterController';
import { testEmailConnection } from '../utils/emailService';
import { validateNewsletterSubscription } from '../middleware/validation';
import { newsletterRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Test-Route für E-Mail-Verbindung
router.get('/test-email', async (req, res) => {
  try {
    const isConnected = await testEmailConnection();
    res.json({
      success: isConnected,
      message: isConnected ? 'E-Mail-Verbindung erfolgreich' : 'E-Mail-Verbindung fehlgeschlagen'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der E-Mail-Verbindung',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/subscribe', newsletterRateLimit, validateNewsletterSubscription, newsletterController.subscribeNewsletter);
router.get('/confirm/:token', newsletterRateLimit, newsletterController.confirmNewsletter);
router.post('/unsubscribe', newsletterRateLimit, validateNewsletterSubscription, newsletterController.unsubscribeNewsletter);

export default router;