/**
 * @file useVendorRegistration.test.ts
 * @purpose Unit tests for useVendorRegistration hook, particularly structured error handling
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import axios, { AxiosError } from 'axios';
import { useVendorRegistration } from './useVendorRegistration';
import * as authUtils from '../utils/auth';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock auth utils
jest.mock('../utils/auth');
const mockedAuthUtils = authUtils as jest.Mocked<typeof authUtils>;

describe('useVendorRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAuthUtils as any).apiUtils = {
      getApiUrl: jest.fn().mockReturnValue('http://localhost:5000')
    };
    
    // Mock axios.isAxiosError to return true for our mocks
    (mockedAxios.isAxiosError as any) = jest.fn().mockImplementation((error: any) => {
      return error && error.isAxiosError === true;
    });
  });

  describe('registerWithBooking', () => {
    const registrationData = {
      email: 'test@eva.com',
      password: 'Test123!',
      confirmPassword: 'Test123!',
      name: 'Eva-Maria Schaller',
      telefon: '012765r324',
      unternehmen: 'Test',
      strasse: 'TestTest',
      hausnummer: '123',
      plz: '96317',
      ort: 'Test',
      agreeToTerms: true,
      agreeToPrivacy: true,
      packageData: {
        selectedProvisionType: 'premium',
        packageCounts: { 'block-b': 2 },
        packageOptions: [],
        rentalDuration: 12,
        totalCost: { monthly: 45, oneTime: 0, provision: 7 },
        discount: 0.1,
        zusatzleistungen: { lagerservice: true, versandservice: false }
      }
    };

    it('should handle successful registration', async () => {
      const successResponse = {
        data: {
          success: true,
          message: 'Registration successful',
          userId: 'user123'
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(successResponse);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: true,
        message: 'Registration successful',
        userId: 'user123'
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/vendor-auth/register',
        registrationData
      );
    });

    it('should handle structured validation errors', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {
          success: false,
          message: 'Validierungsfehler',
          errors: [
            {
              field: 'telefon',
              message: 'Telefonnummer darf nur Ziffern, +, -, Leerzeichen und Klammern enthalten'
            }
          ]
        }
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: false,
        message: 'Bitte korrigiere die markierten Felder',
        fieldErrors: {
          telefon: 'Telefonnummer darf nur Ziffern, +, -, Leerzeichen und Klammern enthalten'
        }
      });
    });

    it('should handle multiple field validation errors', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {
          success: false,
          message: 'Validierungsfehler',
          errors: [
            {
              field: 'email',
              message: 'Ungültige E-Mail-Adresse'
            },
            {
              field: 'telefon', 
              message: 'Telefonnummer darf nur Ziffern, +, -, Leerzeichen und Klammern enthalten'
            }
          ]
        }
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: false,
        message: 'Bitte korrigiere die markierten Felder',
        fieldErrors: {
          email: 'Ungültige E-Mail-Adresse',
          telefon: 'Telefonnummer darf nur Ziffern, +, -, Leerzeichen und Klammern enthalten'
        }
      });
    });

    it('should handle simple error messages without structured errors', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {
          success: false,
          message: 'E-Mail bereits registriert'
        }
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: false,
        message: 'E-Mail bereits registriert',
        fieldErrors: undefined
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: false,
        message: 'Verbindungsfehler. Bitte versuche es später erneut.',
        fieldErrors: undefined
      });
    });

    it('should ignore non-field validation errors', async () => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: {
          success: false,
          message: 'Validierungsfehler',
          errors: [
            {
              field: 'email',
              message: 'Ungültige E-Mail-Adresse'
            }
          ]
        }
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const { result } = renderHook(() => useVendorRegistration());

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.registerWithBooking(registrationData);
      });

      expect(registrationResult).toEqual({
        success: false,
        message: 'Bitte korrigiere die markierten Felder',
        fieldErrors: {
          email: 'Ungültige E-Mail-Adresse'
        }
      });
    });

    it('should set loading states correctly', async () => {
      const successResponse = {
        data: { success: true, message: 'Success' }
      };
      
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(successResponse), 100))
      );

      const { result } = renderHook(() => useVendorRegistration());

      expect(result.current.isRegistering).toBe(false);

      let promise: Promise<any>;
      act(() => {
        promise = result.current.registerWithBooking(registrationData);
      });

      // Should be loading during registration
      expect(result.current.isRegistering).toBe(true);

      await act(async () => {
        await promise;
      });

      // Should not be loading after completion
      expect(result.current.isRegistering).toBe(false);
    });
  });
});