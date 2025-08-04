/**
 * @file Email Template Routes - Express router for email template management endpoints
 * @description Provides REST API routes for administrators to manage email templates
 * including listing all templates, retrieving individual templates, updating content,
 * previewing rendered templates, sending test emails, and retrieving available variables
 * for template types. All routes require admin authentication.
 * @module EmailTemplateRoutes
 * @requires express.Router
 * @requires ../controllers/emailTemplateController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import {
  getAllEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
  getTemplateVariables
} from '../controllers/emailTemplateController';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Alle Routen benötigen Admin-Berechtigung
router.use(adminAuth);

// GET /api/admin/email-templates - Alle Templates auflisten
router.get('/', getAllEmailTemplates);

// GET /api/admin/email-templates/variables/:type - Verfügbare Variablen für Template-Typ
router.get('/variables/:type', getTemplateVariables);

// GET /api/admin/email-templates/:id - Einzelnes Template laden
router.get('/:id', getEmailTemplate);

// PUT /api/admin/email-templates/:id - Template bearbeiten
router.put('/:id', updateEmailTemplate);

// POST /api/admin/email-templates/preview - Template-Vorschau generieren
router.post('/preview', previewEmailTemplate);

// POST /api/admin/email-templates/send-test - Test-Email versenden
router.post('/send-test', sendTestEmail);

export default router;