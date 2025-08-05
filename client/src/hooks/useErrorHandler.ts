/**
 * @file useErrorHandler.ts
 * @purpose Custom hook for centralized error handling with async error management
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useState, useCallback } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: string;
  timestamp: Date;
}

export interface ErrorHandlerState {
  error: ErrorInfo | null;
  isLoading: boolean;
  hasError: boolean;
}

export interface ErrorHandlerActions {
  setError: (error: string | Error | ErrorInfo) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  handleAsyncError: <T>(promise: Promise<T>) => Promise<T>;
  retry: (retryFn: () => void | Promise<void>) => void;
}

/**
 * Custom hook for centralized error handling
 * @description Provides error state management, async error handling, loading states, and retry functionality
 * @hook useErrorHandler
 * @dependencies useState, useCallback
 * @returns Combined error handler state and actions interface
 */
export const useErrorHandler = (): ErrorHandlerState & ErrorHandlerActions => {
  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isLoading: false,
    hasError: false,
  });

  /**
   * Set error in state
   * @description Converts various error types to ErrorInfo and updates state
   * @param error - String, Error object, or ErrorInfo to set
   */
  const setError = useCallback((error: string | Error | ErrorInfo) => {
    let errorInfo: ErrorInfo;

    if (typeof error === 'string') {
      errorInfo = {
        message: error,
        timestamp: new Date(),
      };
    } else if (error instanceof Error) {
      errorInfo = {
        message: error.message,
        details: error.stack,
        timestamp: new Date(),
      };
    } else {
      errorInfo = {
        ...error,
        timestamp: error.timestamp || new Date(),
      };
    }

    setState(prev => ({
      ...prev,
      error: errorInfo,
      hasError: true,
      isLoading: false,
    }));

    // Log error for monitoring
    console.error('Error handled:', errorInfo);
  }, []);

  /**
   * Clear error state
   * @description Resets error state to null and hasError to false
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      hasError: false,
    }));
  }, []);

  /**
   * Set loading state
   * @description Updates the loading state flag
   * @param loading - Boolean loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  /**
   * Handle async operations with error management
   * @description Wraps promise execution with loading state and error handling
   * @param promise - Promise to handle
   * @returns Promise result or throws error
   */
  const handleAsyncError = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      clearError();
      const result = await promise;
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      setError(error as Error);
      throw error;
    }
  }, [setError, clearError, setLoading]);

  /**
   * Retry functionality
   * @description Clears error state and executes retry function with error handling
   * @param retryFn - Function to retry
   */
  const retry = useCallback((retryFn: () => void | Promise<void>) => {
    clearError();
    try {
      const result = retryFn();
      if (result instanceof Promise) {
        handleAsyncError(result);
      }
    } catch (error) {
      setError(error as Error);
    }
  }, [clearError, handleAsyncError, setError]);

  return {
    ...state,
    setError,
    clearError,
    setLoading,
    handleAsyncError,
    retry,
  };
};