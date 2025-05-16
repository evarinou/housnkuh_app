import { Router } from 'express';
import * as mietfachController from '../controllers/mietfachController';
// import { auth } from '../middleware/auth'; // Wenn du Auth-Middleware verwendest

const router = Router();

// Öffentliche Routen können hier definiert werden
// router.get('/public', mietfachController.getPublicMietfaecher);

// API-Routen (ggf. mit Auth-Middleware schützen)
router.get('/', mietfachController.getAllMietfaecher);
router.get('/typ', mietfachController.getMietfaecherByTyp); // Filter nach Typ
router.get('/:id', mietfachController.getMietfachById);
router.post('/', mietfachController.createMietfach);
router.put('/:id', mietfachController.updateMietfach);
router.delete('/:id', mietfachController.deleteMietfach);

export default router;