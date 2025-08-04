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

/**
 * Interface extending Request with user authentication properties
 * @interface AuthRequest
 * @extends Request
 */
interface AuthRequest extends Request {
  /** Decoded user information from JWT token */
  user?: { id: string; isAdmin?: boolean; isVendor?: boolean; email?: string };
  /** User ID for convenience access */
  userId?: string;
}

/**
 * Standard authentication middleware for JWT token verification
 * @function auth
 * @description Validates JWT token from x-auth-token header and adds user info to request
 * @param {AuthRequest} req - Express request object extended with user properties
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(1)
 * @security Verifies JWT token signature and expiration
 */
export const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  /** Token aus Header holen */
  const token = req.header('x-auth-token');

  /** Prüfen, ob Token existiert */
  if (!token) {
    res.status(401).json({ message: 'Kein Token, Autorisierung verweigert' });
    return;
  }

  try {
    /** Token verifizieren */
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isAdmin?: boolean; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    /** User an Request anhängen */
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
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
  /** Token aus Authorization Header holen (Bearer-Format) oder x-auth-token */
  const authHeader = req.header('Authorization');
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;
  const xAuthToken = req.header('x-auth-token');
  const token = bearerToken || xAuthToken;

  /** Prüfen, ob Token existiert */
  if (!token) {
    res.status(401).json({ message: 'Kein Token, Autorisierung verweigert' });
    return;
  }

  try {
    /** Token verifizieren */
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isAdmin?: boolean; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    /** Prüfe, ob Benutzer Admin ist */
    if (decoded.isAdmin !== true) {
      res.status(403).json({ message: 'Zugriff verweigert. Admin-Rechte erforderlich.' });
      return;
    }
    
    /** User an Request anhängen */
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token ist ungültig' });
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
  /** Token aus Authorization Header holen (Bearer-Format) */
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Kein Token, Autorisierung verweigert' 
    });
    return;
  }

  try {
    /** Token verifizieren */
    const decoded = jwt.verify(token, config.jwtSecret) as { 
      id: string; 
      isVendor?: boolean; 
      email?: string; 
    };
    
    /** Prüfe, ob es ein Vendor-Token ist */
    if (!decoded.isVendor) {
      res.status(403).json({ 
        success: false, 
        message: 'Zugriff nur für Direktvermarkter' 
      });
      return;
    }
    
    /** User an Request anhängen */
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ 
      success: false, 
      message: 'Token ist ungültig' 
    });
  }
};