import { useCallback, useState } from 'react';
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
 * Hook for managing trial-related authentication and user profile processing
 * 
 * Provides functionality for:
 * - Authentication validation and token checking
 * - User profile data loading and processing
 * - Trial status validation
 * - Error handling for authentication operations
 */
export const useTrialManagement = (): UseTrialManagementReturn => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * Validates if user data indicates a valid trial status
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
   * @param token - Authentication token
   * @param processUserData - Function to process user data with pricing
   * @returns Promise<boolean> indicating authentication success
   */
  const checkAuth = useCallback(async (
    token: string | null,
    processUserData: (userData: any) => VendorUser
  ): Promise<boolean> => {
    setIsCheckingAuth(true);
    setAuthError(null);

    if (!authValidation.isValidToken(token)) {
      setIsCheckingAuth(false);
      return false;
    }

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
              return true;
            } else {
              const processedUser = processUserData(userData);
              userStorage.setUser('VENDOR_USER', processedUser);
              setIsCheckingAuth(false);
              return true;
            }
          } catch (profileError) {
            console.warn('Could not load profile data:', profileError);
            const processedUser = processUserData(userData);
            userStorage.setUser('VENDOR_USER', processedUser);
            setIsCheckingAuth(false);
            return true;
          }
        }

        setIsCheckingAuth(false);
        return true;
      } else {
        // Bei Fehler ausloggen erforderlich
        setIsCheckingAuth(false);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';
      setAuthError(errorMessage);
      console.error('Vendor auth check error:', error);
      setIsCheckingAuth(false);
      return false;
    }
  }, []);

  /**
   * Gets the trial status with booking details
   * @param token - Authentication token
   * @returns Promise with success status, data, and optional message
   */
  const getTrialStatus = useCallback(async (
    token: string | null
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      if (!authValidation.isValidToken(token)) {
        return {
          success: false,
          message: 'Keine gültige Authentifizierung gefunden'
        };
      }

      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.get(`${apiUrl}/vendor-auth/trial-status`, 
        apiUtils.createAuthConfig(token!)
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Trial status error:', error);
      
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
  }, []);

  /**
   * Cancels a trial booking
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
    try {
      if (!authValidation.isValidToken(token)) {
        return {
          success: false,
          message: 'Keine gültige Authentifizierung gefunden'
        };
      }

      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.post(
        `${apiUrl}/vendor-auth/cancel-trial-booking/${bookingId}`,
        { reason },
        apiUtils.createAuthConfig(token!)
      );

      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error) {
      console.error('Cancel trial booking error:', error);
      
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
  }, []);

  return {
    checkAuth,
    validateTrialStatus,
    processAuthResponse,
    getTrialStatus,
    cancelTrialBooking,
    isCheckingAuth,
    authError
  };
};