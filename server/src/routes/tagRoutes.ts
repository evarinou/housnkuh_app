import express from 'express';
import {
  getAllTags,
  getTagsByCategory,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  searchTags,
  bulkCreateTags
} from '../controllers/tagController';
import { adminAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllTags);
router.get('/categories', getTagsByCategory);
router.get('/search', searchTags);
router.get('/:identifier', getTag);

// Admin-only routes
router.post('/', adminAuth, createTag);
router.post('/bulk', adminAuth, bulkCreateTags);
router.put('/:id', adminAuth, updateTag);
router.delete('/:id', adminAuth, deleteTag);

export default router;