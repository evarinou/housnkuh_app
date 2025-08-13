/**
 * @file Admin authentication context for housnkuh marketplace
 * @description Provides authentication state management and operations for admin users.
 * Uses split context pattern (state/actions) for performance optimization and clean separation.
 * Integrates with centralized auth utilities for token management and validation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  tokenStorage, 
  userStorage, 
  axiosHeaders, 
  authValidation, 
  authOperations, 
  apiUtils 
} from '../utils/auth';

/**
 * Admin user information structure
 * @description Represents an authenticated admin user with essential identification
 * and authorization information.
 * 
 * @interface User
 * @property {string} id - Unique user identifier
 * @property {string} username - Admin username for login
 * @property {string} name - Display name for the admin user
 * @property {boolean} isAdmin - Flag indicating admin privileges
 */
interface User {
  id: string;
  username: string;
  name: string;
  isAdmin: boolean;
}

/**
 * Authentication state context - holds current auth state
 * @description Separate context for authentication state to enable performance optimizations.
 * Components consuming only state won't re-render when actions change.
 */
export const AuthStateContext = createContext<AuthState | undefined>(undefined);

/**
 * Authentication actions context - holds auth operations
 * @description Separate context for authentication actions to enable performance optimizations.
 * Components consuming only actions won't re-render when state changes.
 */
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

/**
 * Authentication state interface
 * @description Defines the structure of authentication state managed by the context.
 * 
 * @interface AuthState
 * @property {User | null} user - Current authenticated user or null if not authenticated
 * @property {string | null} token - JWT authentication token or null if not authenticated
 * @property {boolean} isAuthenticated - Flag indicating current authentication status
 * @property {boolean} isLoading - Flag indicating if authentication check is in progress
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Authentication actions interface
 * @description Defines the available authentication operations that can be performed.
 * 
 * @interface AuthActions
 * @property {Function} login - Authenticate user with username and password
 * @property {Function} logout - Clear authentication state and tokens
 * @property {Function} checkAuth - Verify current authentication status
 */
interface AuthActions {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

/**
 * Authentication provider props
 * @description Props interface for the AuthProvider component.
 * 
 * @interface AuthProviderProps
 * @property {React.ReactNode} children - Child components to wrap with authentication context
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Admin authentication provider component
 * @description Provides authentication state and operations for admin users throughout the application.
 * Uses performance optimizations (React.memo) and split context pattern for minimal re-renders.
 * 
 * @param {AuthProviderProps} props - Component props containing children to wrap
 * @returns {JSX.Element} Provider components wrapping children with auth context
 * @complexity O(1) - Constant time component initialization
 */
export const AuthProvider: React.FC<AuthProviderProps> = React.memo(({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Logout function - clears authentication state and tokens
   * @description Performs complete logout by clearing all authentication data
   * from both local storage and component state. Uses auth utilities for
   * centralized cleanup operations.
   * 
   * @returns {void}
   * @complexity O(1) - Constant time cleanup operations
   */
  const logout = useCallback((): void => {
    authOperations.clearAdminAuth();
    
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /**
   * Check authentication status and validate stored tokens
   * @description Verifies current authentication state by checking stored tokens
   * and validating them with the server. Handles token refresh and user data
   * synchronization. Automatically logs out if validation fails.
   * 
   * @returns {Promise<boolean>} Promise resolving to true if authenticated, false otherwise
   * @throws {Error} Network errors during authentication check
   * @complexity O(1) - Single API call with constant time operations
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    const storedToken = tokenStorage.getToken('ADMIN');
    
    if (!authValidation.isValidToken(storedToken)) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const apiUrl = apiUtils.getApiUrl();

      // Set authentication headers (both formats for compatibility)
      axiosHeaders.setAuthHeader(storedToken!);
      axiosHeaders.setLegacyAuthHeader(storedToken!);

      // Verify authentication status with server
      const response = await axios.get(`${apiUrl}/auth/check`);

      if (response.data.success) {
        // Retrieve user data from local storage
        const userData = userStorage.getUser('USER');
        if (authValidation.isValidUser(userData)) {
          setUser(userData);
          setToken(storedToken);
          setIsAuthenticated(true);
        }

        setIsLoading(false);
        return true;
      } else {
        // Logout on validation failure
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
  }, [logout]);

  /**
   * Initialize authentication check on component mount
   * @description Automatically checks authentication status when the provider mounts.
   * Ensures authentication state is validated on application startup.
   * 
   * @complexity O(1) - Single useEffect with no dependencies
   */
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Execute only once on mount

  /**
   * Login function - authenticates user with username and password
   * @description Performs login authentication by sending credentials to the server
   * and managing the authentication state upon successful login. Handles token
   * storage and user data persistence through auth utilities.
   * 
   * @param {string} username - Admin username for authentication
   * @param {string} password - Admin password for authentication
   * @returns {Promise<boolean>} Promise resolving to true if login successful, false otherwise
   * @throws {Error} Network errors during login process
   * @complexity O(1) - Single API call with constant time operations
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const apiUrl = apiUtils.getApiUrl();

      const response = await axios.post(`${apiUrl}/auth/login`, {
        username,
        password
      });

      const { success, token: authToken, user: userData } = response.data;

      if (success && authValidation.isValidToken(authToken)) {
        authOperations.setupAdminAuth(authToken, userData);

        setToken(authToken);
        setUser(userData);
        setIsAuthenticated(true);

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

  /**
   * Memoized authentication state object
   * @description Creates a memoized state object to prevent unnecessary re-renders
   * of components consuming only authentication state.
   * 
   * @complexity O(1) - Object creation with memoization
   */
  const state = useMemo<AuthState>(() => ({
    user,
    token,
    isAuthenticated,
    isLoading
  }), [user, token, isAuthenticated, isLoading]);

  /**
   * Memoized authentication actions object
   * @description Creates a memoized actions object to prevent unnecessary re-renders
   * of components consuming only authentication actions.
   * 
   * @complexity O(1) - Object creation with memoization
   */
  const actions = useMemo<AuthActions>(() => ({
    login,
    logout,
    checkAuth
  }), [login, logout, checkAuth]);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
});

/**
 * Hook to access authentication state
 * @description Custom hook for accessing authentication state context.
 * Must be used within an AuthProvider or will throw an error.
 * 
 * @returns {AuthState} Current authentication state
 * @throws {Error} When used outside of AuthProvider
 * @complexity O(1) - Context access with validation
 */
export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to access authentication actions
 * @description Custom hook for accessing authentication actions context.
 * Must be used within an AuthProvider or will throw an error.
 * 
 * @returns {AuthActions} Available authentication actions
 * @throws {Error} When used outside of AuthProvider
 * @complexity O(1) - Context access with validation
 */
export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};

/**
 * Backward compatibility hook - combines state and actions
 * @description Legacy hook that combines both state and actions for components
 * that need both. Uses the split context hooks internally and memoizes the result.
 * 
 * @returns {AuthState & AuthActions} Combined authentication state and actions
 * @complexity O(1) - Context access with memoization
 */
export const useAuth = () => {
  const state = useAuthState();
  const actions = useAuthActions();
  
  return useMemo(() => ({
    ...state,
    ...actions
  }), [state, actions]);
};