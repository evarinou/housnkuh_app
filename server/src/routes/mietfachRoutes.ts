/**
 * @file Mietfach rental unit routes
 * @description Defines routes for managing Mietfach rental units in the housnkuh marketplace.
 * Provides CRUD operations for rental units including creation, retrieval, updates, and deletion.
 * Supports filtering by type and contract information retrieval.
 * 
 * @module routes/mietfachRoutes
 * @requires express.Router
 * @requires controllers/mietfachController
 */

import { Router } from 'express';
import * as mietfachController from '../controllers/mietfachController';
// import { auth } from '../middleware/auth'; // Wenn du Auth-Middleware verwendest

/**
 * Mietfach routes router instance
 * @description Router for all Mietfach rental unit operations including CRUD operations,
 * filtering by type, and contract information retrieval
 */
const router = Router();

// Öffentliche Routen können hier definiert werden
// router.get('/public', mietfachController.getPublicMietfaecher);

// API-Routen (ggf. mit Auth-Middleware schützen)
router.get('/', mietfachController.getAllMietfaecher);
router.get('/with-contracts', mietfachController.getAllMietfaecherWithContracts); // Mit Vertragsinformationen
router.get('/typ', mietfachController.getMietfaecherByTyp); // Filter nach Typ
router.get('/:id', mietfachController.getMietfachById);
router.post('/', mietfachController.createMietfach);
router.put('/:id', mietfachController.updateMietfach);
router.delete('/:id', mietfachController.deleteMietfach);

export default router;