
// server/src/routes/newsletterRoutes.ts - Mit Test-Route
import { Router } from 'express';
import * as newsletterController from '../controllers/newsletterController';
import { testEmailConnection } from '../utils/emailService';

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
      error: error.message
    });
  }
});

router.post('/subscribe', newsletterController.subscribeNewsletter);
router.get('/confirm/:token', newsletterController.confirmNewsletter);
router.post('/unsubscribe', newsletterController.unsubscribeNewsletter);

export default router;