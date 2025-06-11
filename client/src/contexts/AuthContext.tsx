// client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import axios from 'axios';

// Interface für Benutzerinformationen
interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
}

// Interface für den AuthContext
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// AuthContext erstellen
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = React.memo(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Logout-Funktion
  const logout = useCallback((): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('user');

    // Token aus axios headers entfernen
    delete axios.defaults.headers.common['x-auth-token'];
    delete axios.defaults.headers.common['Authorization'];

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Authentifizierung prüfen
  const checkAuth = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      // Token-Header setzen (beide Formate für Kompatibilität)
      axios.defaults.headers.common['x-auth-token'] = storedToken;
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      // AdminToken auch setzen
      localStorage.setItem('adminToken', storedToken);

      // Auth-Status überprüfen
      const response = await axios.get(`${apiUrl}/auth/check`);

      if (response.data.success) {
        // User-Daten aus dem lokalen Storage abrufen
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setToken(storedToken);
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
      console.error('Auth check error:', error);
      logout();
      setIsLoading(false);
      return false;
    }
  }, []);

  // Beim Laden der Komponente nach Token suchen und Auth-Status prüfen
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mount ausführen

  // Login-Funktion
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

      const response = await axios.post(`${apiUrl}/auth/login`, {
        username,
        password
      });

      const { success, token: authToken, user: userData } = response.data;

      if (success && authToken) {
        localStorage.setItem('token', authToken);
        localStorage.setItem('adminToken', authToken); // Auch als adminToken speichern für Kompatibilität
        localStorage.setItem('user', JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
        setIsAuthenticated(true);

        // Token-Header für künftige Anfragen setzen (beide Formate für Kompatibilität)
        axios.defaults.headers.common['x-auth-token'] = authToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }), [user, token, isAuthenticated, isLoading, login, logout, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
});

// Custom Hook für einfachen Zugriff auf den Auth-Kontext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};