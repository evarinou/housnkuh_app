/**
 * @file vendorBookingController.test.ts
 * @purpose Unit tests for vendor booking, contracts, trial management
 * @created 2026-03-29
 */

jest.mock('../../models/User');
jest.mock('../../models/Vertrag');
jest.mock('../../models/Invoice');
jest.mock('../../utils/emailService', () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue(true),
  sendCancellationConfirmationEmail: jest.fn().mockResolvedValue(true),
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

import { Response, NextFunction } from 'express';
import {
  completeBooking,
  getVendorContracts,
  getTrialStatus,
  cancelTrialBooking,
  confirmTrialBooking,
  getVendorBookings,
  dismissDashboardMessage,
} from './vendorBookingController';
import User from '../../models/User';
import Vertrag from '../../models/Vertrag';
import { AuthRequest } from '../../middleware/auth';

const MockedUser = User as jest.Mocked<typeof User>;
const MockedVertrag = Vertrag as jest.Mocked<typeof Vertrag>;

describe('vendorBookingController', () => {
  let req: Partial<AuthRequest>;
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

  describe('completeBooking', () => {
    it('should return 404 if user not found', async () => {
      req = { params: { userId: 'nonexistent' } };
      MockedUser.findById = jest.fn().mockResolvedValue(null) as any;

      await completeBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Keine ausstehende Buchung gefunden' }),
      );
    });

    it('should return 404 if no pending booking', async () => {
      req = { params: { userId: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        pendingBooking: null,
        kontakt: { status: 'aktiv' },
      }) as any;

      await completeBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if email not confirmed', async () => {
      req = { params: { userId: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        pendingBooking: { status: 'pending', packageData: {} },
        kontakt: { status: 'pending' },
      }) as any;

      await completeBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'E-Mail muss zuerst bestätigt werden' }),
      );
    });

    it('should return 500 on server error', async () => {
      req = { params: { userId: 'user1' } };
      MockedUser.findById = jest.fn().mockRejectedValue(new Error('DB error')) as any;

      await completeBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Ein Serverfehler ist aufgetreten',
        }),
      );
    });
  });

  describe('getVendorContracts', () => {
    it('should return 403 if user ID does not match token', async () => {
      req = {
        params: { userId: 'other-user' },
        user: { id: 'my-user' },
      };

      await getVendorContracts(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return formatted contracts', async () => {
      req = {
        params: { userId: 'user1' },
        user: { id: 'user1' },
      };
      const mockContracts = [
        {
          _id: 'v1',
          datum: new Date('2026-01-01'),
          totalMonthlyPrice: 150,
          services: [
            {
              mietfach: { bezeichnung: 'M-01' },
              mietbeginn: new Date('2026-01-01'),
              mietende: new Date('2027-01-01'),
              monatspreis: 150,
            },
          ],
        },
      ];
      MockedVertrag.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockContracts),
          }),
        }),
      }) as any;

      await getVendorContracts(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          vertraege: expect.arrayContaining([
            expect.objectContaining({
              id: 'v1',
              gesamtpreis: 150,
            }),
          ]),
        }),
      );
    });

    it('should return 500 on error', async () => {
      req = {
        params: { userId: 'user1' },
        user: { id: 'user1' },
      };
      MockedVertrag.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      }) as any;

      await getVendorContracts(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Fehler beim Abrufen der Verträge',
        }),
      );
    });
  });

  describe('getTrialStatus', () => {
    it('should return 403 if not authenticated', async () => {
      req = { user: undefined };

      await getTrialStatus(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if vendor not found', async () => {
      req = { user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      }) as any;

      await getTrialStatus(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return trial data for active trial user', async () => {
      req = { user: { id: 'user1' } };
      const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user1',
          isVendor: true,
          registrationStatus: 'trial_active',
          trialStartDate: new Date('2026-03-01'),
          trialEndDate: trialEnd,
        }),
      }) as any;
      MockedVertrag.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }) as any;

      await getTrialStatus(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isInTrial: true,
            daysRemaining: expect.any(Number),
          }),
        }),
      );
    });

    it('should return non-trial data for regular user', async () => {
      req = { user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user1',
          isVendor: true,
          registrationStatus: 'active',
          trialStartDate: null,
          trialEndDate: null,
        }),
      }) as any;
      MockedVertrag.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }) as any;

      await getTrialStatus(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isInTrial: false,
            daysRemaining: 0,
          }),
        }),
      );
    });
  });

  describe('cancelTrialBooking', () => {
    it('should return 403 if not authenticated', async () => {
      req = { params: { bookingId: 'b1' }, body: {}, user: undefined };

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if vendor not found', async () => {
      req = { params: { bookingId: 'b1' }, body: {}, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue(null) as any;

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 404 if trial contract not found', async () => {
      req = { params: { bookingId: 'b1' }, body: {}, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        isVendor: true,
        registrationStatus: 'trial_active',
        kontakt: { email: 'v@test.com', name: 'V' },
      }) as any;
      MockedVertrag.findOne = jest.fn().mockResolvedValue(null) as any;

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Trial-Buchung nicht gefunden' }),
      );
    });

    it('should return 400 if not in trial period', async () => {
      req = { params: { bookingId: 'b1' }, body: {}, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        isVendor: true,
        registrationStatus: 'active',
        kontakt: { email: 'v@test.com', name: 'V' },
      }) as any;
      MockedVertrag.findOne = jest.fn().mockResolvedValue({
        _id: 'b1',
        status: 'active',
      }) as any;

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Stornierung nur während des Probemonats möglich' }),
      );
    });

    it('should return 400 if already cancelled', async () => {
      req = { params: { bookingId: 'b1' }, body: {}, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        isVendor: true,
        registrationStatus: 'trial_active',
        kontakt: { email: 'v@test.com', name: 'V' },
      }) as any;
      MockedVertrag.findOne = jest.fn().mockResolvedValue({
        _id: 'b1',
        status: 'cancelled',
      }) as any;

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Buchung bereits storniert' }),
      );
    });

    it('should cancel trial booking successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      req = {
        params: { bookingId: 'b1' },
        body: { reason: 'Kein Bedarf' },
        user: { id: 'user1' },
      };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        isVendor: true,
        registrationStatus: 'trial_active',
        trialEndDate: new Date('2026-04-01'),
        kontakt: { email: 'v@test.com', name: 'Vendor' },
      }) as any;
      MockedVertrag.findOne = jest.fn().mockResolvedValue({
        _id: 'b1',
        status: 'active',
        save: saveMock,
      }) as any;

      await cancelTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Trial-Buchung erfolgreich storniert',
        }),
      );
    });
  });

  describe('confirmTrialBooking', () => {
    it('should return 403 if not authenticated', async () => {
      req = { body: {}, user: undefined };

      await confirmTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 if vendor not found', async () => {
      req = { body: { mietfachId: 'm1' }, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue(null) as any;

      await confirmTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 if not in trial period', async () => {
      req = { body: { mietfachId: 'm1' }, user: { id: 'user1' } };
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'user1',
        isVendor: true,
        registrationStatus: 'active',
      }) as any;

      await confirmTrialBooking(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Probemonat-Buchung nur für aktive Trial-Nutzer möglich',
        }),
      );
    });
  });

  describe('dismissDashboardMessage', () => {
    it('should return 403 if not authenticated', async () => {
      req = { params: { messageId: 'm1' }, user: undefined };

      await dismissDashboardMessage(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should dismiss message successfully', async () => {
      req = { params: { messageId: 'm1' }, user: { id: 'user1' } };

      await dismissDashboardMessage(req as AuthRequest, res as Response, next as unknown as NextFunction);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
