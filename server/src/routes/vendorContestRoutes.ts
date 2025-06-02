// server/src/routes/vendorContestRoutes.ts
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