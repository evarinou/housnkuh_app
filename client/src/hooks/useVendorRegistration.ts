/**
 * @file useVendorRegistration.ts
 * @purpose Custom hook for vendor registration operations (booking and pre-registration)
 * @created 2025-01-15
 * @modified 2025-08-05
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
 * Custom hook for vendor registration operations
 * @description Provides vendor registration with booking and pre-registration functionality
 * with loading states and error handling
 * @hook useVendorRegistration
 * @dependencies useCallback, useState, axios, apiUtils
 * @returns Vendor registration interface with registration functions and state
 */
export const useVendorRegistration = (): UseVendorRegistration => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  /**
   * Register vendor with booking data
   * @description Complete vendor registration with package booking information and payment processing
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
   * @description Register vendor for pre-launch access with store opening information
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