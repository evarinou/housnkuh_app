/**
 * @file Validation utilities for API inputs and data structures
 * @description Comprehensive validation functions for package data, user inputs, 
 * price adjustments, and additional services with security measures
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Types } from 'mongoose';

/**
 * Valid package types for Mietfach rental units
 * @constant {readonly string[]} VALID_PACKAGE_TYPES
 * @description Array of all valid package type identifiers including legacy IDs
 */
export const VALID_PACKAGE_TYPES = [
  'block-a',
  'block-b', 
  'block-cold',
  'block-frozen',
  'block-table',
  'block-other',
  'block-display',
  'window-small',
  'window-large',
  // Alternative IDs that might be used
  'klein',
  'mittel',
  'gross',
  'verkaufsblock-a',
  'verkaufsblock-b',
  'flexibler-bereich',
  'verkaufsblock-gekuehlt',
  'verkaufsblock-gefroren',
  'verkaufstisch',
  'schaufenster-klein',
  'schaufenster-gross'
] as const;

/**
 * Type representing valid package types
 * @typedef {string} ValidPackageType
 */
export type ValidPackageType = typeof VALID_PACKAGE_TYPES[number];

/**
 * Interface for comment validation results
 * @interface CommentValidationResult
 */
export interface CommentValidationResult {
  /** Whether the comment is valid */
  isValid: boolean;
  /** Error message if validation fails */
  message?: string;
  /** Sanitized comment text */
  sanitizedComment?: string;
}

/**
 * Validates and sanitizes user comments for security and length
 * @function validateComment
 * @description Validates comment length, removes HTML tags, and checks for XSS patterns
 * @param {string | undefined} comment - User comment to validate
 * @returns {CommentValidationResult} Validation result with sanitized comment
 * @complexity O(n) where n is comment length
 * @security Removes HTML tags and detects XSS patterns
 */
export const validateComment = (comment: string | undefined): CommentValidationResult => {
  if (!comment) {
    return { isValid: true, sanitizedComment: undefined };
  }

  const trimmedComment = comment.trim();
  
  if (trimmedComment.length === 0) {
    return { isValid: true, sanitizedComment: undefined };
  }

  if (trimmedComment.length > 500) {
    return {
      isValid: false,
      message: 'Kommentar darf maximal 500 Zeichen lang sein'
    };
  }

  /** Basic XSS prevention - remove HTML tags */
  const sanitizedComment = trimmedComment.replace(/<[^>]*>/g, '');
  
  /** Check for suspicious patterns that might indicate XSS attempts */
  const suspiciousPatterns = [
    /javascript:/i,
    /on\w+\s*=/i,
    /<script/i,
    /data:/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedComment)) {
      return {
        isValid: false,
        message: 'Kommentar enthält nicht erlaubte Zeichen'
      };
    }
  }

  return {
    isValid: true,
    sanitizedComment
  };
};

/**
 * Interface for price adjustment validation results
 * @interface PriceAdjustmentValidationResult
 */
export interface PriceAdjustmentValidationResult {
  /** Whether price adjustments are valid */
  isValid: boolean;
  /** Error message if validation fails */
  message?: string;
  /** Validated and sanitized price adjustments */
  validAdjustments?: Record<string, number>;
}

/**
 * Validates price adjustments for Mietfach rental units
 * @function validatePriceAdjustments
 * @description Validates price adjustments against assigned Mietfach IDs and price constraints
 * @param {Record<string, number> | undefined} priceAdjustments - Price adjustments by Mietfach ID
 * @param {string[]} mietfachIds - Array of assigned Mietfach IDs
 * @returns {PriceAdjustmentValidationResult} Validation result with valid adjustments
 * @complexity O(n) where n is number of price adjustments
 * @security Validates ObjectId format and prevents negative prices
 */
