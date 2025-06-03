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