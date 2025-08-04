/**
 * @file Rate limiting middleware for preventing abuse and DoS attacks
 * @description Provides various rate limiting configurations for different endpoints
 * to prevent abuse, brute force attacks, and API overuse
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response } from 'express';
const rateLimit = require('express-rate-limit');

/**
 * Generic rate limiting error response handler
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void}
 * @complexity O(1)
 * @security Returns standardized error response for rate limit violations
 */
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    retryAfter: 60
  });
};

/**
 * Strict rate limiting for authentication endpoints
 * @description Prevents brute force attacks on login endpoints
 * @security 5 attempts per 15 minutes per IP
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req: any) => {
    // Skip rate limiting for admin setup if no admin exists yet
    if (req.path === '/admin/setup') {
      return false; // Don't skip, still apply rate limiting
    }
    return false;
  }
});

/**
 * Moderate rate limiting for vendor registration
 * @description Prevents spam vendor registrations
 * @security 3 registration attempts per hour per IP
 */
export const vendorRegistrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
  max: 10, // 10 registration attempts per 15 minutes (increased from 3 per hour)
  message: {
    success: false,
    message: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es in 15 Minuten erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiting for email confirmation
 * @description Prevents confirmation token abuse
 * @security 10 confirmation attempts per 5 minutes per IP
 */
export const emailConfirmationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 confirmation attempts per 5 minutes
  message: {
    success: false,
    message: 'Zu viele Bestätigungsversuche. Bitte warten Sie 5 Minuten und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiting for password reset requests
 * @description Prevents password reset spam
 * @security 3 password reset requests per hour per IP
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    success: false,
    message: 'Zu viele Passwort-Zurücksetzen-Anfragen. Bitte warten Sie eine Stunde und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiting for newsletter subscription
 * @description Prevents newsletter spam subscriptions
 * @security 5 subscription attempts per 15 minutes per IP
 */
export const newsletterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 subscription attempts per 15 minutes
  message: {
    success: false,
    message: 'Zu viele Newsletter-Anmeldeversuche. Bitte warten Sie 15 Minuten und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Rate limiting for contact form
 * @description Prevents contact form spam
 * @security 5 contact form submissions per hour per IP
 */
export const contactFormRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 contact form submissions per hour
  message: {
    success: false,
    message: 'Zu viele Kontaktanfragen. Bitte warten Sie eine Stunde und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * General API rate limiting
 * @description Prevents API abuse and DoS attacks
 * @security 1000 requests per 15 minutes per IP
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes (increased from 100)
  message: {
    success: false,
    message: 'Zu viele API-Anfragen. Bitte versuchen Sie es später erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Very strict rate limiting for admin setup
 * @description Prevents unauthorized admin account creation
 * @security 3 admin setup attempts per hour per IP
 */
export const adminSetupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 admin setup attempts per hour
  message: {
    success: false,
    message: 'Zu viele Admin-Setup-Versuche. Bitte warten Sie eine Stunde und versuchen Sie es erneut.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

export default {
  authRateLimit,
  vendorRegistrationRateLimit,
  emailConfirmationRateLimit,
  passwordResetRateLimit,
  newsletterRateLimit,
  contactFormRateLimit,
  apiRateLimit,
  adminSetupRateLimit
};