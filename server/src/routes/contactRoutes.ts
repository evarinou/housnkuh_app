/**
 * @file Contact Routes - Express router for contact form and vendor contest endpoints
 * @description Provides REST API routes for contact form submissions and administrative
 * management of contact entries. Includes public routes for form submissions and
 * vendor contest entries, plus protected admin routes for CRUD operations on contacts.
 * All public routes include rate limiting and validation middleware.
 * @module ContactRoutes
 * @requires express.Router
 * @requires ../controllers/contactController
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../middleware/rateLimiting
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import { 
  submitContactForm, 
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  submitVendorContest 
} from '../controllers/contactController';
import { adminAuth } from '../middleware/auth';
import { validateContactForm } from '../middleware/validation';
import { contactFormRateLimit } from '../middleware/rateLimiting';

const router = Router();

/**
 * @route   GET /api/contact/test
 * @desc    Test-Route um zu prüfen, ob die Kontakt-Routen funktionieren
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Kontakt-Route funktioniert!' });
});

/**
 * Öffentliche Routen
 */

/**
 * @route   POST /api/contact
 * @desc    Kontaktformular absenden
 * @access  Public
 */
router.post('/', contactFormRateLimit, validateContactForm, submitContactForm);

/**
 * @route   POST /api/contact/vendor-contest
 * @desc    Direktvermarkter-Wettbewerb-Formular absenden
 * @access  Public
 */
router.post('/vendor-contest', contactFormRateLimit, validateContactForm, submitVendorContest);

/**
 * Admin-Routen (geschützt)
 */

/**
 * @route   GET /api/contact/admin
 * @desc    Alle Kontaktanfragen abrufen
 * @access  Private/Admin
 */
router.get('/admin', adminAuth, getContacts);

/**
 * @route   GET /api/contact/admin/:id
 * @desc    Einzelne Kontaktanfrage abrufen
 * @access  Private/Admin
 */
router.get('/admin/:id', adminAuth, getContact);

/**
 * @route   PUT /api/contact/admin/:id
 * @desc    Kontaktanfrage aktualisieren
 * @access  Private/Admin
 */
router.put('/admin/:id', adminAuth, updateContact);

/**
 * @route   DELETE /api/contact/admin/:id
 * @desc    Kontaktanfrage löschen
 * @access  Private/Admin
 */
router.delete('/admin/:id', adminAuth, deleteContact);

export default router;