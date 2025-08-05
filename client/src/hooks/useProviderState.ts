/**
 * @file useProviderState.ts
 * @purpose Custom hook for vendor authentication state and actions management
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useMemo } from 'react';
import { VendorUser } from '../contexts/VendorAuthContext';

/**
 * Vendor authentication state interface
 */
export interface VendorAuthState {
  user: VendorUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Vendor authentication actions interface
 */
export interface VendorAuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  registerWithBooking: (bookingData: any) => Promise<any>;
  preRegisterVendor: (vendorData: any) => Promise<any>;
  getTrialStatus: () => Promise<{ success: boolean; data?: any; message?: string }>;
  cancelTrialBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
}

/**
 * Provider state management service interface
 */
export interface ProviderStateService {
  /**
   * Create memoized state object
   */
  createState: (
    user: VendorUser | null,
    token: string | null,
    isAuthenticated: boolean,
    isLoading: boolean
  ) => VendorAuthState;

  /**
   * Create memoized actions object
   */
  createActions: (
    login: (email: string, password: string) => Promise<boolean>,
    logout: () => void,
    checkAuth: () => Promise<boolean>,
    registerWithBooking: (bookingData: any) => Promise<any>,
    preRegisterVendor: (vendorData: any) => Promise<any>,
    getTrialStatus: () => Promise<{ success: boolean; data?: any; message?: string }>,
    cancelTrialBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; message?: string }>
  ) => VendorAuthActions;
}

/**
 * Custom hook for vendor authentication state and actions management
 * @description Provides memoized state and actions object creation for VendorAuthContext
 * @hook useProviderState
 * @dependencies useMemo
 * @returns Provider state service with memoized state and actions creators
 */
export const useProviderState = (): ProviderStateService => {
  /**
   * Create memoized state object
   * @description Creates vendor authentication state object with memoization
   */
  const createState = useMemo(() => {
    return (
      user: VendorUser | null,
      token: string | null,
      isAuthenticated: boolean,
      isLoading: boolean
    ): VendorAuthState => {
      return {
        user,
        token,
        isAuthenticated,
        isLoading
      };
    };
  }, []);

  /**
   * Create memoized actions object
   * @description Creates vendor authentication actions object with memoization
   */
  const createActions = useMemo(() => {
    return (
      login: (email: string, password: string) => Promise<boolean>,
      logout: () => void,
      checkAuth: () => Promise<boolean>,
      registerWithBooking: (bookingData: any) => Promise<any>,
      preRegisterVendor: (vendorData: any) => Promise<any>,
      getTrialStatus: () => Promise<{ success: boolean; data?: any; message?: string }>,
      cancelTrialBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; message?: string }>
    ): VendorAuthActions => {
      return {
        login,
        logout,
        checkAuth,
        registerWithBooking,
        preRegisterVendor,
        getTrialStatus,
        cancelTrialBooking
      };
    };
  }, []);

  return useMemo(() => ({
    createState,
    createActions
  }), [createState, createActions]);
};