export const validatePriceAdjustments = (
  priceAdjustments: Record<string, number> | undefined,
  mietfachIds: string[]
): PriceAdjustmentValidationResult => {
  if (!priceAdjustments) {
    return { isValid: true, validAdjustments: {} };
  }

  const validAdjustments: Record<string, number> = {};
  const errors: string[] = [];

  for (const [mietfachId, price] of Object.entries(priceAdjustments)) {
    /** Validate Mietfach ID format using MongoDB ObjectId validation */
    if (!Types.ObjectId.isValid(mietfachId)) {
      errors.push(`Ungültige Mietfach-ID: ${mietfachId}`);
      continue;
    }

    /** Check if Mietfach ID is in assigned list to prevent unauthorized access */
    if (!mietfachIds.includes(mietfachId)) {
      errors.push(`Mietfach-ID ${mietfachId} ist nicht in der Zuordnungsliste`);
      continue;
    }

    /** Validate price range and type */
    if (typeof price !== 'number' || isNaN(price)) {
      errors.push(`Ungültiger Preis für Mietfach ${mietfachId}: muss eine Zahl sein`);
      continue;
    }

    if (price < 0) {
      errors.push(`Preis für Mietfach ${mietfachId} darf nicht negativ sein`);
      continue;
    }

    if (price > 1000) {
      errors.push(`Preis für Mietfach ${mietfachId} darf nicht über 1000€ liegen`);
      continue;
    }

    // Round to 2 decimal places
    validAdjustments[mietfachId] = Math.round(price * 100) / 100;
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      message: errors.join('; ')
    };
  }

  return {
    isValid: true,
    validAdjustments
  };
};

/**
 * Interface for package data validation results
 * @interface PackageDataValidationResult
 * @description Contains validation results for package data structures
 */
export interface PackageDataValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates package data structure and constraints
 * @function validatePackageData
 * @description Comprehensive validation of package data including required fields,
 * package options, rental duration, and cost structure
 * @param {any} packageData - Package data object to validate
 * @returns {PackageDataValidationResult} Validation result with error messages
 * @complexity O(n) where n is number of package options
 * @security Validates package types against whitelist, prevents invalid pricing
 */
