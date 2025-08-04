/**
 * @file User Routes - Express router for user management endpoints
 * @description Provides REST API routes for user account management including user
 * registration (public) and administrative user operations (protected). Admin routes
 * allow full CRUD operations on user accounts while public routes enable user
 * registration. Both PUT and PATCH are supported for updates.
 * @module UserRoutes
 * @requires express.Router
 * @requires ../controllers/userController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import { Router } from 'express';
import * as userController from '../controllers/userController';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Öffentliche Routen
router.post('/', userController.createUser);

// Geschützte Routen (mit Auth-Middleware) - Admin only
router.get('/', adminAuth, userController.getAllUsers);
router.get('/:id', adminAuth, userController.getUserById);
router.put('/:id', adminAuth, userController.updateUser);
router.patch('/:id', adminAuth, userController.updateUser); // Support both PUT and PATCH
router.delete('/:id', adminAuth, userController.deleteUser);

export default router;