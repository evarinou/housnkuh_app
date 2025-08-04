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

export const useErrorHandler = (): ErrorHandlerState & ErrorHandlerActions => {
  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isLoading: false,
    hasError: false,
  });

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

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      hasError: false,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

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