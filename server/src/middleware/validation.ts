/**
 * @file Input validation middleware for request data validation
 * @description Provides comprehensive input validation for all API endpoints
 * using express-validator with custom validation rules and error handling
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Request, Response, NextFunction } from 'express';
const { body, param, validationResult } = require('express-validator');

/** Password validation rules */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

/** Email validation rules */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Username validation rules */
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Handles validation errors and returns formatted error response
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * @complexity O(n) where n is number of validation errors
 * @security Sanitizes error messages to prevent information disclosure
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  // Debug log for setup endpoint
  if (req.url.includes('setup')) {
    console.log('Setup validation - Request body:', req.body);
    console.log('Setup validation - Errors:', errors.array());
  }
  
  if (!errors.isEmpty()) {
    const logger = require('../utils/logger').default;
    logger.error('Validation errors:', {
      url: req.url,
      method: req.method,
      body: req.body,
      errors: errors.array()
    });
    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: errors.array().map((error: any) => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg
      }))
    });
  }
  next();
};

/**
 * Admin login validation middleware
 * @description Validates admin login credentials with secure requirements
 * @security Enforces strong password requirements and username format
 */
export const validateAdminLogin = [
  body('username')
    .trim()
    .isLength({ min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })
    .withMessage(`Benutzername muss zwischen ${USERNAME_MIN_LENGTH} und ${USERNAME_MAX_LENGTH} Zeichen lang sein`)
    .matches(USERNAME_REGEX)
    .withMessage('Benutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten')
    .escape(),
  
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`)
    .matches(PASSWORD_REGEX)
    .withMessage('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
  
  handleValidationErrors
];

/**
 * Admin setup validation middleware
 * @description Validates admin account creation with comprehensive requirements
 * @security Enforces strong credentials and validates setup key
 */
export const validateAdminSetup = [
  body('username')
    .trim()
    .isLength({ min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })
    .withMessage(`Benutzername muss zwischen ${USERNAME_MIN_LENGTH} und ${USERNAME_MAX_LENGTH} Zeichen lang sein`)
    .matches(USERNAME_REGEX)
    .withMessage('Benutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten')
    .escape(),
  
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`)
    .matches(PASSWORD_REGEX)
    .withMessage('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name muss zwischen 2 und 100 Zeichen lang sein')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich')
    .matches(EMAIL_REGEX)
    .withMessage('E-Mail-Format ist ungültig')
    .normalizeEmail(),
  
  body('setupKey')
    .notEmpty()
    .withMessage('Setup-Schlüssel ist erforderlich')
    .isLength({ min: 8 })
    .withMessage('Setup-Schlüssel muss mindestens 8 Zeichen lang sein'),
  
  handleValidationErrors
];

/**
 * Vendor registration validation middleware
 * @description Validates vendor registration form with business requirements
 * @security Validates address, contact info, and business description
 */
export const validateVendorRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name muss zwischen 2 und 100 Zeichen lang sein')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich')
    .matches(EMAIL_REGEX)
    .withMessage('E-Mail-Format ist ungültig')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`)
    .matches(PASSWORD_REGEX)
    .withMessage('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
  
  body('telefon')
    .optional()
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('Telefonnummer muss zwischen 6 und 20 Zeichen lang sein')
    .matches(/^[0-9+\-\s\(\)]+$/)
    .withMessage('Telefonnummer darf nur Ziffern, +, -, Leerzeichen und Klammern enthalten'),
  
  body('strasse')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Straße muss zwischen 5 und 100 Zeichen lang sein')
    .escape(),
  
  body('hausnummer')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Hausnummer muss zwischen 1 und 10 Zeichen lang sein')
    .escape(),
  
  body('plz')
    .trim()
    .isPostalCode('DE')
    .withMessage('Gültige deutsche Postleitzahl erforderlich'),
  
  body('ort')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ort muss zwischen 2 und 50 Zeichen lang sein')
    .escape(),
  
  body('unternehmen')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Unternehmen darf maximal 100 Zeichen lang sein')
    .escape(),
  
  body('beschreibung')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Beschreibung darf maximal 500 Zeichen lang sein')
    .escape(),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags müssen als Array übermittelt werden'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Jeder Tag muss zwischen 1 und 30 Zeichen lang sein')
    .escape(),
  
  handleValidationErrors
];

/**
 * Email confirmation validation middleware for URL parameters
 * @description Validates email confirmation token format and security from URL params
 * @security Ensures token is properly formatted and alphanumeric
 */
export const validateEmailConfirmationParam = [
  param('token')
    .trim()
    .isLength({ min: 32, max: 64 })
    .withMessage('Token muss zwischen 32 und 64 Zeichen lang sein')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Token darf nur alphanumerische Zeichen enthalten')
    .escape(),
  
  handleValidationErrors
];

/**
 * Email confirmation validation middleware for body parameters
 * @description Validates email confirmation token format and security from request body
 * @security Ensures token is properly formatted and alphanumeric
 */
export const validateEmailConfirmation = [
  body('token')
    .trim()
    .isLength({ min: 32, max: 64 })
    .withMessage('Token muss zwischen 32 und 64 Zeichen lang sein')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Token darf nur alphanumerische Zeichen enthalten')
    .escape(),
  
  handleValidationErrors
];

/**
 * Newsletter subscription validation middleware
 * @description Validates newsletter subscription email format
 * @security Ensures valid email format and normalizes email
 */
export const validateNewsletterSubscription = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich')
    .matches(EMAIL_REGEX)
    .withMessage('E-Mail-Format ist ungültig')
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Contact form validation middleware
 * @description Validates contact form submission with spam protection
 * @security Validates name, email, and message content
 */
export const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name muss zwischen 2 und 100 Zeichen lang sein')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich')
    .matches(EMAIL_REGEX)
    .withMessage('E-Mail-Format ist ungültig')
    .normalizeEmail(),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Nachricht muss zwischen 10 und 1000 Zeichen lang sein')
    .escape(),
  
  handleValidationErrors
];

/**
 * Password reset validation middleware
 * @description Validates password reset request email format
 * @security Ensures valid email format for password reset
 */
export const validatePasswordReset = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Gültige E-Mail-Adresse erforderlich')
    .matches(EMAIL_REGEX)
    .withMessage('E-Mail-Format ist ungültig')
    .normalizeEmail(),
  
  handleValidationErrors
];

/**
 * Password reset token validation middleware
 * @description Validates password reset token and new password requirements
 * @security Ensures secure token format and strong password requirements
 */
export const validatePasswordResetToken = [
  body('token')
    .trim()
    .isLength({ min: 32, max: 64 })
    .withMessage('Token muss zwischen 32 und 64 Zeichen lang sein')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Token darf nur alphanumerische Zeichen enthalten')
    .escape(),
  
  body('newPassword')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`)
    .matches(PASSWORD_REGEX)
    .withMessage('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
  
  handleValidationErrors
];

export default {
  validateAdminLogin,
  validateAdminSetup,
  validateVendorRegistration,
  validateEmailConfirmation,
  validateEmailConfirmationParam,
  validateNewsletterSubscription,
  validateContactForm,
  validatePasswordReset,
  validatePasswordResetToken,
  handleValidationErrors
};