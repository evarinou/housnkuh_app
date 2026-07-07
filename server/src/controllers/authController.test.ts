/**
 * @file authController.test.ts
 * @purpose Unit tests for admin authentication (login, setupAdmin)
 * @created 2026-03-29
 */

const mockSave = jest.fn();
jest.mock('../models/User', () => {
  const MockUser: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    _id: 'new-admin-id',
    save: mockSave,
  }));
  MockUser.findOne = jest.fn();
  MockUser.collection = { dropIndex: jest.fn() };
  return { __esModule: true, default: MockUser };
});
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../config/config', () => ({ jwtSecret: 'test-secret' }));
jest.mock('../utils/securityLogger', () => ({
  __esModule: true,
  default: {
    logLoginAttempt: jest.fn(),
    logAdminSetup: jest.fn(),
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
import { login, setupAdmin } from './authController';
import User from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const MockedUser = User as jest.Mocked<typeof User>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('authController', () => {
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

  describe('login', () => {
    it('should return 400 if username is missing', async () => {
      req = { body: { password: 'test123' } };
      await login(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 if password is missing', async () => {
      req = { body: { username: 'admin' } };
      await login(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 401 if user not found', async () => {
      req = { body: { username: 'admin', password: 'test123' } };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;

      await login(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ungültige Anmeldeinformationen' }),
      );
    });

    it('should return 401 if password does not match', async () => {
      req = { body: { username: 'admin', password: 'wrong' } };
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'user-id',
        username: 'admin',
        password: 'hashed',
        isAdmin: true,
        kontakt: { name: 'Admin' },
      }) as any;
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user is not admin', async () => {
      req = { body: { username: 'user', password: 'test123' } };
      MockedUser.findOne = jest.fn().mockResolvedValue({
        _id: 'user-id',
        username: 'user',
        password: 'hashed',
        isAdmin: false,
        kontakt: { name: 'Regular User' },
      }) as any;
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await login(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Keine Administratorrechte' }),
      );
    });

    it('should return token and user data on successful login', async () => {
      req = { body: { username: 'admin', password: 'correct' } };
      const mockUser = {
        _id: 'admin-id',
        username: 'admin',
        password: 'hashed',
        isAdmin: true,
        kontakt: { name: 'Admin User' },
      };
      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser) as any;
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      await login(req as Request, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            username: 'admin',
            isAdmin: true,
          }),
        }),
      );
    });

    it('should forward AppError(500) to error handler on server error', async () => {
      req = { body: { username: 'admin', password: 'test' } };
      MockedUser.findOne = jest.fn().mockRejectedValue(new Error('DB error')) as any;

      await login(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 500,
        message: 'Serverfehler bei der Anmeldung'
      }));
    });
  });

  describe('setupAdmin', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, ADMIN_SETUP_KEY: 'valid-key' };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return 400 if admin already exists', async () => {
      req = {
        body: {
          username: 'admin',
          password: 'pw',
          name: 'A',
          email: 'a@b.c',
          setupKey: 'valid-key',
        },
      };
      MockedUser.findOne = jest.fn().mockResolvedValue({ isAdmin: true }) as any;
      // Mock collection.dropIndex to not throw
      MockedUser.collection = { dropIndex: jest.fn().mockResolvedValue(undefined) } as any;

      await setupAdmin(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Admin-Account existiert bereits' }),
      );
    });

    it('should return 401 if setup key is invalid', async () => {
      req = {
        body: {
          username: 'admin',
          password: 'pw',
          name: 'A',
          email: 'a@b.c',
          setupKey: 'wrong-key',
        },
      };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;
      MockedUser.collection = { dropIndex: jest.fn().mockResolvedValue(undefined) } as any;

      await setupAdmin(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ungültiger Setup-Schlüssel' }),
      );
    });

    it('should return 400 if required fields are missing', async () => {
      req = { body: { username: 'admin', setupKey: 'valid-key' } };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;
      MockedUser.collection = { dropIndex: jest.fn().mockResolvedValue(undefined) } as any;

      await setupAdmin(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Alle Felder sind erforderlich' }),
      );
    });

    it('should create admin successfully with valid data', async () => {
      req = {
        body: {
          username: 'newadmin',
          password: 'secure123',
          name: 'New Admin',
          email: 'admin@test.com',
          setupKey: 'valid-key',
        },
      };
      MockedUser.findOne = jest.fn().mockResolvedValue(null) as any;
      MockedUser.collection = { dropIndex: jest.fn().mockResolvedValue(undefined) } as any;
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock the save method on the instance created by new User()
      mockSave.mockResolvedValue({
        _id: 'new-admin-id',
        username: 'newadmin',
        kontakt: { name: 'New Admin' },
      });

      await setupAdmin(req as Request, res as Response, next);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Admin-Account erfolgreich erstellt',
        }),
      );
    });
  });
});
