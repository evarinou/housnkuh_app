/**
 * @file Login operations service for vendor authentication
 * @description Extracted from VendorAuthContext to provide clean separation of login concerns.
 * This service handles vendor login functionality with proper error handling and state management.
 * 
 * Following the established service extraction pattern from S32-S35.
 * 
 * @see Sprint 36 - Provider Architecture Optimization
 * @see M020 - Client Core Architecture Refactoring
 */

import { useCallback, useState } from 'react';
import axios from 'axios';
import { 
  authValidation, 
  authOperations, 
  apiUtils 
} from '../utils/auth';
import { VendorUser } from '../contexts/VendorAuthContext';

/**
 * Login result interface
 */
export interface LoginResult {
  success: boolean;
  token?: string;
  user?: VendorUser;
  message?: string;
}

/**
 * Login operations service interface
 */
export interface LoginOperationsService {
  /**
   * Perform vendor login with email and password
   * @param email - Vendor email address
   * @param password - Vendor password
   * @param processUserData - Function to process user data (from parent context)
   * @returns Promise resolving to login result
   */
  performLogin: (
    email: string, 
    password: string, 
    processUserData: (userData: any) => VendorUser
  ) => Promise<LoginResult>;

  /**
   * Loading state for login operation
   */
  isLoading: boolean;

  /**
   * Error state for login operation
   */
  error: string | null;

  /**
   * Clear error state
   */
  clearError: () => void;
}

/**
 * Login operations service hook
 * 
 * Extracts login functionality from VendorAuthContext to provide clean separation
 * of concerns and improve testability.
 * 
 * @returns LoginOperationsService interface
 */
export const useLoginOperations = (): LoginOperationsService => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Perform vendor login with comprehensive error handling
   * 
   * @param email - Vendor email address
   * @param password - Vendor password
   * @param processUserData - Function to process user data
   * @returns Promise resolving to login result
   */
  const performLogin = useCallback(async (
    email: string, 
    password: string, 
    processUserData: (userData: any) => VendorUser
  ): Promise<LoginResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.post(`${apiUrl}/vendor-auth/login`, {
        email,
        password
      });

      const { success, token: authToken, user: userData } = response.data;

      if (success && authValidation.isValidToken(authToken)) {
        // Process user data and calculate pricing
        const processedUser = processUserData(userData);

        // Setup authentication in storage
        authOperations.setupVendorAuth(authToken, processedUser);

        setIsLoading(false);
        return {
          success: true,
          token: authToken,
          user: processedUser
        };
      } else {
        setIsLoading(false);
        setError('Invalid credentials or authentication failed');
        return {
          success: false,
          message: 'Invalid credentials or authentication failed'
        };
      }
    } catch (error) {
      console.error('Vendor login error:', error);
      setIsLoading(false);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (axios.isAxiosError(error) && error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      }
      
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  return {
    performLogin,
    isLoading,
    error,
    clearError
  };
};