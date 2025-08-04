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

  const priceCalculation = usePriceCalculation();
  const trialManagement = useTrialManagement();
  const authOperationsService = useAuthOperations();
  const loginOperations = useLoginOperations();
  const providerState = useProviderState();
  const registration = useVendorRegistration();
  const processUserData = useCallback((userData: any): VendorUser => {
    return priceCalculation.processUserData(userData);
  }, [priceCalculation.processUserData]);

  const logout = useCallback((): void => {
    authOperationsService.logout(() => {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    });
  }, [authOperationsService.logout]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
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
        logout();
      }

      setIsLoading(false);
      return authResult;
    } catch (error) {
      console.error('Vendor auth check error:', error);
      logout();
      setIsLoading(false);
      return false;
    }
  }, [token, logout, processUserData, trialManagement]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await checkAuth();
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

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
    providerState.createState(user, token, isAuthenticated, isLoading),
    [providerState, user, token, isAuthenticated, isLoading]
  );

  const actions = useMemo<VendorAuthActions>(() => 
    providerState.createActions(
      login,
      logout,
      checkAuth,
      registration.registerWithBooking,
      registration.preRegisterVendor,
      getTrialStatus,
      cancelTrialBooking
    ),
    [providerState, login, logout, checkAuth, registration.registerWithBooking, registration.preRegisterVendor, getTrialStatus, cancelTrialBooking]
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