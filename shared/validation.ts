/**
 * @file validation.ts
 * @purpose Shared validation constants between frontend and backend
 * @created 2025-08-06
 * @modified 2025-08-06
 */

/** Minimum password length requirement */
export const PASSWORD_MIN_LENGTH = 8;

/** 
 * Password regex pattern requiring:
 * - At least one lowercase letter
 * - At least one uppercase letter 
 * - At least one digit
 * - At least one special character from @$!%*?&
 * - Only allows alphanumeric and specified special characters
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

/** 
 * Password requirements object for programmatic access
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  allowedSpecialChars: '@$!%*?&'
};

/** 
 * Localized password error messages for German UI
 */
export const PASSWORD_ERROR_MESSAGES = {
  tooShort: `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`,
  missingUppercase: 'Mindestens ein Großbuchstabe erforderlich',
  missingLowercase: 'Mindestens ein Kleinbuchstabe erforderlich', 
  missingNumber: 'Mindestens eine Zahl erforderlich',
  missingSpecialChar: 'Mindestens ein Sonderzeichen (@$!%*?&) erforderlich'
};