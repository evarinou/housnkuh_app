/**
 * @file validation.test.ts
 * @purpose Unit tests for shared validation constants
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS,
  PASSWORD_ERROR_MESSAGES
} from './validation';

describe('Shared Validation Constants', () => {
  describe('PASSWORD_MIN_LENGTH', () => {
    it('should be defined as number', () => {
      expect(typeof PASSWORD_MIN_LENGTH).toBe('number');
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });
  });

  describe('PASSWORD_REGEX', () => {
    it('should be defined as RegExp', () => {
      expect(PASSWORD_REGEX).toBeInstanceOf(RegExp);
    });

    it('should validate valid passwords', () => {
      const validPasswords = [
        'Password1!',
        'MySecret123@',
        'ComplexPass9$',
        'Test123456*',
        'Abc123!@#$%'
      ];

      validPasswords.forEach(password => {
        expect(PASSWORD_REGEX.test(password)).toBe(true);
      });
    });

    it('should reject invalid passwords', () => {
      const invalidPasswords = [
        'password',       // no uppercase, no digit, no special char
        'PASSWORD',       // no lowercase, no digit, no special char  
        'Password',       // no digit, no special char
        'Password1',      // no special char
        'Password!',      // no digit
        'pass1!',         // no uppercase
        '12345678!',      // no letters
        'Password1#',     // invalid special char
        ''                // empty
      ];

      invalidPasswords.forEach(password => {
        expect(PASSWORD_REGEX.test(password)).toBe(false);
      });
    });
  });

  describe('PASSWORD_REQUIREMENTS', () => {
    it('should have all required properties', () => {
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('minLength', 8);
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('requireUppercase', true);
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('requireLowercase', true);
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('requireNumber', true);
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('requireSpecialChar', true);
      expect(PASSWORD_REQUIREMENTS).toHaveProperty('allowedSpecialChars', '@$!%*?&');
    });

    it('should reference PASSWORD_MIN_LENGTH', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(PASSWORD_MIN_LENGTH);
    });
  });

  describe('PASSWORD_ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(PASSWORD_ERROR_MESSAGES).toHaveProperty('tooShort');
      expect(PASSWORD_ERROR_MESSAGES).toHaveProperty('missingUppercase');
      expect(PASSWORD_ERROR_MESSAGES).toHaveProperty('missingLowercase');
      expect(PASSWORD_ERROR_MESSAGES).toHaveProperty('missingNumber');
      expect(PASSWORD_ERROR_MESSAGES).toHaveProperty('missingSpecialChar');
    });

    it('should contain PASSWORD_MIN_LENGTH in tooShort message', () => {
      expect(PASSWORD_ERROR_MESSAGES.tooShort).toContain('8');
      expect(PASSWORD_ERROR_MESSAGES.tooShort).toContain('Zeichen');
    });

    it('should have German error messages', () => {
      expect(PASSWORD_ERROR_MESSAGES.missingUppercase).toContain('Großbuchstabe');
      expect(PASSWORD_ERROR_MESSAGES.missingLowercase).toContain('Kleinbuchstabe');
      expect(PASSWORD_ERROR_MESSAGES.missingNumber).toContain('Zahl');
      expect(PASSWORD_ERROR_MESSAGES.missingSpecialChar).toContain('Sonderzeichen');
      expect(PASSWORD_ERROR_MESSAGES.missingSpecialChar).toContain('@$!%*?&');
    });
  });
});