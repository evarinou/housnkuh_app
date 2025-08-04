/**
 * @file Vertrag Routes - Express router for contract management endpoints
 * @description Provides REST API routes for managing contracts (Verträge) in the marketplace.
 * Includes authenticated routes for CRUD operations on contracts, user-specific contract
 * retrieval, and service management within contracts. All routes require authentication
 * and support the complete contract lifecycle management.
 * @module VertragRoutes
 * @requires express.Router
 * @requires ../controllers/vertragController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as vertragController from '../controllers/vertragController';
import { auth } from '../middleware/auth';

const router = Router();

// Alle Verträge abrufen (nur für Admins)
router.get('/', auth, vertragController.getAllVertraege);

// Verträge nach Benutzer abrufen
router.get('/user/:userId', auth, vertragController.getVertraegeByUser);

// Einzelnen Vertrag abrufen
router.get('/:id', auth, vertragController.getVertragById);

// Neuen Vertrag erstellen
router.post('/', auth, vertragController.createVertrag);

// Vertrag aktualisieren
router.put('/:id', auth, vertragController.updateVertrag);

// Service zu Vertrag hinzufügen
router.post('/:id/services', auth, vertragController.addServiceToVertrag);

// Vertrag löschen
router.delete('/:id', auth, vertragController.deleteVertrag);

export default router;