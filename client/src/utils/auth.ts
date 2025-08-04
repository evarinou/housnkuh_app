// client/src/utils/auth.ts
import axios from 'axios';

// Standardized token storage keys
export const TOKEN_KEYS = {
  ADMIN: 'adminToken',
  VENDOR: 'vendorToken',
  USER: 'user',
  VENDOR_USER: 'vendorUser'
} as const;

// Token storage utilities
export const tokenStorage = {
  // Get token from localStorage
  getToken: (key: keyof typeof TOKEN_KEYS): string | null => {
    return localStorage.getItem(TOKEN_KEYS[key]);
  },

  // Set token in localStorage
  setToken: (key: keyof typeof TOKEN_KEYS, token: string): void => {
    localStorage.setItem(TOKEN_KEYS[key], token);
  },

  // Remove token from localStorage
  removeToken: (key: keyof typeof TOKEN_KEYS): void => {
    localStorage.removeItem(TOKEN_KEYS[key]);
  },

  // Clear all tokens
  clearAllTokens: (): void => {
    Object.values(TOKEN_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

// User data storage utilities
export const userStorage = {
  // Get user data from localStorage
  getUser: (key: keyof typeof TOKEN_KEYS): any | null => {
    const userData = localStorage.getItem(TOKEN_KEYS[key]);
    return userData ? JSON.parse(userData) : null;
  },

  // Set user data in localStorage
  setUser: (key: keyof typeof TOKEN_KEYS, userData: any): void => {
    localStorage.setItem(TOKEN_KEYS[key], JSON.stringify(userData));
  },

  // Remove user data from localStorage
  removeUser: (key: keyof typeof TOKEN_KEYS): void => {
    localStorage.removeItem(TOKEN_KEYS[key]);
  }
};

// Axios header management
export const axiosHeaders = {
  // Set authorization header
  setAuthHeader: (token: string): void => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  // Set legacy x-auth-token header (for admin compatibility)
  setLegacyAuthHeader: (token: string): void => {
    axios.defaults.headers.common['x-auth-token'] = token;
  },

  // Remove authorization headers
  removeAuthHeaders: (): void => {
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

// Auth validation utilities
export const authValidation = {
  // Check if token exists and is valid format
  isValidToken: (token: string | null): boolean => {
    return token !== null && token.length > 0 && typeof token === 'string';
  },

  // Check if user data is valid
  isValidUser: (userData: any): boolean => {
    return userData !== null && typeof userData === 'object' && userData.id;
  }
};

// Common auth operations
export const authOperations = {
  // Clear all authentication data
  clearAllAuth: (): void => {
    tokenStorage.clearAllTokens();
    axiosHeaders.removeAuthHeaders();
  },

  // Set up admin authentication
  setupAdminAuth: (token: string, userData: any): void => {
    tokenStorage.setToken('ADMIN', token);
    userStorage.setUser('USER', userData);
    axiosHeaders.setAuthHeader(token);
    axiosHeaders.setLegacyAuthHeader(token);
  },

  // Set up vendor authentication
  setupVendorAuth: (token: string, userData: any): void => {
    tokenStorage.setToken('VENDOR', token);
    userStorage.setUser('VENDOR_USER', userData);
    axiosHeaders.setAuthHeader(token);
  },

  // Clear admin authentication
  clearAdminAuth: (): void => {
    tokenStorage.removeToken('ADMIN');
    userStorage.removeUser('USER');
    axiosHeaders.removeAuthHeaders();
  },

  // Clear vendor authentication
  clearVendorAuth: (): void => {
    tokenStorage.removeToken('VENDOR');
    userStorage.removeUser('VENDOR_USER');
    axiosHeaders.removeAuthHeaders();
  }
};

// API utilities
export const apiUtils = {
  // Get API URL from environment
  getApiUrl: (): string => {
    return process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  },

  // Create axios config with auth header
  createAuthConfig: (token: string): object => {
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }
};

// Export legacy compatibility function
export const clearAuthData = authOperations.clearAllAuth;