/**
 * @file Authentication operations service for vendor authentication
 * @description Provides authentication operations (login, logout, state management) 
 * extracted from VendorAuthContext to improve separation of concerns.
 * 
 * This service handles pure authentication operations without business logic,
 * following the established pattern from previous service extractions.
 * 
 * @see S35_M020_Authentication_Simplification sprint documentation
 */

import { useCallback, useState } from 'react';
import { authOperations } from '../utils/auth';

/**
 * Authentication operations interface
 * @description Defines the contract for authentication operations service
 */
export interface UseAuthOperations {
  /**
   * Logout current vendor user
   * @description Clears authentication state and removes stored credentials
   * @param onStateUpdate - Callback to update parent component state
   */
  logout: (onStateUpdate?: () => void) => void;
  
  /**
   * Clear authentication state
   * @description Internal helper to reset authentication state
   */
  clearAuthState: () => void;
  
  /**
   * Check if logout operation is in progress
   * @description Loading state for logout operations
   */
  isLoggingOut: boolean;
  
  /**
   * Authentication operation error
   * @description Error state for authentication operations
   */
  authError: string | null;
}

/**
 * Authentication operations service hook
 * @description Provides authentication operations for vendor users
 * @returns {UseAuthOperations} Authentication operations interface
 */
export const useAuthOperations = (): UseAuthOperations => {
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Clear authentication state
   * @description Internal helper to reset authentication state
   */
  const clearAuthState = useCallback((): void => {
    setIsLoggingOut(false);
    setAuthError(null);
  }, []);

  /**
   * Logout current vendor user
   * @description Clears authentication state and removes stored credentials
   * Identical behavior to the original logout function in VendorAuthContext
   */
  const logout = useCallback((onStateUpdate?: () => void): void => {
    try {
      setIsLoggingOut(true);
      setAuthError(null);

      // Clear authentication data using auth utils
      authOperations.clearVendorAuth();

      // Call state update callback if provided
      if (onStateUpdate) {
        onStateUpdate();
      }
      
      setIsLoggingOut(false);
    } catch (error) {
      setAuthError('Logout failed. Please try again.');
      setIsLoggingOut(false);
      console.error('Logout error:', error);
    }
  }, []);

  return {
    logout,
    clearAuthState,
    isLoggingOut,
    authError
  };
};