/**
 * @file vendorAuth.login.test.ts
 * @purpose Unit tests for vendor login and email confirmation
 * @created 2026-03-29
 */

const mockSave = jest.fn();
jest.mock('../models/User', () => {
  const MockUser: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    _id: 'new-vendor-id',
    save: mockSave,
  }));
  MockUser.findOne = jest.fn();
  return { __esModule: true, default: MockUser };
});
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../config/config', () => ({ jwtSecret: 'test-secret' }));
jest.mock('../models/Settings', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn().mockResolvedValue({
      isStoreOpen: () => false,
      storeOpening: { enabled: true, openingDate: new Date('2026-06-01') },
    }),
  },
}));
jest.mock('../utils/emailService', () => ({
  sendPreRegistrationConfirmation: jest.fn().mockResolvedValue(true),
  sendTrialActivationEmail: jest.fn().mockResolvedValue(true),
  sendBookingConfirmation: jest.fn().mockResolvedValue(true),
  sendCustomEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../utils/securityLogger', () => ({
  __esModule: true,
  default: {
    logLoginAttempt: jest.fn(),
    logInvalidToken: jest.fn(),
    logTokenExpired: jest.fn(),
    logEmailConfirmation: jest.fn(),
    logPasswordReset: jest.fn(),
  },
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { loginVendor, confirmVendorEmail, changeVendorPassword, requestPasswordReset, resetPassword, resendConfirmationEmail } from './vendorAuthController';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const MockedUser = User as jest.Mocked<typeof User>;

describe('vendorAuthController - Login & Email Confirmation', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = { json: jsonMock, status: statusMock } as Partial<Response>;
    jest.clearAllMocks();
  });

  describe('loginVendor', () => {
    it('should return 400 if email is missing', async () => {
      req = { body: { password: 'test123' } };
      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'E-Mail und Passwort sind erforderlich',
        }),
      );
    });

    it('should return 400 if password is missing', async () => {
      req = { body: { email: 'vendor@test.com' } };
      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 401 if vendor not found', async () => {
      req = { body: { email: 'unknown@test.com', password: 'test123' } };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;

      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ungültige Anmeldedaten' }),
      );
    });

    it('should return 401 if email is not confirmed', async () => {
      req = { body: { email: 'vendor@test.com', password: 'test123' } };
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        password: 'hashed',
        isVendor: true,
        kontakt: {
          email: 'vendor@test.com',
          name: 'Test Vendor',
          newsletterConfirmed: false,
          status: 'pending',
        },
      }) as any;

      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bitte bestätige zuerst deine E-Mail-Adresse, bevor du dich anmeldest',
        }),
      );
    });

    it('should return 401 if password does not match', async () => {
      req = { body: { email: 'vendor@test.com', password: 'wrong' } };
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        password: 'hashed',
        isVendor: true,
        kontakt: {
          email: 'vendor@test.com',
          name: 'Test Vendor',
          newsletterConfirmed: true,
          status: 'aktiv',
        },
      }) as any;
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ungültige Anmeldedaten' }),
      );
    });

    it('should return token and user data on successful login', async () => {
      req = { body: { email: 'vendor@test.com', password: 'correct' } };
      const mockVendor = {
        _id: 'vendor-id',
        password: 'hashed',
        isVendor: true,
        registrationStatus: 'trial_active',
        trialStartDate: new Date('2026-03-01'),
        trialEndDate: new Date('2026-03-31'),
        pendingBooking: null,
        kontakt: {
          email: 'vendor@test.com',
          name: 'Test Vendor',
          newsletterConfirmed: true,
          status: 'aktiv',
        },
      };
      MockedUser.findOne = jest.fn().mockResolvedValue(mockVendor) as any;
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mock-vendor-token');

      await loginVendor(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-vendor-token',
          user: expect.objectContaining({
            email: 'vendor@test.com',
            isVendor: true,
          }),
        }),
      );
    });

    it('should return 500 on server error', async () => {
      req = { body: { email: 'vendor@test.com', password: 'test' } };
      MockedUser.findOne = jest.fn().mockRejectedValue(new Error('DB error')) as any;

      await loginVendor(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('confirmVendorEmail', () => {
    it('should return 400 for empty token', async () => {
      req = { params: { token: '' } };
      await confirmVendorEmail(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ungültiger Bestätigungs-Link' }),
      );
    });

    it('should return 400 for expired token', async () => {
      req = { params: { token: 'expired-token-123' } };
      // First findOne (valid token check) returns null
      // Second findOne (expired check) returns a user
      (MockedUser.findOne as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'vendor-id', isVendor: true });

      await confirmVendorEmail(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Bestätigungs-Link ist abgelaufen. Bitte registrieren Sie sich erneut.',
        }),
      );
    });

    it('should confirm email successfully with valid token', async () => {
      req = { params: { token: 'valid-token-abc' } };
      const mockUser = {
        _id: 'vendor-id',
        isVendor: true,
        registrationStatus: 'preregistered',
        kontakt: {
          email: 'vendor@test.com',
          name: 'Test Vendor',
          newsletterConfirmed: false,
          status: 'pending',
          confirmationToken: 'valid-token-abc',
          tokenExpires: new Date(Date.now() + 86400000),
        },
        pendingBooking: null,
        save: jest.fn().mockResolvedValue(true),
      };
      MockedUser.findOne = jest.fn().mockResolvedValueOnce(mockUser) as any;

      await confirmVendorEmail(req as Request, res as Response);

      expect(mockUser.kontakt.newsletterConfirmed).toBe(true);
      expect(mockUser.kontakt.status).toBe('aktiv');
      expect(mockUser.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          userId: 'vendor-id',
        }),
      );
    });

    it('should return already confirmed for confirmed user', async () => {
      req = { params: { token: 'used-token' } };
      const mockUser = {
        _id: 'vendor-id',
        isVendor: true,
        kontakt: {
          email: 'vendor@test.com',
          newsletterConfirmed: true,
          status: 'aktiv',
          confirmationToken: 'used-token',
          tokenExpires: new Date(Date.now() + 86400000),
        },
        pendingBooking: null,
        save: jest.fn(),
      };
      MockedUser.findOne = jest.fn().mockResolvedValueOnce(mockUser) as any;

      await confirmVendorEmail(req as Request, res as Response);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          alreadyConfirmed: true,
        }),
      );
    });

    it('should return 500 on server error', async () => {
      req = { params: { token: 'valid-token' } };
      MockedUser.findOne = jest.fn().mockRejectedValue(new Error('DB error')) as any;

      await confirmVendorEmail(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('changeVendorPassword', () => {
    it('should return 400 if passwords are missing', async () => {
      req = { body: {}, userId: 'vendor-id' } as any;
      await changeVendorPassword(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 401 if current password is wrong', async () => {
      req = { body: { currentPassword: 'wrong', newPassword: 'NewPass1!' }, userId: 'vendor-id' } as any;
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        password: 'hashed',
        save: jest.fn(),
      }) as any;
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await changeVendorPassword(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Das aktuelle Passwort ist nicht korrekt' }),
      );
    });

    it('should change password successfully', async () => {
      req = { body: { currentPassword: 'correct', newPassword: 'NewPass1!' }, userId: 'vendor-id' } as any;
      const saveMock = jest.fn();
      MockedUser.findById = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        password: 'hashed',
        save: saveMock,
      }) as any;
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await changeVendorPassword(req as Request, res as Response);
      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Passwort erfolgreich geändert' }),
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should return 200 even if user not found (security)', async () => {
      req = { body: { email: 'unknown@test.com' }, ip: '127.0.0.1', headers: {} };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;

      await requestPasswordReset(req as Request, res as Response);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should generate token and return 200 for valid user', async () => {
      req = { body: { email: 'vendor@test.com' }, ip: '127.0.0.1', headers: {} };
      const saveMock = jest.fn().mockResolvedValue(undefined);
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        kontakt: { email: 'vendor@test.com', name: 'Test Vendor' },
        save: saveMock,
      }) as any;

      await requestPasswordReset(req as Request, res as Response);

      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should return 400 for invalid/expired token', async () => {
      req = { body: { token: 'invalid-token', newPassword: 'NewPass1!' } };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;

      await resetPassword(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Ungültiger oder abgelaufener') }),
      );
    });

    it('should reset password successfully with valid token', async () => {
      req = { body: { token: 'valid-token-abc', newPassword: 'NewPass1!' }, ip: '127.0.0.1', headers: {} };
      const saveMock = jest.fn();
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'vendor-id',
        kontakt: { email: 'vendor@test.com', passwordResetToken: 'valid-token-abc', passwordResetExpires: new Date(Date.now() + 3600000) },
        save: saveMock,
      }) as any;
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      await resetPassword(req as Request, res as Response);
      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.stringContaining('erfolgreich zurückgesetzt') }),
      );
    });
  });

  describe('resendConfirmationEmail', () => {
    it('should return 200 even if user not found (security)', async () => {
      req = { body: { email: 'unknown@test.com' } };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;

      await resendConfirmationEmail(req as Request, res as Response);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return success if already confirmed', async () => {
      req = { body: { email: 'vendor@test.com' } };
      MockedUser.findOne = jest.fn().mockResolvedValue({
        kontakt: { email: 'vendor@test.com', name: 'Test', newsletterConfirmed: true, status: 'aktiv' },
      }) as any;

      await resendConfirmationEmail(req as Request, res as Response);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('bereits bestätigt') }),
      );
    });

    it('should generate new token and resend for unconfirmed user', async () => {
      req = { body: { email: 'vendor@test.com' } };
      const saveMock = jest.fn();
      MockedUser.findOne = jest.fn().mockResolvedValue({
        kontakt: { email: 'vendor@test.com', name: 'Test', newsletterConfirmed: false, status: 'pending' },
        save: saveMock,
      }) as any;

      await resendConfirmationEmail(req as Request, res as Response);
      expect(saveMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.stringContaining('Bestätigungslink') }),
      );
    });
  });
});
