/**
 * @file Authentication Routes - Express router for admin authentication endpoints
 * @description Provides REST API routes for administrator authentication including login,
 * initial admin setup, and authentication verification. Includes rate limiting and
 * validation middleware for security. The setup route allows initial admin user creation,
 * while login handles standard admin authentication.
 * @module AuthRoutes
 * @requires express.Router
 * @requires ../controllers/authController
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../middleware/rateLimiting
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { adminAuth } from '../middleware/auth';
import { validateAdminLogin } from '../middleware/validation';
import { authRateLimit, adminSetupRateLimit } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router = Router();

// Test endpoint to see if we get any requests
router.all('/test-setup', (req: any, res: any) => {
  logger.debug('TEST SETUP ENDPOINT HIT', { method: req.method, body: req.body });
  res.json({ message: 'Test endpoint hit', body: req.body });
});

router.post('/login', authRateLimit, validateAdminLogin, authController.login);
router.post('/setup', adminSetupRateLimit, (req: any, res: any, next: any) => {
  logger.debug('Setup route hit', { body: req.body, headers: req.headers });
  next();
}, authController.setupAdmin); // Temporarily removed validateAdminSetup

// Beispiel für eine geschützte Admin-Route
router.get('/check', adminAuth, (req, res) => {
  res.json({ success: true, message: 'Admin-Authentifizierung erfolgreich' });
});

export default router;