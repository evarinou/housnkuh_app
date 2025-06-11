// client/src/contexts/VendorAuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import axios from 'axios';

interface VendorUser {
  id: string;
  name: string;
  email: string;
  isVendor: boolean;
  hasPendingBooking?: boolean;
  registrationStatus?: 'preregistered' | 'trial_active' | 'trial_expired' | 'active' | 'cancelled';
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  profilBild?: string;
}

interface VendorAuthContextType {
  user: VendorUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  registerWithBooking: (registrationData: any) => Promise<{ success: boolean; message?: string; userId?: string }>;
  preRegisterVendor: (registrationData: any) => Promise<{ success: boolean; message?: string; userId?: string; openingInfo?: any }>;
}

const VendorAuthContext = createContext<VendorAuthContextType | undefined>(undefined);

interface VendorAuthProviderProps {
  children: ReactNode;
}

export const VendorAuthProvider: React.FC<VendorAuthProviderProps> = React.memo(({ children }) => {
  const [user, setUser] = useState<VendorUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('vendorToken'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Logout-Funktion
  const logout = useCallback((): void => {
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorUser');

    // Bearer Token aus axios headers entfernen
    delete axios.defaults.headers.common['Authorization'];

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Authentifizierung prüfen
  const checkAuth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      // Bearer Token-Header setzen
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Auth-Status überprüfen
      const response = await axios.get(`${apiUrl}/vendor-auth/check`);

      if (response.data.success) {
        // User-Daten aus dem lokalen Storage abrufen
        const userData = localStorage.getItem('vendorUser');
        if (userData) {
          const localUser = JSON.parse(userData);
          
          // Aktuelles Profil vom Server laden um aktuelle Daten zu haben
          try {
            const profileResponse = await axios.get(`${apiUrl}/vendor-auth/profile/${localUser.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (profileResponse.data.success) {
              // Merge lokale User-Daten mit aktuellen Profildaten
              const updatedUser = {
                ...localUser,
                profilBild: profileResponse.data.profile.profilBild
              };
              
              // Aktualisierte Daten speichern
              localStorage.setItem('vendorUser', JSON.stringify(updatedUser));
              setUser(updatedUser);
            } else {
              setUser(localUser);
            }
          } catch (profileError) {
            console.warn('Could not load profile data:', profileError);
            setUser(localUser);
          }
          
          setIsAuthenticated(true);
        }

        setIsLoading(false);
        return true;
      } else {
        // Bei Fehler ausloggen
        logout();
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Vendor auth check error:', error);
      logout();
      setIsLoading(false);
      return false;
    }
  }, [token, logout]);

  // Beim Laden der Komponente nach Token suchen und Auth-Status prüfen
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await checkAuth();
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [checkAuth, token]);

  // Login-Funktion
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      const response = await axios.post(`${apiUrl}/vendor-auth/login`, {
        email,
        password
      });

      const { success, token: authToken, user: userData } = response.data;

      if (success && authToken) {
        localStorage.setItem('vendorToken', authToken);
        localStorage.setItem('vendorUser', JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
        setIsAuthenticated(true);

        // Bearer Token-Header für künftige Anfragen setzen
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

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
  }, []);

  // Registrierung mit Package-Buchung
  const registerWithBooking = useCallback(async (registrationData: any): Promise<{ success: boolean; message?: string; userId?: string }> => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      const response = await axios.post(`${apiUrl}/vendor-auth/register`, registrationData);

      return {
        success: response.data.success,
        message: response.data.message,
        userId: response.data.userId
      };
    } catch (error) {
      console.error('Vendor registration error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Ein Fehler ist aufgetreten bei der Registrierung'
        };
      }
      
      return {
        success: false,
        message: 'Verbindungsfehler. Bitte versuchen Sie es später erneut.'
      };
    }
  }, []);

  // Pre-Registrierung für Vendors vor Store-Eröffnung (M001 R001)
  const preRegisterVendor = useCallback(async (registrationData: any): Promise<{ success: boolean; message?: string; userId?: string; openingInfo?: any }> => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      const response = await axios.post(`${apiUrl}/vendor-auth/preregister`, registrationData);

      return {
        success: response.data.success,
        message: response.data.message,
        userId: response.data.userId,
        openingInfo: response.data.openingInfo
      };
    } catch (error) {
      console.error('Vendor pre-registration error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Ein Fehler ist aufgetreten bei der Pre-Registrierung'
        };
      }
      
      return {
        success: false,
        message: 'Verbindungsfehler. Bitte versuchen Sie es später erneut.'
      };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
    registerWithBooking,
    preRegisterVendor
  }), [user, token, isAuthenticated, isLoading, login, logout, checkAuth, registerWithBooking, preRegisterVendor]);

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
});

// Custom Hook für einfachen Zugriff auf den VendorAuth-Kontext
export const useVendorAuth = (): VendorAuthContextType => {
  const context = useContext(VendorAuthContext);

  if (context === undefined) {
    throw new Error('useVendorAuth must be used within a VendorAuthProvider');
  }

  return context;
};