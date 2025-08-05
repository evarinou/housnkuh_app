/**
 * @file auth.ts
 * @purpose Centralized authentication utilities for dual auth system (admin/vendor) with token management and axios integration
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import axios from 'axios';

/**
 * Standardized localStorage keys for dual authentication system
 * @constant
 */
export const TOKEN_KEYS = {
  /** Admin authentication token key */
  ADMIN: 'adminToken',
  /** Vendor authentication token key */
  VENDOR: 'vendorToken',
  /** Admin user data key */
  USER: 'user',
  /** Vendor user data key */
  VENDOR_USER: 'vendorUser'
} as const;

/**
 * Token storage utilities for localStorage management
 * @namespace tokenStorage
 */
export const tokenStorage = {
  /**
   * Get authentication token from localStorage
   * @param {keyof typeof TOKEN_KEYS} key - Token key identifier
   * @returns {string | null} Token string or null if not found
   */
  getToken: (key: keyof typeof TOKEN_KEYS): string | null => {
    return localStorage.getItem(TOKEN_KEYS[key]);
  },

  /**
   * Set authentication token in localStorage
   * @param {keyof typeof TOKEN_KEYS} key - Token key identifier
   * @param {string} token - Token string to store
   */
  setToken: (key: keyof typeof TOKEN_KEYS, token: string): void => {
    localStorage.setItem(TOKEN_KEYS[key], token);
  },

  /**
   * Remove authentication token from localStorage
   * @param {keyof typeof TOKEN_KEYS} key - Token key identifier
   */
  removeToken: (key: keyof typeof TOKEN_KEYS): void => {
    localStorage.removeItem(TOKEN_KEYS[key]);
  },

  /**
   * Clear all authentication tokens from localStorage
   * @description Removes all tokens defined in TOKEN_KEYS
   */
  clearAllTokens: (): void => {
    Object.values(TOKEN_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};

/**
 * User data storage utilities for localStorage management
 * @namespace userStorage
 */
export const userStorage = {
  /**
   * Get user data from localStorage with JSON parsing
   * @param {keyof typeof TOKEN_KEYS} key - User data key identifier
   * @returns {any | null} Parsed user data object or null if not found
   */
  getUser: (key: keyof typeof TOKEN_KEYS): any | null => {
    const userData = localStorage.getItem(TOKEN_KEYS[key]);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Set user data in localStorage with JSON serialization
   * @param {keyof typeof TOKEN_KEYS} key - User data key identifier
   * @param {any} userData - User data object to store
   */
  setUser: (key: keyof typeof TOKEN_KEYS, userData: any): void => {
    localStorage.setItem(TOKEN_KEYS[key], JSON.stringify(userData));
  },

  /**
   * Remove user data from localStorage
   * @param {keyof typeof TOKEN_KEYS} key - User data key identifier
   */
  removeUser: (key: keyof typeof TOKEN_KEYS): void => {
    localStorage.removeItem(TOKEN_KEYS[key]);
  }
};

/**
 * Axios header management utilities for authentication
 * @namespace axiosHeaders
 */
export const axiosHeaders = {
  /**
   * Set Bearer token authorization header for axios requests
   * @param {string} token - Authentication token
   */
  setAuthHeader: (token: string): void => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /**
   * Set legacy x-auth-token header for admin compatibility
   * @param {string} token - Authentication token
   * @description Used for backward compatibility with legacy admin endpoints
   */
  setLegacyAuthHeader: (token: string): void => {
    axios.defaults.headers.common['x-auth-token'] = token;
  },

  /**
   * Remove all authentication headers from axios defaults
   * @description Clears both Bearer Authorization and x-auth-token headers
   */
  removeAuthHeaders: (): void => {
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

/**
 * Authentication validation utilities
 * @namespace authValidation
 */
export const authValidation = {
  /**
   * Check if token exists and has valid format
   * @param {string | null} token - Token to validate
   * @returns {boolean} True if token is valid string with content
   */
  isValidToken: (token: string | null): boolean => {
    return token !== null && token.length > 0 && typeof token === 'string';
  },

  /**
   * Check if user data object is valid
   * @param {any} userData - User data to validate
   * @returns {boolean} True if userData is object with required id field
   */
  isValidUser: (userData: any): boolean => {
    return userData !== null && typeof userData === 'object' && userData.id;
  }
};

/**
 * Common authentication operations for dual auth system
 * @namespace authOperations
 */
export const authOperations = {
  /**
   * Clear all authentication data (tokens, users, headers)
   * @description Complete logout function that clears all auth state
   */
  clearAllAuth: (): void => {
    tokenStorage.clearAllTokens();
    axiosHeaders.removeAuthHeaders();
  },

  /**
   * Set up complete admin authentication
   * @param {string} token - Admin authentication token
   * @param {any} userData - Admin user data object
   * @description Sets token, user data, and both Bearer and legacy headers
   */
  setupAdminAuth: (token: string, userData: any): void => {
    tokenStorage.setToken('ADMIN', token);
    userStorage.setUser('USER', userData);
    axiosHeaders.setAuthHeader(token);
    axiosHeaders.setLegacyAuthHeader(token);
  },

  /**
   * Set up complete vendor authentication
   * @param {string} token - Vendor authentication token
   * @param {any} userData - Vendor user data object
   * @description Sets token, user data, and Bearer header (no legacy header)
   */
  setupVendorAuth: (token: string, userData: any): void => {
    tokenStorage.setToken('VENDOR', token);
    userStorage.setUser('VENDOR_USER', userData);
    axiosHeaders.setAuthHeader(token);
  },

  /**
   * Clear admin authentication data
   * @description Removes admin token, user data, and headers
   */
  clearAdminAuth: (): void => {
    tokenStorage.removeToken('ADMIN');
    userStorage.removeUser('USER');
    axiosHeaders.removeAuthHeaders();
  },

  /**
   * Clear vendor authentication data
   * @description Removes vendor token, user data, and headers
   */
  clearVendorAuth: (): void => {
    tokenStorage.removeToken('VENDOR');
    userStorage.removeUser('VENDOR_USER');
    axiosHeaders.removeAuthHeaders();
  }
};

/**
 * API utilities for request configuration
 * @namespace apiUtils
 */
export const apiUtils = {
  /**
   * Get API base URL from environment variables
   * @returns {string} API URL with fallback to localhost
   */
  getApiUrl: (): string => {
    return process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  },

  /**
   * Create axios configuration object with authentication header
   * @param {string} token - Authentication token
   * @returns {object} Axios config object with Authorization header
   */
  createAuthConfig: (token: string): object => {
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }
};

/**
 * Legacy compatibility function for clearing authentication data
 * @deprecated Use authOperations.clearAllAuth instead
 */
export const clearAuthData = authOperations.clearAllAuth;