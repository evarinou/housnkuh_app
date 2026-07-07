/**
 * @file bookingAdminController.test.ts
 * @purpose Unit tests for admin booking management (pending bookings, availability, confirm/reject)
 * @created 2026-03-29
 */

jest.mock('../../models/User');
jest.mock('../../models/Mietfach');
jest.mock('../../models/Vertrag');
jest.mock('../../utils/bookingEvents', () => ({
  __esModule: true,
  default: { emit: jest.fn(), emitStatusChange: jest.fn() },
}));
jest.mock('../../services/priceCalculationService', () => ({
  PriceCalculationService: {
    calculatePrice: jest.fn().mockReturnValue({
      monthlyTotal: 100,
      packageCosts: 80,
      zusatzleistungenCosts: 20,
      subtotal: 100,
      discountAmount: 0,
      discount: 0,
    }),
  },
}));
jest.mock('../../utils/validation', () => ({
  validatePriceAdjustments: jest.fn().mockReturnValue({ isValid: true }),
  validateZusatzleistungen: jest.fn().mockReturnValue({ isValid: true }),
}));
jest.mock('../../utils/emailService', () => ({
  sendAdminConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendBookingRejectionEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import {
  getPendingBookings,
  getAvailableMietfaecher,
  confirmPendingBooking,
  rejectPendingBooking,
} from './bookingAdminController';
import User from '../../models/User';
import Mietfach from '../../models/Mietfach';

const MockedUser = User as jest.Mocked<typeof User>;
const MockedMietfach = Mietfach as jest.Mocked<typeof Mietfach>;

describe('bookingAdminController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let next: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { json: jsonMock, status: statusMock } as Partial<Response>;
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getPendingBookings', () => {
    it('should return pending bookings', async () => {
      req = {};
      const mockVendors = [
        {
          kontakt: { email: 'v1@test.com' },
          pendingBooking: { status: 'pending' },
        },
      ];
      // Mock for debug query (all vendors)
      const findAllMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVendors),
      });
      // Mock for actual pending bookings query
      const findPendingMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            toObject: () => ({
              _id: 'user1',
              kontakt: { email: 'v1@test.com' },
              pendingBooking: {
                status: 'pending',
                packageData: null,
                toObject: () => ({ status: 'pending', packageData: null }),
              },
            }),
          },
        ]),
      });
      MockedUser.find = jest
        .fn()
        .mockImplementationOnce(findAllMock)
        .mockImplementationOnce(findPendingMock) as any;

      await getPendingBookings(req as Request, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 1,
        }),
      );
    });

    it('should return empty list when no pending bookings', async () => {
      req = {};
      MockedUser.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      }) as any;

      await getPendingBookings(req as Request, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 0,
          pendingBookings: [],
        }),
      );
    });

    it('should forward 500 AppError to next on error', async () => {
      req = {};
      MockedUser.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error')),
      }) as any;

      await getPendingBookings(req as Request, res as Response, next as unknown as NextFunction);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Serverfehler beim Abrufen der ausstehenden Buchungen',
        }),
      );
    });
  });

  describe('getAvailableMietfaecher', () => {
    it('should return available Mietfaecher', async () => {
      req = {};
      const mockMietfaecher = [
        { bezeichnung: 'M-01', typ: 'Standard', groesse: '1m²' },
        { bezeichnung: 'M-02', typ: 'Premium', groesse: '2m²' },
      ];
      MockedMietfach.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockMietfaecher),
      }) as any;

      await getAvailableMietfaecher(req as Request, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          mietfaecher: mockMietfaecher,
        }),
      );
    });

    it('should forward 500 AppError to next on error', async () => {
      req = {};
      MockedMietfach.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('DB error')),
      }) as any;

      await getAvailableMietfaecher(req as Request, res as Response, next as unknown as NextFunction);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Serverfehler beim Abrufen der Mietfächer',
        }),
      );
    });
  });

  describe('confirmPendingBooking', () => {
    it('should return 400 if no Mietfaecher assigned', async () => {
      req = { params: { userId: 'user1' }, body: {} };

      await confirmPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Mindestens ein Mietfach muss zugeordnet werden',
        }),
      );
    });

    it('should return 400 if Mietfaecher is empty array', async () => {
      req = { params: { userId: 'user1' }, body: { assignedMietfaecher: [] } };

      await confirmPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user has no pending booking', async () => {
      req = {
        params: { userId: 'user1' },
        body: { assignedMietfaecher: ['mf1'] },
      };
      MockedUser.findById = jest.fn().mockResolvedValue({
        pendingBooking: null,
      }) as any;

      await confirmPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Keine ausstehende Buchung für diesen User gefunden',
        }),
      );
    });

    it('should return 404 if user not found', async () => {
      req = {
        params: { userId: 'nonexistent' },
        body: { assignedMietfaecher: ['mf1'] },
      };
      MockedUser.findById = jest.fn().mockResolvedValue(null) as any;

      await confirmPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('rejectPendingBooking', () => {
    it('should return 404 if user not found', async () => {
      req = { params: { userId: 'nonexistent' }, body: {} };
      MockedUser.findById = jest.fn().mockResolvedValue(null) as any;

      await rejectPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 404 if no pending booking', async () => {
      req = { params: { userId: 'user1' }, body: {} };
      MockedUser.findById = jest.fn().mockResolvedValue({
        pendingBooking: null,
        kontakt: { email: 'test@test.com' },
      }) as any;

      await rejectPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should reject booking and save user', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      req = {
        params: { userId: 'user1' },
        body: { reason: 'Nicht verfügbar' },
      };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        pendingBooking: {
          status: 'pending',
          packageData: { packageOptions: [] },
        },
        kontakt: { email: 'vendor@test.com', name: 'Vendor' },
        save: saveMock,
      }) as any;

      await rejectPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should send rejection email with reason to vendor', async () => {
      const { sendBookingRejectionEmail } = require('../../utils/emailService');
      req = {
        params: { userId: 'user1' },
        body: { reason: 'Aktuell keine passenden Mietfächer frei' },
      };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        pendingBooking: { status: 'pending', packageData: { packageOptions: [] } },
        kontakt: { email: 'vendor@test.com', name: 'Vendor' },
        save: jest.fn().mockResolvedValue(true),
      }) as any;

      await rejectPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(sendBookingRejectionEmail).toHaveBeenCalledWith('vendor@test.com', {
        name: 'Vendor',
        reason: 'Aktuell keine passenden Mietfächer frei',
      });
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should still succeed if rejection email fails', async () => {
      const { sendBookingRejectionEmail } = require('../../utils/emailService');
      sendBookingRejectionEmail.mockRejectedValueOnce(new Error('SMTP down'));
      const saveMock = jest.fn().mockResolvedValue(true);
      req = { params: { userId: 'user1' }, body: { reason: 'Test' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        pendingBooking: { status: 'pending', packageData: { packageOptions: [] } },
        kontakt: { email: 'vendor@test.com', name: 'Vendor' },
        save: saveMock,
      }) as any;

      await rejectPendingBooking(req as Request, res as Response, next as unknown as NextFunction);

      expect(saveMock).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
