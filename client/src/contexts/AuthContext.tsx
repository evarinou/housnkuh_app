// client/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  }, []);

  // Authentifizierung prüfen
  const checkAuth = async (): Promise<boolean> => {
    setIsLoading(true);

    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      // Token-Header setzen
      axios.defaults.headers.common['x-auth-token'] = token;
      
      // Auth-Status überprüfen
      const response = await axios.get(`${apiUrl}/auth/check`);
      
      if (response.data.success) {
        // User-Daten aus dem lokalen Storage abrufen
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
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
  };

  // Login-Funktion
  const login = async (username: string, password: string): Promise<boolean> => {
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
        localStorage.setItem('user', JSON.stringify(userData));
        
        setToken(authToken);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Token-Header für künftige Anfragen setzen
        axios.defaults.headers.common['x-auth-token'] = authToken;
        
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
  };

  // Logout-Funktion
  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    delete axios.defaults.headers.common['x-auth-token'];
    
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook für einfachen Zugriff auf den Auth-Kontext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};