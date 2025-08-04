/**
 * @file Vendor Contest Routes - Express router for vendor contest management endpoints
 * @description Provides REST API routes for managing vendor contest submissions and
 * administrative operations. Includes public routes for contest submission and
 * protected admin routes for viewing, updating, and managing contest entries.
 * Supports contest statistics and comprehensive entry management.
 * @module VendorContestRoutes
 * @requires express.Router
 * @requires ../controllers/vendorContestController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import {
  submitVendorContest,
  getVendorContests,
  getVendorContest,
  updateVendorContest,
  deleteVendorContest,
  getVendorContestStats
} from '../controllers/vendorContestController';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Öffentliche Route für das Einreichen von Contest-Teilnahmen
router.post('/submit', submitVendorContest);

// Geschützte Admin-Routen
router.get('/', adminAuth, getVendorContests);
router.get('/stats', adminAuth, getVendorContestStats);
router.get('/:id', adminAuth, getVendorContest);
router.patch('/:id', adminAuth, updateVendorContest);
router.delete('/:id', adminAuth, deleteVendorContest);

export default router;