/**
 * @file Tag Routes - Express router for tag management endpoints
 * @description Provides REST API routes for managing tags used in the marketplace.
 * Includes public routes for retrieving and searching tags, and protected admin routes
 * for CRUD operations. Tags are used to categorize vendors and their products/services.
 * Supports bulk operations for efficient tag management.
 * @module TagRoutes
 * @requires express
 * @requires ../controllers/tagController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

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