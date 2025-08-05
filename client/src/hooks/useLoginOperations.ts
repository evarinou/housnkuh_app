/**
 * @file useLoginOperations.ts
 * @purpose Custom hook for vendor authentication login operations
 * @created 2025-01-15
 * @modified 2025-08-05
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
 * Custom hook for vendor login operations
 * @description Provides vendor authentication functionality with error handling and loading states
 * @hook useLoginOperations
 * @dependencies useCallback, useState, axios
 * @returns Login operations service interface with performLogin function and state
 */
export const useLoginOperations = (): LoginOperationsService => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   * @description Resets error state to null
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Perform vendor login with comprehensive error handling
   * @description Handles vendor authentication API call, token validation, and user data processing
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