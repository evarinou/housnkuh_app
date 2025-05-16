import { Router } from 'express';
import * as userController from '../controllers/userController';
// import { auth } from '../middleware/auth'; // Wenn du Auth-Middleware verwendest

const router = Router();

// Öffentliche Routen
router.post('/', userController.createUser);

// Geschützte Routen (mit Auth-Middleware)
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;