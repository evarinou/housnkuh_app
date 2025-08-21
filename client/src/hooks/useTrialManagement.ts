/**
 * @file useTrialManagement.ts
 * @purpose Custom hook for vendor trial management and authentication operations
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useCallback, useState, useRef } from 'react';
import axios from 'axios';
import { VendorUser } from '../contexts/VendorAuthContext';
import { 
  apiUtils, 
  authValidation, 
  userStorage, 
  axiosHeaders 
} from '../utils/auth';

interface UseTrialManagementReturn {
  checkAuth: (token: string | null, processUserData: (userData: any) => VendorUser) => Promise<boolean>;
  validateTrialStatus: (userData: any) => boolean;
  processAuthResponse: (response: any) => VendorUser | null;
  getTrialStatus: (token: string | null) => Promise<{ success: boolean; data?: any; message?: string }>;
  cancelTrialBooking: (token: string | null, bookingId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  isCheckingAuth: boolean;
  authError: string | null;
}

/**
 * Custom hook for vendor trial management and authentication operations
 * @description Handles authentication checks, trial status validation, profile loading,
 * trial status retrieval, and trial booking cancellation with request deduplication
 * @hook useTrialManagement
 * @dependencies useCallback, useState, useRef, axios, authValidation, userStorage
 * @returns Trial management interface with auth and trial operations
 */
