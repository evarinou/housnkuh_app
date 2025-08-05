/**
 * @file useAuthOperations.ts
 * @purpose Custom hook for vendor authentication operations (logout, state management)
 * @created 2025-01-15
 * @modified 2025-08-05
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
 * Custom hook for vendor authentication operations
 * @description Provides logout functionality, state clearing, and error handling for vendor auth
 * @hook useAuthOperations
 * @dependencies useCallback, useState, authOperations
 * @returns Authentication operations interface with logout and state management
 */
export const useAuthOperations = (): UseAuthOperations => {
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Clear authentication state
   * @description Internal helper to reset authentication state and error flags
   */
  const clearAuthState = useCallback((): void => {
    setIsLoggingOut(false);
    setAuthError(null);
  }, []);

  /**
   * Logout current vendor user
   * @description Clears authentication state, removes stored credentials, and calls optional state update callback
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