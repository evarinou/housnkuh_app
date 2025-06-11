// server/src/routes/faqRoutes.ts
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