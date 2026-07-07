/**
 * @file invoiceController.test.ts
 * @purpose Unit tests for invoiceController functions, testing all endpoints with authentication and authorization
 * @created 2025-09-05
 * @modified 2025-09-05
 */

// Mock dependencies before any imports that use puppeteer
jest.mock('../services/pdf/invoicePdfService', () => ({
  invoicePdfService: {
    generateInvoicePdf: jest.fn()
  }
}));
jest.mock('../models/Invoice');
jest.mock('../services/invoiceGenerationService');
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/logger');
jest.mock('../utils/emailService', () => ({
  sendCustomEmail: jest.fn().mockResolvedValue(true)
}));

import { Request, Response } from 'express';
import { Types } from 'mongoose';
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
  cancelInvoice
} from './invoiceController';
import Invoice from '../models/Invoice';
import { AuthRequest } from '../middleware/auth';
import { invoiceGenerationService } from '../services/invoiceGenerationService';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const MockedInvoice = Invoice as jest.Mocked<typeof Invoice>;
const mockedInvoiceGenerationService = invoiceGenerationService as jest.Mocked<typeof invoiceGenerationService>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('invoiceController', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let next: jest.Mock;

  const mockUserId = new Types.ObjectId().toString();
  const mockInvoiceId = new Types.ObjectId().toString();
  const mockVendorId = new Types.ObjectId().toString();

  const mockInvoice = {
    _id: mockInvoiceId,
    invoiceNumber: 'INV-2024-001',
    vendor: { _id: mockVendorId, kontakt: { name: 'Test Vendor', email: 'test@vendor.com' } },
    period: { month: 9, year: 2024 },
    items: [],
    subtotal: 100,
    tax: 19,
    totalAmount: 119,
    status: 'sent',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    markAsPaid: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({})
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    setHeaderMock = jest.fn();
    next = jest.fn();

    res = {
      json: jsonMock,
      status: statusMock,
      setHeader: setHeaderMock
    };
  });

  describe('getInvoices', () => {
    beforeEach(() => {
      req = {
        query: { page: '1', limit: '10' },
        userId: mockUserId,
        user: { id: mockUserId, isAdmin: false, isVendor: true }
      };
    });

    it('should return invoices for vendor user (only their own)', async () => {
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockInvoice])
      };
      
      MockedInvoice.find = jest.fn().mockReturnValue(mockFind);
      MockedInvoice.countDocuments = jest.fn().mockResolvedValue(1);

      await getInvoices(req as AuthRequest, res as Response, next);

      expect(MockedInvoice.find).toHaveBeenCalledWith({ vendor: mockUserId });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          invoices: [mockInvoice],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    });

    it('should return all invoices for admin user', async () => {
      req.user = { id: 'admin-id', isAdmin: true, isVendor: false };
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockInvoice])
      };
      
      MockedInvoice.find = jest.fn().mockReturnValue(mockFind);
      MockedInvoice.countDocuments = jest.fn().mockResolvedValue(1);

      await getInvoices(req as AuthRequest, res as Response, next);

      expect(MockedInvoice.find).toHaveBeenCalledWith({});
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should apply status filter when provided', async () => {
      req.query = { ...req.query, status: 'paid' };
      
      const mockFind = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      
      MockedInvoice.find = jest.fn().mockReturnValue(mockFind);
      MockedInvoice.countDocuments = jest.fn().mockResolvedValue(0);

      await getInvoices(req as AuthRequest, res as Response, next);

      expect(MockedInvoice.find).toHaveBeenCalledWith({ 
        vendor: mockUserId, 
        status: 'paid' 
      });
    });

    it('should handle server errors', async () => {
      MockedInvoice.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await getInvoices(req as AuthRequest, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        message: 'Serverfehler beim Abrufen der Rechnungen'
      }));
    });
  });

  describe('getInvoiceById', () => {
    beforeEach(() => {
      req = {
        params: { id: mockInvoiceId },
        userId: mockUserId,
        user: { id: mockUserId, isAdmin: false, isVendor: true }
      };
    });

    it('should return invoice for authorized vendor', async () => {
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockInvoice,
          vendor: { _id: mockUserId, kontakt: { name: 'Test Vendor' } }
        })
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);

      await getInvoiceById(req as AuthRequest, res as Response, next);

      expect(MockedInvoice.findById).toHaveBeenCalledWith(mockInvoiceId);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object)
      });
    });

    it('should return 400 for invalid ObjectId', async () => {
      req.params = { id: 'invalid-id' };

      await getInvoiceById(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
    });

    it('should return 404 if invoice not found', async () => {
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue(null)
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);

      await getInvoiceById(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    });

    it('should return 403 for unauthorized vendor access', async () => {
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockInvoice,
          vendor: { _id: 'different-vendor-id' }
        })
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);

      await getInvoiceById(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Zugriff verweigert'
      });
    });

    it('should allow admin to access any invoice', async () => {
      req.user = { id: 'admin-id', isAdmin: true, isVendor: false };
      
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockInvoice,
          vendor: { _id: 'different-vendor-id' }
        })
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);

      await getInvoiceById(req as AuthRequest, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object)
      });
    });
  });

  describe('updateInvoiceStatus', () => {
    beforeEach(() => {
      req = {
        params: { id: mockInvoiceId },
        body: { status: 'paid' },
        userId: mockUserId,
        user: { id: mockUserId, isAdmin: false, isVendor: true }
      };
    });

    it('should allow vendor to mark their invoice as paid', async () => {
      MockedInvoice.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        vendor: mockUserId
      });

      await updateInvoiceStatus(req as AuthRequest, res as Response, next);

      expect(mockInvoice.markAsPaid).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Rechnungsstatus erfolgreich auf "paid" aktualisiert'
      });
    });

    it('should return 400 for invalid status', async () => {
      req.body = { status: 'invalid-status' };

      await updateInvoiceStatus(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Ungültiger Status')
      });
    });

    it('should return 403 for vendor trying non-paid status', async () => {
      req.body = { status: 'cancelled' };
      
      MockedInvoice.findById = jest.fn().mockResolvedValue({
        ...mockInvoice,
        vendor: mockUserId
      });

      await updateInvoiceStatus(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Vendors können nur Rechnungen als bezahlt markieren'
      });
    });

    it('should allow admin to update any status', async () => {
      req.user = { id: 'admin-id', isAdmin: true, isVendor: false };
      req.body = { status: 'cancelled' };
      
      const mockInvoiceDoc = {
        ...mockInvoice,
        vendor: 'different-vendor-id',
        status: 'sent',
        save: jest.fn().mockResolvedValue({})
      };
      
      MockedInvoice.findById = jest.fn().mockResolvedValue(mockInvoiceDoc);

      await updateInvoiceStatus(req as AuthRequest, res as Response, next);

      expect(mockInvoiceDoc.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Rechnungsstatus erfolgreich auf "cancelled" aktualisiert'
      });
    });
  });

  describe('downloadInvoicePdf', () => {
    beforeEach(() => {
      req = {
        params: { id: mockInvoiceId },
        userId: mockUserId,
        user: { id: mockUserId, isAdmin: false, isVendor: true }
      };
    });

    it('should allow authorized vendor to download their invoice PDF', async () => {
      const mockPdfPath = '/mock/path/to/invoice.pdf';
      const mockFileStream = {
        pipe: jest.fn()
      };
      
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockInvoice,
          vendor: { _id: mockUserId }
        })
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);
      mockedPath.join = jest.fn().mockReturnValue(mockPdfPath);
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.createReadStream = jest.fn().mockReturnValue(mockFileStream as any);

      await downloadInvoicePdf(req as AuthRequest, res as Response, next);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeaderMock).toHaveBeenCalledWith('Content-Disposition', 
        `attachment; filename="${mockInvoice.invoiceNumber}.pdf"`);
      expect(mockFileStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should return 404 if PDF file does not exist', async () => {
      const mockPopulate = {
        populate: jest.fn().mockResolvedValue({
          ...mockInvoice,
          vendor: { _id: mockUserId }
        })
      };
      
      MockedInvoice.findById = jest.fn().mockReturnValue(mockPopulate);
      mockedPath.join = jest.fn().mockReturnValue('/mock/path');
      mockedFs.existsSync = jest.fn().mockReturnValue(false);

      await downloadInvoicePdf(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'PDF-Datei nicht gefunden'
      });
    });
  });

  describe('generateInvoices', () => {
    beforeEach(() => {
      req = {
        body: { month: 9, year: 2024 },
        user: { id: 'admin-id', isAdmin: true, isVendor: false }
      };
    });

    it('should allow admin to generate monthly invoices', async () => {
      const mockResult = { success: true, generated: 5 };
      mockedInvoiceGenerationService.generateInvoicesForAllVendors = jest.fn().mockResolvedValue(mockResult);

      await generateInvoices(req as AuthRequest, res as Response, next);

      expect(mockedInvoiceGenerationService.generateInvoicesForAllVendors)
        .toHaveBeenCalledWith({ month: 9, year: 2024 });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Rechnungsgenerierung erfolgreich gestartet'
      });
    });

    it('should return 403 for non-admin users', async () => {
      req.user = { id: mockUserId, isAdmin: false, isVendor: true };

      await generateInvoices(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Nur Administratoren können Rechnungen manuell generieren'
      });
    });

    it('should return 400 for missing month or year', async () => {
      req.body = { month: 9 }; // missing year

      await generateInvoices(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Monat und Jahr sind erforderlich'
      });
    });

    it('should return 400 for invalid month or year', async () => {
      req.body = { month: 13, year: 2024 }; // invalid month

      await generateInvoices(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ungültiger Monat oder Jahr'
      });
    });

    it('should generate invoice for specific vendor when vendorId provided', async () => {
      req.body = { month: 9, year: 2024, vendorId: mockVendorId };
      const mockResult = { success: true, generated: 1 };
      mockedInvoiceGenerationService.generateMonthlyInvoice = jest.fn().mockResolvedValue(mockResult);

      await generateInvoices(req as AuthRequest, res as Response, next);

      expect(mockedInvoiceGenerationService.generateMonthlyInvoice)
        .toHaveBeenCalledWith(mockVendorId, 2024, 9);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Rechnungsgenerierung erfolgreich gestartet'
      });
    });
  });

  // ===== ADMIN ENDPOINT TESTS =====

  describe('getInvoiceStats', () => {
    beforeEach(() => {
      req.user = { id: mockUserId, isAdmin: true };
    });

    it('should return comprehensive invoice statistics for admin', async () => {
      const mockStatusCounts = [
        { _id: 'draft', count: 5, totalAmount: 1000 },
        { _id: 'sent', count: 10, totalAmount: 2000 },
        { _id: 'paid', count: 15, totalAmount: 3000 }
      ];
      const mockMonthlyStats = [
        { _id: 1, count: 5, totalAmount: 500, avgAmount: 100 },
        { _id: 2, count: 8, totalAmount: 800, avgAmount: 100 }
      ];
      const mockRecentInvoices = [
        { invoiceNumber: 'RE-2024-09-00001', vendor: { kontakt: { name: 'Test Vendor' } } }
      ];

      MockedInvoice.aggregate = jest.fn()
        .mockResolvedValueOnce(mockStatusCounts)
        .mockResolvedValueOnce(mockMonthlyStats);
      MockedInvoice.countDocuments = jest.fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(30);
      MockedInvoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockRecentInvoices)
            })
          })
        })
      });

      await getInvoiceStats(req as AuthRequest, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalInvoices: 30,
            totalRevenue: 6000,
            paidRevenue: 3000,
            pendingRevenue: 3000,
            overdueCount: 5
          },
          statusBreakdown: mockStatusCounts,
          monthlyStats: mockMonthlyStats,
          recentInvoices: mockRecentInvoices
        }
      });
    });

    it('should deny access to non-admin users', async () => {
      req.user = { id: mockUserId, isAdmin: false };

      await getInvoiceStats(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Nur Administratoren können Statistiken einsehen'
      });
    });
  });

  describe('bulkGenerateInvoices', () => {
    beforeEach(() => {
      req.user = { id: mockUserId, isAdmin: true };
    });

    it('should generate invoices for specific vendors', async () => {
      const vendorIds = [mockVendorId, new Types.ObjectId().toString()];
      req.body = { vendorIds, month: 9, year: 2024 };
      
      mockedInvoiceGenerationService.generateMonthlyInvoice = jest.fn()
        .mockResolvedValueOnce({ success: true, generated: 1 })
        .mockResolvedValueOnce({ success: true, generated: 1 });

      await bulkGenerateInvoices(req as AuthRequest, res as Response, next);

      expect(mockedInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledTimes(2);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalProcessed: 2,
            successCount: 2,
            errorCount: 0
          },
          results: expect.arrayContaining([
            { vendorId: vendorIds[0], success: true, result: { success: true, generated: 1 } },
            { vendorId: vendorIds[1], success: true, result: { success: true, generated: 1 } }
          ])
        },
        message: 'Bulk-Generierung abgeschlossen: 2 erfolgreich, 0 Fehler'
      });
    });

    it('should generate invoices for all vendors when no vendorIds provided', async () => {
      req.body = { month: 9, year: 2024 };
      const mockResult = { success: true, generated: 10 };
      mockedInvoiceGenerationService.generateInvoicesForAllVendors = jest.fn().mockResolvedValue(mockResult);

      await bulkGenerateInvoices(req as AuthRequest, res as Response, next);

      expect(mockedInvoiceGenerationService.generateInvoicesForAllVendors)
        .toHaveBeenCalledWith({ month: 9, year: 2024 });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalProcessed: 1,
            successCount: 1,
            errorCount: 0
          },
          results: [{ success: true, result: mockResult }]
        },
        message: 'Bulk-Generierung abgeschlossen: 1 erfolgreich, 0 Fehler'
      });
    });

    it('should handle partial failures in bulk generation', async () => {
      const vendorIds = [mockVendorId, new Types.ObjectId().toString()];
      req.body = { vendorIds, month: 9, year: 2024 };
      
      mockedInvoiceGenerationService.generateMonthlyInvoice = jest.fn()
        .mockResolvedValueOnce({ success: true, generated: 1 })
        .mockRejectedValueOnce(new Error('Generation failed'));

      await bulkGenerateInvoices(req as AuthRequest, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalProcessed: 2,
            successCount: 1,
            errorCount: 1
          },
          results: expect.arrayContaining([
            { vendorId: vendorIds[0], success: true, result: { success: true, generated: 1 } },
            { vendorId: vendorIds[1], success: false, error: 'Generation failed' }
          ])
        },
        message: 'Bulk-Generierung abgeschlossen: 1 erfolgreich, 1 Fehler'
      });
    });

    it('should validate required fields', async () => {
      req.body = {};

      await bulkGenerateInvoices(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Monat und Jahr sind erforderlich'
      });
    });
  });

  describe('editInvoice', () => {
    let mockInvoice: any;

    beforeEach(() => {
      req = {
        user: { id: mockUserId, isAdmin: true, email: 'admin@test.com' },
        userId: mockUserId,
        params: { id: mockInvoiceId },
        body: {}
      } as unknown as AuthRequest;
      
      mockInvoice = {
        _id: mockInvoiceId,
        invoiceNumber: 'RE-2024-09-00001',
        status: 'draft',
        notes: 'Original notes',
        dueDate: new Date('2024-10-01'),
        save: jest.fn().mockResolvedValue(true)
      };
      
      MockedInvoice.findById = jest.fn().mockResolvedValue(mockInvoice);
    });

    it('should edit invoice with valid changes', async () => {
      req.body = {
        notes: 'Updated notes',
        dueDate: '2024-10-15',
        status: 'sent'
      };

      await editInvoice(req as AuthRequest, res as Response, next);

      expect(mockInvoice.notes).toBe('Updated notes');
      expect(mockInvoice.status).toBe('sent');
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockInvoice,
        message: 'Rechnung erfolgreich bearbeitet',
        auditTrail: expect.objectContaining({
          action: 'invoice_edit',
          adminId: mockUserId,
          changes: expect.any(Object)
        })
      });
    });

    it('should prevent editing paid invoices', async () => {
      mockInvoice.status = 'paid';
      req.body = { notes: 'Updated notes' };

      await editInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Bezahlte Rechnungen können nicht bearbeitet werden'
      });
    });

    it('should prevent editing cancelled invoices', async () => {
      mockInvoice.status = 'cancelled';
      req.body = { notes: 'Updated notes' };

      await editInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Stornierte Rechnungen können nicht bearbeitet werden'
      });
    });

    it('should reject invalid status changes', async () => {
      req.body = { status: 'paid' };

      await editInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ungültiger Status. Erlaubte Werte für Bearbeitung: draft, sent, overdue'
      });
    });
  });

  describe('resendInvoiceEmail', () => {
    let mockInvoice: any;
    let mockEmailService: any;

    beforeEach(() => {
      req = {
        user: { id: mockUserId, isAdmin: true, email: 'admin@test.com' },
        userId: mockUserId,
        params: { id: mockInvoiceId }
      } as unknown as AuthRequest;

      mockInvoice = {
        _id: mockInvoiceId,
        invoiceNumber: 'RE-2024-09-00001',
        status: 'sent',
        vendor: {
          kontakt: { email: 'vendor@test.com', name: 'Test Vendor' },
          registrationStatus: 'active'
        },
        totalAmount: 100.50,
        dueDate: new Date('2024-10-15'),
        emailAttempts: 1,
        lastEmailAttempt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        save: jest.fn().mockResolvedValue(true)
      };

      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });

      // Mock dynamic import
      jest.doMock('../utils/emailService', () => ({
        sendCustomEmail: jest.fn().mockResolvedValue(true)
      }));
    });

    it('should resend invoice email successfully', async () => {
      await resendInvoiceEmail(req as AuthRequest, res as Response, next);

      expect(mockInvoice.emailStatus).toBe('sent');
      expect(mockInvoice.emailAttempts).toBe(2);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          invoiceNumber: mockInvoice.invoiceNumber,
          recipientEmail: mockInvoice.vendor.kontakt.email,
          sentAt: expect.any(Date),
          attempts: 2
        },
        message: 'E-Mail erfolgreich erneut versendet',
        auditTrail: expect.objectContaining({
          action: 'invoice_email_resend'
        })
      });
    });

    it('should prevent resending for cancelled invoices', async () => {
      mockInvoice.status = 'cancelled';

      await resendInvoiceEmail(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Stornierte Rechnungen können nicht erneut versendet werden'
      });
    });

    it('should prevent resending for inactive vendors', async () => {
      mockInvoice.vendor.registrationStatus = 'cancelled';

      await resendInvoiceEmail(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Rechnung kann nicht versendet werden - Vendor ist nicht aktiv'
      });
    });

    it('should enforce rate limiting', async () => {
      mockInvoice.lastEmailAttempt = new Date(); // Just now

      await resendInvoiceEmail(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'E-Mail kann erst nach einer Stunde erneut versendet werden'
      });
    });
  });

  describe('cancelInvoice', () => {
    let mockInvoice: any;

    beforeEach(() => {
      req = {
        user: { id: mockUserId, isAdmin: true, email: 'admin@test.com' },
        userId: mockUserId,
        params: { id: mockInvoiceId },
        body: { reason: 'Administrative cancellation' }
      } as unknown as AuthRequest;

      mockInvoice = {
        _id: mockInvoiceId,
        invoiceNumber: 'RE-2024-09-00001',
        status: 'sent',
        save: jest.fn().mockResolvedValue(true)
      };

      MockedInvoice.findById = jest.fn().mockResolvedValue(mockInvoice);
    });

    it('should cancel invoice with reason', async () => {
      await cancelInvoice(req as AuthRequest, res as Response, next);

      expect(mockInvoice.status).toBe('cancelled');
      expect(mockInvoice.cancelledAt).toBeInstanceOf(Date);
      expect(mockInvoice.cancellationReason).toBe('Administrative cancellation');
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          invoiceNumber: mockInvoice.invoiceNumber,
          status: 'cancelled',
          cancelledAt: expect.any(Date),
          cancellationReason: 'Administrative cancellation',
          originalStatus: 'sent'
        },
        message: 'Rechnung erfolgreich storniert',
        auditTrail: expect.objectContaining({
          action: 'invoice_cancel'
        })
      });
    });

    it('should require cancellation reason', async () => {
      req.body = {};

      await cancelInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Stornierungsgrund ist erforderlich'
      });
    });

    it('should prevent cancelling already cancelled invoices', async () => {
      mockInvoice.status = 'cancelled';

      await cancelInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Rechnung ist bereits storniert'
      });
    });

    it('should prevent cancelling paid invoices', async () => {
      mockInvoice.status = 'paid';

      await cancelInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Bezahlte Rechnungen können nicht storniert werden. Bitte verwenden Sie eine Gutschrift.'
      });
    });

    it('should deny access to non-admin users', async () => {
      req.user = { id: mockUserId, isAdmin: false };

      await cancelInvoice(req as AuthRequest, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Nur Administratoren können Rechnungen stornieren'
      });
    });
  });
});