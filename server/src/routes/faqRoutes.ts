/**
 * @file FAQ Routes - Express router for frequently asked questions endpoints
 * @description Provides REST API routes for FAQ management including public access
 * to active FAQs and administrative routes for full CRUD operations. Public routes
 * serve published FAQs to website visitors, while admin routes allow creating,
 * updating, deleting, reordering, and toggling FAQ visibility.
 * @module FaqRoutes
 * @requires express
 * @requires ../controllers/faqController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import express from 'express';
import { faqController } from '../controllers/faqController';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/public', faqController.getAllPublic);

// Admin routes (require authentication)
router.get('/admin', adminAuth, faqController.getAllAdmin);
router.get('/:id', adminAuth, faqController.getById);
router.post('/', adminAuth, faqController.create);
router.put('/:id', adminAuth, faqController.update);
router.delete('/:id', adminAuth, faqController.delete);
router.patch('/:id/toggle', adminAuth, faqController.toggleActive);
router.post('/reorder', adminAuth, faqController.reorder);

export default router;