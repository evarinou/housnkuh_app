// server/src/routes/contactRoutes.ts
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
router.post('/', submitContactForm);

/**
 * @route   POST /api/contact/vendor-contest
 * @desc    Direktvermarkter-Wettbewerb-Formular absenden
 * @access  Public
 */
router.post('/vendor-contest', submitVendorContest);

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