/**
 * @file useVendorRegistration - Registration service hook for vendor management
 * @description Extracted registration logic from VendorAuthContext for better separation of concerns.
 * Handles vendor registration with booking and pre-registration flows.
 * 
 * @author Sprint 32 - VendorAuthContext Refactoring
 * @version 1.0.0
 */

import { useCallback, useState } from 'react';
import axios from 'axios';
import { apiUtils } from '../utils/auth';

/**
 * Registration data interface
 * @description Defines the structure for vendor registration data
 */
export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: any;
  packageData?: any;
  businessInfo?: any;
  [key: string]: any;
}

/**
 * Registration result interface
 * @description Defines the structure for registration operation results
 */
export interface RegistrationResult {
  success: boolean;
  message?: string;
  userId?: string;
  openingInfo?: any;
}

/**
 * useVendorRegistration hook interface
 * @description Defines the public interface for the vendor registration service
 */
export interface UseVendorRegistration {
  registerWithBooking: (data: RegistrationData) => Promise<RegistrationResult>;
  preRegisterVendor: (data: RegistrationData) => Promise<RegistrationResult>;
  isRegistering: boolean;
  registrationError: string | null;
}

/**
 * useVendorRegistration hook
 * @description Custom hook that provides vendor registration functionality
 * extracted from VendorAuthContext for better separation of concerns.
 * 
 * Features:
 * - Register vendor with booking data
 * - Pre-register vendor before store opening
 * - Loading state management
 * - Error handling
 * 
 * @returns {UseVendorRegistration} Registration service interface
 */
export const useVendorRegistration = (): UseVendorRegistration => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  /**
   * Register vendor with booking data
   * @description Complete vendor registration with package booking information.
   * This function handles the full registration flow including payment processing.
   * 
   * @param {RegistrationData} registrationData - Complete registration data including package info
   * @returns {Promise<RegistrationResult>} Registration result with success status
   */
  const registerWithBooking = useCallback(async (registrationData: RegistrationData): Promise<RegistrationResult> => {
    setIsRegistering(true);
    setRegistrationError(null);

    try {
      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.post(`${apiUrl}/vendor-auth/register`, registrationData);

      const result = {
        success: response.data.success,
        message: response.data.message,
        userId: response.data.userId
      };

      setIsRegistering(false);
      return result;
    } catch (error) {
      console.error('Vendor registration error:', error);
      
      let errorMessage = 'Verbindungsfehler. Bitte versuche es später erneut.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || 'Ein Fehler ist aufgetreten bei der Registrierung';
      }
      
      setRegistrationError(errorMessage);
      setIsRegistering(false);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  /**
   * Pre-register vendor before store opening
   * @description Register vendor for pre-launch access, typically includes store opening information.
   * This is used for vendors who want to register before the marketplace is fully operational.
   * 
   * @param {RegistrationData} registrationData - Registration data for pre-registration
   * @returns {Promise<RegistrationResult>} Registration result with opening info
   */
  const preRegisterVendor = useCallback(async (registrationData: RegistrationData): Promise<RegistrationResult> => {
    setIsRegistering(true);
    setRegistrationError(null);

    try {
      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.post(`${apiUrl}/vendor-auth/preregister`, registrationData);

      const result = {
        success: response.data.success,
        message: response.data.message,
        userId: response.data.userId,
        openingInfo: response.data.openingInfo
      };

      setIsRegistering(false);
      return result;
    } catch (error) {
      console.error('Vendor pre-registration error:', error);
      
      let errorMessage = 'Verbindungsfehler. Bitte versuche es später erneut.';
      
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.message || 'Ein Fehler ist aufgetreten bei der Pre-Registrierung';
      }
      
      setRegistrationError(errorMessage);
      setIsRegistering(false);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  return {
    registerWithBooking,
    preRegisterVendor,
    isRegistering,
    registrationError
  };
};