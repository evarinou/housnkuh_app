"use strict";
/**
 * @file validation.ts
 * @purpose Shared validation constants between frontend and backend
 * @created 2025-08-06
 * @modified 2025-08-06
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_ERROR_MESSAGES = exports.PASSWORD_REQUIREMENTS = exports.PASSWORD_REGEX = exports.PASSWORD_MIN_LENGTH = void 0;
/** Minimum password length requirement */
exports.PASSWORD_MIN_LENGTH = 8;
/**
 * Password regex pattern requiring:
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character from @$!%*?&
 * - Only allows alphanumeric and specified special characters
 */
exports.PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
/**
 * Password requirements object for programmatic access
 */
exports.PASSWORD_REQUIREMENTS = {
    minLength: exports.PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    allowedSpecialChars: '@$!%*?&'
};
/**
 * Localized password error messages for German UI
 */
exports.PASSWORD_ERROR_MESSAGES = {
    tooShort: `Das Passwort muss mindestens ${exports.PASSWORD_MIN_LENGTH} Zeichen lang sein`,
    missingUppercase: 'Mindestens ein Großbuchstabe erforderlich',
    missingLowercase: 'Mindestens ein Kleinbuchstabe erforderlich',
    missingNumber: 'Mindestens eine Zahl erforderlich',
    missingSpecialChar: 'Mindestens ein Sonderzeichen (@$!%*?&) erforderlich'
};