export const validatePackageData = (packageData: any): PackageDataValidationResult => {
  if (!packageData || typeof packageData !== 'object') {
    return {
      isValid: false,
      message: 'Package-Daten sind erforderlich'
    };
  }

  // Required fields
  const requiredFields = [
    'selectedProvisionType',
    'packageOptions',
    'rentalDuration',
    'totalCost'
  ];
  
  // Optional but expected fields
  const optionalFields = ['packageCounts', 'zusatzleistungen', 'discount'];

  for (const field of requiredFields) {
    if (!(field in packageData)) {
      return {
        isValid: false,
        message: `Fehlendes Feld in Package-Daten: ${field}`
      };
    }
  }

  // Validate packageOptions structure
  if (!Array.isArray(packageData.packageOptions)) {
    return {
      isValid: false,
      message: 'packageOptions muss ein Array sein'
    };
  }

  // Validate each package option
  for (const packageOption of packageData.packageOptions) {
    if (!packageOption.id || !VALID_PACKAGE_TYPES.includes(packageOption.id as ValidPackageType)) {
      return {
        isValid: false,
        message: `Ungültiger Package-Typ: ${packageOption.id}. Erlaubte Typen sind: ${VALID_PACKAGE_TYPES.join(', ')}`
      };
    }

    if (typeof packageOption.price !== 'number' || packageOption.price < 0) {
      return {
        isValid: false,
        message: `Ungültiger Preis für Package ${packageOption.id}`
      };
    }
  }

  // Validate rental duration
  if (typeof packageData.rentalDuration !== 'number' || 
      packageData.rentalDuration < 1 || 
      packageData.rentalDuration > 24) {
    return {
      isValid: false,
      message: 'Mietdauer muss zwischen 1 und 24 Monaten liegen'
    };
  }

  // Validate packageCounts if provided
  if (packageData.packageCounts) {
    if (typeof packageData.packageCounts !== 'object') {
      return {
        isValid: false,
        message: 'packageCounts muss ein Objekt sein'
      };
    }
    
    // Ensure at least one package is selected
    const hasSelectedPackages = Object.values(packageData.packageCounts).some(count => Number(count) > 0);
    if (!hasSelectedPackages) {
      return {
        isValid: false,
        message: 'Mindestens ein Mietfach muss ausgewählt werden'
      };
    }
  }

  // Validate total cost structure
  if (!packageData.totalCost || typeof packageData.totalCost !== 'object') {
    return {
      isValid: false,
      message: 'totalCost Struktur ist erforderlich'
    };
  }

  const costFields = ['monthly', 'provision'];
  const optionalCostFields = ['oneTime'];
  
  for (const field of costFields) {
    if (typeof packageData.totalCost[field] !== 'number' || packageData.totalCost[field] < 0) {
      return {
        isValid: false,
        message: `Ungültiger ${field} Kostenwert`
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates email address format
 * @function validateEmail
 * @description Validates email using standard email regex pattern
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 * @complexity O(1)
 * @security Basic email format validation
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates German postal code format
 * @function validatePLZ
 * @description Validates German postal code (5 digits)
 * @param {string} plz - Postal code to validate
 * @returns {boolean} True if PLZ format is valid
 * @complexity O(1)
 * @security Basic format validation
 */
export const validatePLZ = (plz: string): boolean => {
  const plzRegex = /^\d{5}$/;
  return plzRegex.test(plz);
};

/**
 * Validates German phone number format
 * @function validatePhoneNumber
 * @description Validates German phone numbers in various formats including international
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone format is valid
 * @complexity O(1)
 * @security Basic format validation with length constraints
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  // Allow German phone numbers in various formats
  const phoneRegex = /^(?:\+49|0049|0)[1-9][0-9]{1,14}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\/]/g, '');
  
  // Allow some flexibility for international numbers
  if (cleanPhone.length < 6 || cleanPhone.length > 20) {
    return false;
  }
  
  return phoneRegex.test(cleanPhone) || /^\+[1-9][0-9]{6,19}$/.test(cleanPhone);
};

/**
 * Interface for additional services validation results
 * @interface ZusatzleistungenValidationResult
 * @description Contains validation results for additional services (Zusatzleistungen)
 */
export interface ZusatzleistungenValidationResult {
  isValid: boolean;
  message?: string;
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
  };
  zusatzleistungen_kosten?: {
    lagerservice_monatlich: number;
    versandservice_monatlich: number;
  };
}

/**
 * Validates additional services (Zusatzleistungen) configuration
 * @function validateZusatzleistungen
 * @description Validates additional services are only available with premium provision type
 * and calculates appropriate pricing for storage and shipping services
 * @param {any} packageData - Package data containing provision type and services
 * @param {any} zusatzleistungenData - Optional additional services data
 * @returns {ZusatzleistungenValidationResult} Validation result with services and pricing
 * @complexity O(1)
 * @security Enforces premium-only access to additional services
 */
export const validateZusatzleistungen = (
  packageData: any,
  zusatzleistungenData?: any
): ZusatzleistungenValidationResult => {
  // Import pricing constants from Vertrag model
  const { ZUSATZLEISTUNGEN_PREISE } = require('../models/Vertrag');
  
  // Basis-Validierung: Nur bei Premium-Modell erlaubt
  const isPremium = packageData?.selectedProvisionType === 'premium';
  const hasZusatzleistungen = packageData?.zusatzleistungen && 
    (packageData.zusatzleistungen.lagerservice || packageData.zusatzleistungen.versandservice);
  
  if (hasZusatzleistungen && !isPremium) {
    return {
      isValid: false,
      message: 'Zusatzleistungen sind nur mit dem Premium-Provisionsmodell (7%) verfügbar'
    };
  }
  
  // Keine Zusatzleistungen - gültiger Fall
  if (!hasZusatzleistungen) {
    return { isValid: true };
  }
  
  // Zusatzleistungen verarbeiten
  const zusatzleistungen = {
    lagerservice: Boolean(packageData.zusatzleistungen.lagerservice),
    versandservice: Boolean(packageData.zusatzleistungen.versandservice)
  };
  
  const zusatzleistungen_kosten = {
    lagerservice_monatlich: zusatzleistungen.lagerservice ? ZUSATZLEISTUNGEN_PREISE.lagerservice : 0,
    versandservice_monatlich: zusatzleistungen.versandservice ? ZUSATZLEISTUNGEN_PREISE.versandservice : 0
  };
  
  return {
    isValid: true,
    zusatzleistungen,
    zusatzleistungen_kosten
  };
};