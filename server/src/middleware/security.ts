/**
 * @file Security middleware for application protection
 * @description Comprehensive security middleware including CSP, input sanitization, 
 * rate limiting, and security headers
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger from '../utils/logger';

/**
 * Content Security Policy configuration
 * @constant {object} cspConfig
 * @description CSP rules to prevent XSS and injection attacks
 * @security Defines allowed sources for various content types
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'none'"],
    workerSrc: ["'none'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
};

/**
 * Security headers middleware using Helmet.js
 * @constant {function} securityHeaders
 * @description Applies comprehensive security headers to all responses
 * @security Enables HSTS, CSP, XSS protection, and other security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? cspConfig : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true
});

/**
 * Input sanitization middleware for XSS protection
 * @function sanitizeInput
 * @description Sanitizes all input data to prevent XSS attacks
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(n) where n is input size
 * @security Removes script tags, event handlers, and malicious patterns
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove script tags and common XSS patterns
      return value
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '');
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };

  try {
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error', { error: (error as any).message });
    res.status(400).json({ error: 'Invalid input format' });
  }
};

/**
 * Rate limiting middleware factory
 * @function createRateLimiter
 * @description Creates a rate limiter with configurable window and limits
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 * @param {string} message - Error message for rate limit exceeded
 * @returns {function} Rate limiting middleware function
 * @complexity O(1) per request
 * @security Prevents brute force attacks and API abuse
 */
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    let clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      requests.set(clientId, clientData);
    }
    
    clientData.count++;
    
    if (clientData.count > max) {
      logger.warn('Rate limit exceeded', { 
        clientId, 
        count: clientData.count,
        limit: max,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({ error: message });
      return;
    }
    
    next();
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.request(req, res, responseTime);
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(statusCode).json({ error: message });
};

// Security audit middleware
export const auditSecurity = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.audit(action, userId, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
  };
};