// Validation utilities for API inputs
import { Types } from 'mongoose';

// Package type validation
export const VALID_PACKAGE_TYPES = [
  'block-a',
  'block-b', 
  'block-cold',
  'block-frozen',
  'block-table',
  'block-other',
  'block-display'
] as const;

export type ValidPackageType = typeof VALID_PACKAGE_TYPES[number];

// Comment validation
export interface CommentValidationResult {
  isValid: boolean;
  message?: string;
  sanitizedComment?: string;
}

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

  // Basic XSS prevention - remove HTML tags
  const sanitizedComment = trimmedComment.replace(/<[^>]*>/g, '');
  
  // Check for suspicious patterns
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

// Price adjustment validation
export interface PriceAdjustmentValidationResult {
  isValid: boolean;
  message?: string;
  validAdjustments?: Record<string, number>;
}

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
    // Validate Mietfach ID format
    if (!Types.ObjectId.isValid(mietfachId)) {
      errors.push(`Ungültige Mietfach-ID: ${mietfachId}`);
      continue;
    }

    // Check if Mietfach ID is in assigned list
    if (!mietfachIds.includes(mietfachId)) {
      errors.push(`Mietfach-ID ${mietfachId} ist nicht in der Zuordnungsliste`);
      continue;
    }

    // Validate price range
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

// Package data structure validation
export interface PackageDataValidationResult {
  isValid: boolean;
  message?: string;
}

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
        message: `Ungültiger Package-Typ: ${packageOption.id}`
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

  // Validate total cost structure
  if (!packageData.totalCost || typeof packageData.totalCost !== 'object') {
    return {
      isValid: false,
      message: 'totalCost Struktur ist erforderlich'
    };
  }

  const costFields = ['monthly', 'oneTime', 'provision'];
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

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// German postal code validation
export const validatePLZ = (plz: string): boolean => {
  const plzRegex = /^\d{5}$/;
  return plzRegex.test(plz);
};

// Phone number validation (German format)
export const validatePhoneNumber = (phone: string): boolean => {
  // Allow German phone numbers in various formats
  const phoneRegex = /^(?:\+49|0)[1-9][0-9]{1,14}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone);
};