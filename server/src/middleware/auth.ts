/**
 * @file Authentication middleware for JWT token verification
 * @description Middleware functions for authenticating users, admins, and vendors using JWT tokens
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { unauthorized, forbidden } from '../utils/apiResponse';

/**
 * Interface extending Request with user authentication properties
 * @interface AuthRequest
 * @extends Request
 */
export interface AuthRequest extends Request {
  /** Decoded user information from JWT token */
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
  /** User ID for convenience access */
  userId?: string;
}

/** Decoded JWT payload shape */
interface JwtPayload {
  id: string;
  isAdmin?: boolean;
  isVendor?: boolean;
  email?: string;
}

/**
 * Extract Bearer token from Authorization header, falling back to x-auth-token
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return req.header('x-auth-token') || null;
};

/**
 * Standard authentication middleware for JWT token verification
 */
export const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  if (!token) {
    unauthorized(res, 'Kein Token, Autorisierung verweigert');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    unauthorized(res, 'Token ist ungültig');
  }
};

/**
 * Admin authentication middleware with role validation
 * @function adminAuth
 * @description Validates JWT token and ensures user has admin privileges
 * @param {AuthRequest} req - Express request object extended with user properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(1)
 * @security Verifies JWT token and validates admin role before granting access
 */
export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  if (!token) {
    unauthorized(res, 'Kein Token, Autorisierung verweigert');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (decoded.isAdmin !== true) {
      forbidden(res, 'Zugriff verweigert. Admin-Rechte erforderlich.');
      return;
    }

    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    unauthorized(res, 'Token ist ungültig');
  }
};

/**
 * Vendor authentication middleware with role validation
 * @function vendorAuth
 * @description Validates JWT token and ensures user has vendor privileges
 * @param {AuthRequest} req - Express request object extended with user properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(1)
 * @security Verifies JWT token and validates vendor role before granting access
 */
export const vendorAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  if (!token) {
    unauthorized(res, 'Kein Token, Autorisierung verweigert');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (!decoded.isVendor) {
      forbidden(res, 'Zugriff nur für Direktvermarkter');
      return;
    }

    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    unauthorized(res, 'Token ist ungültig');
  }
};