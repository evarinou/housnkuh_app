// server/src/routes/authRoutes.ts
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { adminAuth } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/setup', authController.setupAdmin);

// Beispiel für eine geschützte Admin-Route
router.get('/check', adminAuth, (req, res) => {
  res.json({ success: true, message: 'Admin-Authentifizierung erfolgreich' });
});

export default router;