export const useTrialManagement = (): UseTrialManagementReturn => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Request cache for deduplication
  const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());
  
  // Rate limiting: Track last request times per endpoint
  const lastRequestTimesRef = useRef<Map<string, number>>(new Map());
  const lastResultCacheRef = useRef<Map<string, any>>(new Map());
  const RATE_LIMIT_MS = 1000; // 1 second minimum between general API requests
  const AUTH_RATE_LIMIT_MS = 5000; // 5 seconds minimum between auth checks (longer for auth stability)

  /**
   * Validates if user data indicates a valid trial status
   * @description Checks user data structure and validates trial status using auth validation
   * @param userData - The user data to validate
   * @returns boolean indicating if trial status is valid
   */
  const validateTrialStatus = useCallback((userData: any): boolean => {
    if (!userData) return false;
    
    try {
      // Check if user has valid trial data structure
      return authValidation.isValidUser(userData);
    } catch (error) {
      console.warn('Trial status validation error:', error);
      return false;
    }
  }, []);

  /**
   * Processes authentication response and returns user data
   * @description Extracts and validates user data from auth response using storage and validation
   * @param response - The API response from authentication check
   * @returns Processed user data or null if invalid
   */
  const processAuthResponse = useCallback((response: any): VendorUser | null => {
    if (!response?.data?.success) {
      return null;
    }

    try {
      // Extract user data from response
      const userData = userStorage.getUser('VENDOR_USER');
      return validateTrialStatus(userData) ? userData : null;
    } catch (error) {
      console.warn('Auth response processing error:', error);
      return null;
    }
  }, [validateTrialStatus]);

  /**
   * Performs authentication check with token validation and profile loading
   * @description Validates token, checks auth status, loads current profile, and processes user data with request deduplication and rate limiting
   * @param token - Authentication token
   * @param processUserData - Function to process user data with pricing
   * @returns Promise<boolean> indicating authentication success
   */
  const checkAuth = useCallback(async (
    token: string | null,
    processUserData: (userData: any) => VendorUser
  ): Promise<boolean> => {
    
    if (!authValidation.isValidToken(token)) {
      setIsCheckingAuth(false);
      return false;
    }

    // Create cache key for auth check
    const cacheKey = `auth-check-${token}`;
    const requestCache = requestCacheRef.current;
    const lastRequestTimes = lastRequestTimesRef.current;
    const lastResultCache = lastResultCacheRef.current;
    
    // Rate limiting check
    const now = Date.now();
    const lastTime = lastRequestTimes.get(cacheKey) || 0;
    
    if (now - lastTime < AUTH_RATE_LIMIT_MS) {
      // Return cached result if available
      const cachedResult = lastResultCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }
      // If no cached result and within auth rate limit, try to use last known good result
      // For auth checks, be more permissive - assume valid if token exists and was recently valid
      if (authValidation.isValidToken(token)) {
        return true;
      }
      return false;
    }
    
    // Check if request is already in progress
    if (requestCache.has(cacheKey)) {
      try {
        // Return existing promise
        return await requestCache.get(cacheKey)!;
      } catch (error) {
        console.error('Cached auth check failed:', error);
      }
    }

    // Update last request time
    lastRequestTimes.set(cacheKey, now);
    
    // Create new request promise
    const requestPromise = (async () => {
      setIsCheckingAuth(true);
      setAuthError(null);

      try {
        const apiUrl = apiUtils.getApiUrl();

        // Bearer Token-Header setzen
        axiosHeaders.setAuthHeader(token!);

        // Auth-Status überprüfen
        const response = await axios.get(`${apiUrl}/vendor-auth/check`);

        if (response.data.success) {
          // User-Daten aus dem lokalen Storage abrufen
          const userData = userStorage.getUser('VENDOR_USER');
          if (authValidation.isValidUser(userData)) {
            
            // Aktuelles Profil vom Server laden um aktuelle Daten zu haben
            try {
              const profileResponse = await axios.get(`${apiUrl}/vendor-auth/profile/${userData.id}`, 
                apiUtils.createAuthConfig(token!)
              );
              
              if (profileResponse.data && profileResponse.data.success) {
                // Merge lokale User-Daten mit aktuellen Profildaten
                const updatedUser = {
                  ...userData,
                  profilBild: profileResponse.data.profile?.profilBild,
                  ...profileResponse.data.profile // Include any additional profile data like pendingBooking
                };
                
                // Process user data and calculate pricing
                const processedUser = processUserData(updatedUser);
                
                // Aktualisierte Daten speichern
                userStorage.setUser('VENDOR_USER', processedUser);
                
                setIsCheckingAuth(false);
                // Cache successful result
                lastResultCache.set(cacheKey, true);
                return true;
              } else {
                const processedUser = processUserData(userData);
                userStorage.setUser('VENDOR_USER', processedUser);
                setIsCheckingAuth(false);
                // Cache successful result
                lastResultCache.set(cacheKey, true);
                return true;
              }
            } catch (profileError) {
              console.warn('Could not load profile data:', profileError);
              const processedUser = processUserData(userData);
              userStorage.setUser('VENDOR_USER', processedUser);
              setIsCheckingAuth(false);
              // Cache successful result
              lastResultCache.set(cacheKey, true);
              return true;
            }
          }

          setIsCheckingAuth(false);
          // Cache successful result
          lastResultCache.set(cacheKey, true);
          return true;
        } else {
          // Bei Fehler ausloggen erforderlich
          setIsCheckingAuth(false);
          // Cache failure result
          lastResultCache.set(cacheKey, false);
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';
        setAuthError(errorMessage);
        console.error('useTrialManagement.checkAuth() - API error:', error);
        setIsCheckingAuth(false);
        // On error, remove the timestamp to allow retry
        lastRequestTimes.delete(cacheKey);
        return false;
      }
    })();

    // Store promise in cache
    requestCache.set(cacheKey, requestPromise);

    // Ensure cache is cleaned up after request completes
    requestPromise.finally(() => {
      requestCache.delete(cacheKey);
    });

    return requestPromise;
  }, []);

  /**
   * Gets the trial status with booking details
   * @description Retrieves current trial status and booking information from API with request deduplication and rate limiting
   * @param token - Authentication token
   * @returns Promise with success status, data, and optional message
   */
  const getTrialStatus = useCallback(async (
    token: string | null
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    // Check for valid token first
    if (!authValidation.isValidToken(token)) {
      return {
        success: false,
        message: 'Keine gültige Authentifizierung gefunden'
      };
    }

    // Create cache key based on token
    const cacheKey = `trial-status-${token}`;
    const requestCache = requestCacheRef.current;
    const lastRequestTimes = lastRequestTimesRef.current;
    const lastResultCache = lastResultCacheRef.current;
    
    // Rate limiting check
    const now = Date.now();
    const lastTime = lastRequestTimes.get(cacheKey) || 0;
    
    if (now - lastTime < RATE_LIMIT_MS) {
      console.warn('Rate limiting: returning cached result for getTrialStatus');
      // Return cached result if available
      const cachedResult = lastResultCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      // If no cached result, still enforce rate limit
      return {
        success: false,
        message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
      };
    }
    
    // Check if request is already in progress
    if (requestCache.has(cacheKey)) {
      try {
        // Return existing promise
        return await requestCache.get(cacheKey)!;
      } catch (error) {
        // If cached request failed, it will be removed and we can retry
        // This catch is here for safety but the finally block should handle cleanup
        console.error('Cached request failed:', error);
      }
    }

    // Update last request time
    lastRequestTimes.set(cacheKey, now);
    
    // Create new request promise
    const requestPromise = (async () => {
      try {
        const apiUrl = apiUtils.getApiUrl();

        const response = await axios.get(`${apiUrl}/vendor-auth/trial-status`, 
          apiUtils.createAuthConfig(token!)
        );

        const result = {
          success: response.data.success,
          data: response.data.data,
          message: response.data.message
        };
        
        // Cache successful result
        lastResultCache.set(cacheKey, result);
        
        return result;
      } catch (error) {
        console.error('Trial status error:', error);
        
        // On error, remove the timestamp to allow retry
        lastRequestTimes.delete(cacheKey);
        
        if (axios.isAxiosError(error) && error.response) {
          return {
            success: false,
            message: error.response.data.message || 'Fehler beim Abrufen des Probemonat-Status'
          };
        }
        
        return {
          success: false,
          message: 'Verbindungsfehler. Bitte versuche es später erneut.'
        };
      }
    })();

    // Store promise in cache
    requestCache.set(cacheKey, requestPromise);

    // Ensure cache is cleaned up after request completes
    requestPromise.finally(() => {
      requestCache.delete(cacheKey);
    });

    return requestPromise;
  }, []);

  /**
   * Cancels a trial booking
   * @description Sends cancellation request to API with booking ID and optional reason with request deduplication and rate limiting
   * @param token - Authentication token
   * @param bookingId - The ID of the booking to cancel
   * @param reason - Optional reason for cancellation
   * @returns Promise with success status and optional message
   */
  const cancelTrialBooking = useCallback(async (
    token: string | null,
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!authValidation.isValidToken(token)) {
      return {
        success: false,
        message: 'Keine gültige Authentifizierung gefunden'
      };
    }

    // Create cache key based on token and bookingId
    const cacheKey = `cancel-booking-${token}-${bookingId}`;
    const requestCache = requestCacheRef.current;
    const lastRequestTimes = lastRequestTimesRef.current;
    const lastResultCache = lastResultCacheRef.current;
    
    // Rate limiting check
    const now = Date.now();
    const lastTime = lastRequestTimes.get(cacheKey) || 0;
    
    if (now - lastTime < RATE_LIMIT_MS) {
      console.warn('Rate limiting: returning cached result for cancelTrialBooking');
      // Return cached result if available
      const cachedResult = lastResultCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      // If no cached result, still enforce rate limit
      return {
        success: false,
        message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
      };
    }
    
    // Check if request is already in progress
    if (requestCache.has(cacheKey)) {
      try {
        // Return existing promise
        return await requestCache.get(cacheKey)!;
      } catch (error) {
        console.error('Cached cancel request failed:', error);
      }
    }

    // Update last request time
    lastRequestTimes.set(cacheKey, now);
    
    // Create new request promise
    const requestPromise = (async () => {
      try {
        const apiUrl = apiUtils.getApiUrl();

        const response = await axios.post(
          `${apiUrl}/vendor-auth/cancel-trial-booking/${bookingId}`,
          { reason },
          apiUtils.createAuthConfig(token!)
        );

        const result = {
          success: response.data.success,
          message: response.data.message
        };
        
        // Cache successful result
        lastResultCache.set(cacheKey, result);
        
        return result;
      } catch (error) {
        console.error('Cancel trial booking error:', error);
        
        // On error, remove the timestamp to allow retry
        lastRequestTimes.delete(cacheKey);
        
        if (axios.isAxiosError(error) && error.response) {
          return {
            success: false,
            message: error.response.data.message || 'Fehler beim Stornieren der Buchung'
          };
        }
        
        return {
          success: false,
          message: 'Verbindungsfehler. Bitte versuche es später erneut.'
        };
      }
    })();

    // Store promise in cache
    requestCache.set(cacheKey, requestPromise);

    // Ensure cache is cleaned up after request completes
    requestPromise.finally(() => {
      requestCache.delete(cacheKey);
    });

    return requestPromise;
  }, []);

  // Reset function for testing
  const resetCaches = useCallback(() => {
    requestCacheRef.current.clear();
    lastRequestTimesRef.current.clear();
    lastResultCacheRef.current.clear();
  }, []);

  return {
    checkAuth,
    validateTrialStatus,
    processAuthResponse,
    getTrialStatus,
    cancelTrialBooking,
    isCheckingAuth,
    authError,
    // Only expose in development/test environment
    ...(process.env.NODE_ENV === 'test' && { resetCaches })
  };
};