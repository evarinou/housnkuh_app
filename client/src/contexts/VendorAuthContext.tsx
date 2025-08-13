/**
 * Vendor authentication context - handles authentication state and delegation to business logic services
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
  tokenStorage, 
  userStorage
} from '../utils/auth';
import { useVendorRegistration } from '../hooks/useVendorRegistration';
import { usePriceCalculation } from '../hooks/usePriceCalculation';
import { useTrialManagement } from '../hooks/useTrialManagement';
import { useAuthOperations } from '../hooks/useAuthOperations';
import { useLoginOperations } from '../hooks/useLoginOperations';
import { useProviderState, VendorAuthState, VendorAuthActions } from '../hooks/useProviderState';

export interface VendorUser {
  id: string;
  name: string;
  email: string;
  isVendor: boolean;
  hasPendingBooking?: boolean;
  registrationStatus?: 'preregistered' | 'trial_active' | 'trial_expired' | 'active' | 'cancelled';
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  profilBild?: string;
  pendingBooking?: {
    packageData: {
      totalCost: { monthly: number; packageCosts: number; zusatzleistungenCosts: number; };
      packageCounts: Record<string, number>;
      packageOptions: Array<{ id: string; name: string; price: number; }>;
      zusatzleistungen: { lagerservice: boolean; versandservice: boolean; };
      rentalDuration: number;
      selectedProvisionType: 'basic' | 'premium';
    };
  };
  calculatedMonthlyPrice?: number;
  packageSummary?: {
    mietfaecher: Array<{ name: string; price: number; }>;
    zusatzleistungen: { lagerservice: boolean; versandservice: boolean; };
  };
}

const VendorAuthStateContext = createContext<VendorAuthState | undefined>(undefined);
const VendorAuthActionsContext = createContext<VendorAuthActions | undefined>(undefined);

interface VendorAuthProviderProps {
  children: ReactNode;
}

export const VendorAuthProvider: React.FC<VendorAuthProviderProps> = React.memo(({ children }) => {
  const [user, setUser] = useState<VendorUser | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getToken('VENDOR'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState<boolean>(false);
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(Date.now());

  const priceCalculation = usePriceCalculation();
  const trialManagement = useTrialManagement();
  const authOperationsService = useAuthOperations();
  const loginOperations = useLoginOperations();
  const providerState = useProviderState();
  const registration = useVendorRegistration();
  const processUserData = useCallback((userData: any): VendorUser => {
    return priceCalculation.processUserData(userData);
  }, [priceCalculation]);

  const logout = useCallback((): void => {
    console.log('🚨 VendorAuthContext.logout() - CALLED', new Error().stack);
    authOperationsService.logout(() => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setBookings([]); // Clear bookings on logout
    });
  }, [authOperationsService]);

  const checkAuth = useCallback(async (force: boolean = false): Promise<boolean> => {
    
    // Skip if checked recently (within 30 seconds) unless forced
    const timeSinceLastCheck = Date.now() - lastAuthCheck;
    if (!force && timeSinceLastCheck < 30000) {
      console.log(`Skipping auth check, last check was ${Math.round(timeSinceLastCheck / 1000)}s ago`);
      return true; // Assume still valid
    }

    setIsLoading(true);

    try {
      const authResult = await trialManagement.checkAuth(token, processUserData);
      
      if (authResult) {
        const userData = userStorage.getUser('VENDOR_USER');
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } else {
        // Retry logic: if first attempt fails, wait and try once more
        if (!force) {
          setIsLoading(false);
          await new Promise(resolve => setTimeout(resolve, 500));
          return await checkAuth(true); // Retry with force=true
        } else {
          logout();
        }
      }

      setIsLoading(false);
      setLastAuthCheck(Date.now()); // Update last check timestamp
      return authResult;
    } catch (error) {
      console.error('VendorAuthContext.checkAuth() - Exception:', error);
      // Retry logic for exceptions too
      if (!force) {
        setIsLoading(false);
        await new Promise(resolve => setTimeout(resolve, 500));
        return await checkAuth(true); // Retry with force=true
      } else {
        logout();
        setIsLoading(false);
        return false;
      }
    }
  }, [token, logout, processUserData, trialManagement, lastAuthCheck]);

  /**
   * Fetches vendor bookings from API
   * @description Centralized method to fetch bookings data used by multiple components
   */
  const fetchBookings = useCallback(async (): Promise<void> => {
    if (!user?.id || !token) return;
    
    setIsBookingsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/vendor-auth/bookings/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error('Error fetching bookings: Response not OK');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsBookingsLoading(false);
    }
  }, [user?.id, token]);

  /**
   * Refreshes bookings data
   * @description Alias for fetchBookings to provide semantic clarity
   */
  const refreshBookings = useCallback(async (): Promise<void> => {
    await fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await checkAuth(true); // Force initial check on mount
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch bookings when user becomes available and authenticated
  useEffect(() => {
    if (user?.id && isAuthenticated && !isLoading) {
      fetchBookings();
    }
  }, [user?.id, isAuthenticated, isLoading, fetchBookings]);

  // Token persistence: Revalidate auth on page focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && !isLoading) {
        checkAuth(false); // Don't force check, respect cooldown
      }
    };

    const handleWindowFocus = () => {
      if (token && !isLoading) {
        checkAuth(false); // Don't force check, respect cooldown
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [token, checkAuth, isLoading]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const result = await loginOperations.performLogin(email, password, processUserData);
      
      if (result.success && result.token && result.user) {
        setToken(result.token);
        setUser(result.user);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Vendor login error:', error);
      setIsLoading(false);
      return false;
    }
  }, [loginOperations, processUserData]);

  const getTrialStatus = useCallback(() => 
    trialManagement.getTrialStatus(token), [trialManagement, token]);

  const cancelTrialBooking = useCallback((bookingId: string, reason?: string) => 
    trialManagement.cancelTrialBooking(token, bookingId, reason), [trialManagement, token]);

  const state = useMemo<VendorAuthState>(() => 
    providerState.createState(user, token, isAuthenticated, isLoading, bookings, isBookingsLoading),
    [providerState, user, token, isAuthenticated, isLoading, bookings, isBookingsLoading]
  );

  const actions = useMemo<VendorAuthActions>(() => 
    providerState.createActions(
      login,
      logout,
      checkAuth,
      registration.registerWithBooking,
      registration.preRegisterVendor,
      getTrialStatus,
      cancelTrialBooking,
      fetchBookings,
      refreshBookings
    ),
    [providerState, login, logout, checkAuth, registration.registerWithBooking, registration.preRegisterVendor, getTrialStatus, cancelTrialBooking, fetchBookings, refreshBookings]
  );

  return (
    <VendorAuthStateContext.Provider value={state}>
      <VendorAuthActionsContext.Provider value={actions}>
        {children}
      </VendorAuthActionsContext.Provider>
    </VendorAuthStateContext.Provider>
  );
});

export const useVendorAuthState = () => {
  const context = useContext(VendorAuthStateContext);
  if (context === undefined) {
    throw new Error('useVendorAuthState must be used within a VendorAuthProvider');
  }
  return context;
};

export const useVendorAuthActions = () => {
  const context = useContext(VendorAuthActionsContext);
  if (context === undefined) {
    throw new Error('useVendorAuthActions must be used within a VendorAuthProvider');
  }
  return context;
};

export const useVendorAuth = () => {
  const state = useVendorAuthState();
  const actions = useVendorAuthActions();
  
  return useMemo(() => ({
    ...state,
    ...actions
  }), [state, actions]);
};

export { VendorAuthStateContext as VendorAuthContext, VendorAuthStateContext, VendorAuthActionsContext };