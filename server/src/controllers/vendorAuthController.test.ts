/**
 * @file vendorAuthController.test.ts
 * @purpose Unit tests for vendor invoice endpoints in vendorAuthController
 * @created 2025-09-09
 * @modified 2025-09-09
 */

// Mock dependencies before any imports
jest.mock('../models/Invoice');
jest.mock('../models/User');
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/logger');

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  getVendorInvoices,
  getVendorInvoiceById,
  downloadVendorInvoicePdf,
  getVendorInvoiceSummary
} from './vendor/vendorBookingController';
import Invoice from '../models/Invoice';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const MockedInvoice = Invoice as jest.Mocked<typeof Invoice>;
const MockedUser = User as jest.Mocked<typeof User>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('vendorAuthController - Invoice Endpoints', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  const mockVendorId = new Types.ObjectId().toString();
  const mockInvoiceId = new Types.ObjectId().toString();
  const mockOtherVendorId = new Types.ObjectId().toString();

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();
    setHeaderMock = jest.fn().mockReturnThis();

    res = {
      json: jsonMock,
      status: statusMock,
      setHeader: setHeaderMock,
      pipe: jest.fn()
    } as Partial<Response>;

    req = {
      user: { id: mockVendorId, isVendor: true },
      query: {},
      params: {}
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getVendorInvoices', () => {
    const mockInvoices = [
      {
        _id: mockInvoiceId,
        invoiceNumber: 'INV-2025-001',
        vendor: { _id: mockVendorId, kontakt: { name: 'Test Vendor', email: 'test@vendor.com' } },
        totalAmount: 100.50,
        status: 'sent',
        createdAt: new Date()
      }
    ];

    beforeEach(() => {
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ isVendor: true })
      });

      MockedInvoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockInvoices)
            })
          })
        })
      });

      MockedInvoice.countDocuments = jest.fn().mockResolvedValue(1);
    });

    it('should return vendor invoices with pagination', async () => {
      await getVendorInvoices(req as AuthRequest, res as Response);

      expect(MockedUser.findById).toHaveBeenCalledWith(mockVendorId);
      expect(MockedInvoice.find).toHaveBeenCalledWith({ vendor: mockVendorId });
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          invoices: mockInvoices,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1
          }
        }
      });
    });

    it('should filter by status when provided', async () => {
      req.query = { status: 'paid' };

      await getVendorInvoices(req as AuthRequest, res as Response);

      expect(MockedInvoice.find).toHaveBeenCalledWith({ vendor: mockVendorId, status: 'paid' });
    });

    it('should filter by month and year when provided', async () => {
      req.query = { month: '12', year: '2024' };

      await getVendorInvoices(req as AuthRequest, res as Response);

      expect(MockedInvoice.find).toHaveBeenCalledWith({
        vendor: mockVendorId,
        'period.month': 12,
        'period.year': 2024
      });
    });

    it('should return 403 when user not authenticated', async () => {
      req.user = undefined;

      await getVendorInvoices(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Keine Berechtigung'
      });
    });

    it('should return 404 when user is not a vendor', async () => {
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ isVendor: false })
      });

      await getVendorInvoices(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Vendor nicht gefunden'
      });
    });
  });

  describe('getVendorInvoiceById', () => {
    const mockInvoice = {
      _id: mockInvoiceId,
      invoiceNumber: 'INV-2025-001',
      vendor: { _id: mockVendorId, kontakt: { name: 'Test Vendor', email: 'test@vendor.com' } },
      totalAmount: 100.50,
      status: 'sent'
    };

    beforeEach(() => {
      req.params = { id: mockInvoiceId };
      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });
    });

    it('should return specific vendor invoice', async () => {
      await getVendorInvoiceById(req as AuthRequest, res as Response);

      expect(MockedInvoice.findById).toHaveBeenCalledWith(mockInvoiceId);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockInvoice
      });
    });

    it('should return 400 for invalid ObjectId', async () => {
      req.params = { id: 'invalid-id' };

      await getVendorInvoiceById(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
    });

    it('should return 404 when invoice not found', async () => {
      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      await getVendorInvoiceById(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    });

    it('should return 403 when trying to access other vendor invoice', async () => {
      const otherVendorInvoice = {
        ...mockInvoice,
        vendor: { _id: mockOtherVendorId }
      };
      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(otherVendorInvoice)
      });

      await getVendorInvoiceById(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Zugriff verweigert'
      });
    });
  });

  describe('downloadVendorInvoicePdf', () => {
    const mockInvoice = {
      _id: mockInvoiceId,
      invoiceNumber: 'INV-2025-001',
      vendor: { _id: mockVendorId }
    };

    beforeEach(() => {
      req.params = { id: mockInvoiceId };
      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockInvoice)
      });
      mockedPath.join = jest.fn().mockReturnValue('/path/to/invoice.pdf');
      mockedFs.existsSync = jest.fn().mockReturnValue(true);
      mockedFs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn()
      } as any);
    });

    it('should download PDF when authorized', async () => {
      await downloadVendorInvoicePdf(req as AuthRequest, res as Response);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeaderMock).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="INV-2025-001.pdf"');
      expect(mockedFs.createReadStream).toHaveBeenCalled();
    });

    it('should return 404 when PDF file does not exist', async () => {
      mockedFs.existsSync = jest.fn().mockReturnValue(false);

      await downloadVendorInvoicePdf(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'PDF-Datei nicht gefunden'
      });
    });

    it('should return 403 when trying to download other vendor invoice', async () => {
      const otherVendorInvoice = {
        ...mockInvoice,
        vendor: { _id: mockOtherVendorId }
      };
      MockedInvoice.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(otherVendorInvoice)
      });

      await downloadVendorInvoicePdf(req as AuthRequest, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Zugriff verweigert'
      });
    });
  });

  describe('getVendorInvoiceSummary', () => {
    const mockInvoices = [
      { status: 'draft', totalAmount: 100 },
      { status: 'sent', totalAmount: 200 },
      { status: 'paid', totalAmount: 300 },
      { status: 'overdue', totalAmount: 150 },
      { status: 'cancelled', totalAmount: 50 }
    ];

    beforeEach(() => {
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ isVendor: true })
      });
      MockedInvoice.find = jest.fn().mockResolvedValue(mockInvoices);
    });

    it('should return vendor invoice summary', async () => {
      await getVendorInvoiceSummary(req as AuthRequest, res as Response);

      expect(MockedInvoice.find).toHaveBeenCalledWith({
        vendor: mockVendorId,
        'period.year': new Date().getFullYear()
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          totalInvoices: 5,
          totalAmount: 800,
          paidAmount: 300,
          pendingAmount: 300, // draft + sent
          overdueAmount: 150,
          statusBreakdown: {
            draft: 1,
            sent: 1,
            paid: 1,
            overdue: 1,
            cancelled: 1
          },
          period: {
            year: new Date().getFullYear(),
            month: null
          }
        }
      });
    });

    it('should filter by year and month when provided', async () => {
      req.query = { year: '2024', month: '12' };

      await getVendorInvoiceSummary(req as AuthRequest, res as Response);

      expect(MockedInvoice.find).toHaveBeenCalledWith({
        vendor: mockVendorId,
        'period.year': 2024,
        'period.month': 12
      });
    });
  });
});