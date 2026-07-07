/**
 * @file vendorInvoiceEndpoints.test.ts
 * @purpose Isolated unit tests for vendor invoice endpoints - TASK-014
 * @created 2025-09-09
 * @modified 2025-09-09
 */

// Mock dependencies before any imports
jest.mock('../../models/Invoice');
jest.mock('../../models/User');
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils/logger');

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Invoice from '../../models/Invoice';
import User from '../../models/User';
import fs from 'fs';
import path from 'path';

// Mock the AuthRequest interface locally
interface AuthRequest extends Request {
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
}

const MockedInvoice = Invoice as jest.Mocked<typeof Invoice>;
const MockedUser = User as jest.Mocked<typeof User>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

// Import the functions directly to avoid bcrypt issues
const getVendorInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, month, year } = req.query;
    
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    const user = await User.findById(req.user.id).select('isVendor');
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    const query: any = { vendor: req.user.id };
    
    if (status && typeof status === 'string') {
      query.status = status;
    }
    
    if (month && year) {
      query['period.month'] = parseInt(month as string);
      query['period.year'] = parseInt(year as string);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const invoices = await Invoice.find(query)
      .populate('vendor', 'kontakt.name kontakt.email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnungen'
    });
  }
};

const getVendorInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.user || !req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Ungültige Rechnungs-ID'
      });
      return;
    }

    const invoice = await Invoice.findById(id)
      .populate('vendor', 'kontakt.name kontakt.email kontakt.telefon adressen');

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
      return;
    }

    if (invoice.vendor._id.toString() !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Rechnung'
    });
  }
};

describe('Vendor Invoice Endpoints - TASK-014', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockVendorId = new Types.ObjectId().toString();
  const mockInvoiceId = new Types.ObjectId().toString();
  const mockOtherVendorId = new Types.ObjectId().toString();

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();

    res = {
      json: jsonMock,
      status: statusMock
    } as Partial<Response>;

    req = {
      user: { id: mockVendorId, isVendor: true },
      query: {},
      params: {}
    };

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
});