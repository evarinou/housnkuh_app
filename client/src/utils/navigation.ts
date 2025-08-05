/**
 * @file navigation.ts
 * @purpose Navigation utilities and route helpers for React Router with dual auth system support
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { NavigateFunction } from 'react-router-dom';

/**
 * Options for navigation methods
 * @interface NavigationOptions
 */
export interface NavigationOptions {
  /** Whether to replace current entry in history stack */
  replace?: boolean;
  /** Optional state to pass with navigation */
  state?: any;
}

/**
 * Navigation helper class for consistent routing across the application
 * 
 * @description Provides typed navigation methods for all major routes,
 * supporting both admin and vendor route systems with consistent options.
 * 
 * @class NavigationHelper
 */
export class NavigationHelper {
  private navigate: NavigateFunction;

  /**
   * Create navigation helper instance
   * @param {NavigateFunction} navigate - React Router navigate function
   */
  constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  /**
   * Navigate to vendor dashboard
   * @param {NavigationOptions} options - Navigation options
   */
  goToVendorDashboard(options?: NavigationOptions) {
    this.navigate('/vendor/dashboard', options);
  }

  /**
   * Navigate to vendor login page
   * @param {NavigationOptions} options - Navigation options
   */
  goToVendorLogin(options?: NavigationOptions) {
    this.navigate('/vendor/login', options);
  }

  /**
   * Navigate to vendor upgrade page
   * @param {NavigationOptions} options - Navigation options
   */
  goToVendorUpgrade(options?: NavigationOptions) {
    this.navigate('/vendor/upgrade', options);
  }

  /**
   * Navigate to vendor trial information page
   * @param {NavigationOptions} options - Navigation options
   */
  goToVendorTrialInfo(options?: NavigationOptions) {
    this.navigate('/vendor/trial-info', options);
  }

  /**
   * Navigate to vendor cancellation page
   * @param {NavigationOptions} options - Navigation options
   */
  goToVendorCancel(options?: NavigationOptions) {
    this.navigate('/vendor/settings/cancel', options);
  }

  /**
   * Navigate to admin login page
   * @param {NavigationOptions} options - Navigation options
   */
  goToAdminLogin(options?: NavigationOptions) {
    this.navigate('/admin/login', options);
  }

  /**
   * Navigate to admin dashboard
   * @param {NavigationOptions} options - Navigation options
   */
  goToAdminDashboard(options?: NavigationOptions) {
    this.navigate('/admin/dashboard', options);
  }

  /**
   * Navigate to home page
   * @param {NavigationOptions} options - Navigation options
   */
  goToHome(options?: NavigationOptions) {
    this.navigate('/', options);
  }

  /**
   * Navigate to direct marketers page
   * @param {NavigationOptions} options - Navigation options
   */
  goToDirectMarketers(options?: NavigationOptions) {
    this.navigate('/direktvermarkter', options);
  }

  /**
   * Navigate to any path
   * @param {string} path - Route path to navigate to
   * @param {NavigationOptions} options - Navigation options
   */
  goTo(path: string, options?: NavigationOptions) {
    this.navigate(path, options);
  }

  /**
   * Navigate back in browser history
   * @description Uses browser's back functionality
   */
  goBack() {
    window.history.back();
  }

  /**
   * Replace current route in history stack
   * @param {string} path - Route path to navigate to
   * @param {any} state - Optional state to pass with navigation
   */
  replace(path: string, state?: any) {
    this.navigate(path, { replace: true, state });
  }
}

/**
 * Create navigation helper instance from navigate function
 * @param {NavigateFunction} navigate - React Router navigate function
 * @returns {NavigationHelper} Configured navigation helper instance
 */
export const createNavigationHelper = (navigate: NavigateFunction): NavigationHelper => {
  return new NavigationHelper(navigate);
};

/**
 * Check if pathname is a vendor route
 * @param {string} pathname - Current pathname to check
 * @returns {boolean} True if path starts with /vendor
 */
export const isVendorRoute = (pathname: string): boolean => {
  return pathname.startsWith('/vendor');
};

/**
 * Check if pathname is an admin route
 * @param {string} pathname - Current pathname to check
 * @returns {boolean} True if path starts with /admin
 */
export const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Check if pathname is a public route
 * @param {string} pathname - Current pathname to check
 * @returns {boolean} True if path is neither vendor nor admin route
 */
export const isPublicRoute = (pathname: string): boolean => {
  return !isVendorRoute(pathname) && !isAdminRoute(pathname);
};

/**
 * Safe navigation function with error handling and fallback
 * @param {NavigateFunction} navigate - React Router navigate function
 * @param {string} path - Route path to navigate to
 * @param {NavigationOptions} options - Navigation options
 * @description Attempts navigation with fallback to home page on error
 */
export const safeNavigate = (
  navigate: NavigateFunction,
  path: string,
  options?: NavigationOptions
): void => {
  try {
    navigate(path, options);
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to home page
    navigate('/', { replace: true });
  }
};