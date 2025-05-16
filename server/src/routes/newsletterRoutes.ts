// server/src/routes/newsletterRoutes.ts
import { Router } from 'express';
import * as newsletterController from '../controllers/newsletterController';

const router = Router();

router.post('/subscribe', newsletterController.subscribeNewsletter);
router.get('/confirm/:token', newsletterController.confirmNewsletter);
router.post('/unsubscribe', newsletterController.unsubscribeNewsletter);

export default router;