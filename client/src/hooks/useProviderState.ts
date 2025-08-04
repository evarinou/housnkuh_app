/**
 * @file Provider state management service for vendor authentication
 * @description Extracted from VendorAuthContext to provide clean separation of state management logic.
 * This service handles state/actions object creation and memoization for better performance.
 * 
 * Following the established service extraction pattern from S32-S36.
 * 
 * @see Sprint 36 - Provider Architecture Optimization
 * @see M020 - Client Core Architecture Refactoring
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
 * Provider state management service hook
 * 
 * Extracts state and actions object creation from VendorAuthContext
 * for better performance and maintainability.
 * 
 * @returns ProviderStateService interface
 */
export const useProviderState = (): ProviderStateService => {
  /**
   * Create memoized state object
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