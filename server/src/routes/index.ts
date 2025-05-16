import { Router } from 'express';
import userRoutes from './userRoutes';
import mietfachRoutes from './mietfachRoutes';
import vertragRoutes from './vertragRoutes';
import newsletterRoutes from './newsletterRoutes'; 

const router = Router();

router.use('/users', userRoutes);
router.use('/mietfaecher', mietfachRoutes);
router.use('/vertraege', vertragRoutes);
router.use('/newsletter', newsletterRoutes); 

export default router;