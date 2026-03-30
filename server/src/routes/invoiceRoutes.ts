/**
 * @file Invoice Routes - Express router for invoice management endpoints
 * @description Provides REST API routes for managing invoices in the marketplace.
 * Includes authenticated routes for vendors and admins to manage invoices, with
 * proper authorization controls ensuring vendors only access their own invoices.
 * @module InvoiceRoutes
 * @requires express
 * @requires ../controllers/invoiceController
 * @requires ../middleware/auth
 * @author housnkuh Development Team
 * @since 1.0.0
 */

import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  downloadInvoicePdf,
  generateInvoices,
  getInvoiceStats,
  bulkGenerateInvoices,
  editInvoice,
  resendInvoiceEmail,
  cancelInvoice,
  exportInvoices
} from '../controllers/invoiceController';
import { auth, adminAuth } from '../middleware/auth';

const router = express.Router();
/**
 * GET /api/invoices/export
 * Export invoices to CSV format with filtering
 * Admin only - supports all filtering options from dashboard
 */
router.get('/export', adminAuth, exportInvoices);

/**
 * GET /api/invoices
 * List all invoices with pagination and filtering
 * - Admin: sees all invoices
 * - Vendor: sees only their own invoices
 */
router.get('/', auth, getInvoices);

/**
 * GET /api/invoices/:id
 * Get single invoice by ID
 * Authorization: Admin can see all, vendors only their own
 */
router.get('/:id', auth, getInvoiceById);

/**
 * PUT /api/invoices/:id/status
 * Update invoice status
 * - Admin: can update all invoices
 * - Vendor: can mark their own invoices as paid
 */
router.put('/:id/status', auth, updateInvoiceStatus);

/**
 * GET /api/invoices/:id/pdf
 * Download invoice PDF
 * Authorization: Admin can download all, vendors only their own
 */
router.get('/:id/pdf', auth, downloadInvoicePdf);

/**
 * POST /api/invoices/generate
 * Manually trigger invoice generation
 * Admin only - can generate for specific vendor or all vendors
 */
router.post('/generate', adminAuth, generateInvoices);

// ===== ADMIN-SPECIFIC ROUTES =====

/**
 * GET /api/invoices/admin/stats
 * Get comprehensive invoice statistics for admin dashboard
 * Admin only - provides revenue data, status breakdown, monthly stats
 */
router.get('/admin/stats', adminAuth, getInvoiceStats);

/**
 * POST /api/invoices/admin/bulk-generate
 * Generate invoices for multiple vendors at once
 * Admin only - supports vendor selection or all vendors
 */
router.post('/admin/bulk-generate', adminAuth, bulkGenerateInvoices);

/**
 * PUT /api/invoices/admin/:id
 * Edit invoice with restricted fields (notes, dueDate, limited status changes)
 * Admin only - includes audit trail logging
 */
router.put('/admin/:id', adminAuth, editInvoice);

/**
 * POST /api/invoices/admin/:id/resend
 * Resend invoice email notification
 * Admin only - includes rate limiting and email tracking
 */
router.post('/admin/:id/resend', adminAuth, resendInvoiceEmail);

/**
 * DELETE /api/invoices/admin/:id
 * Cancel (soft delete) invoice with reason tracking
 * Admin only - prevents deletion of paid invoices
 */
router.delete('/admin/:id', adminAuth, cancelInvoice);

export default router;