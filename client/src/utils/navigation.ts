import { NavigateFunction } from 'react-router-dom';

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
}

export class NavigationHelper {
  private navigate: NavigateFunction;

  constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  // Vendor routes
  goToVendorDashboard(options?: NavigationOptions) {
    this.navigate('/vendor/dashboard', options);
  }

  goToVendorLogin(options?: NavigationOptions) {
    this.navigate('/vendor/login', options);
  }

  goToVendorUpgrade(options?: NavigationOptions) {
    this.navigate('/vendor/upgrade', options);
  }

  goToVendorTrialInfo(options?: NavigationOptions) {
    this.navigate('/vendor/trial-info', options);
  }

  goToVendorCancel(options?: NavigationOptions) {
    this.navigate('/vendor/settings/cancel', options);
  }

  // Admin routes
  goToAdminLogin(options?: NavigationOptions) {
    this.navigate('/admin/login', options);
  }

  goToAdminDashboard(options?: NavigationOptions) {
    this.navigate('/admin/dashboard', options);
  }

  // Public routes
  goToHome(options?: NavigationOptions) {
    this.navigate('/', options);
  }

  goToDirectMarketers(options?: NavigationOptions) {
    this.navigate('/direktvermarkter', options);
  }

  // Generic navigation
  goTo(path: string, options?: NavigationOptions) {
    this.navigate(path, options);
  }

  // Back navigation
  goBack() {
    window.history.back();
  }

  // Replace current route
  replace(path: string, state?: any) {
    this.navigate(path, { replace: true, state });
  }
}

// Hook to use navigation helper
export const createNavigationHelper = (navigate: NavigateFunction): NavigationHelper => {
  return new NavigationHelper(navigate);
};

// Route guards
export const isVendorRoute = (pathname: string): boolean => {
  return pathname.startsWith('/vendor');
};

export const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

export const isPublicRoute = (pathname: string): boolean => {
  return !isVendorRoute(pathname) && !isAdminRoute(pathname);
};

// Safe navigation function that checks for valid routes
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