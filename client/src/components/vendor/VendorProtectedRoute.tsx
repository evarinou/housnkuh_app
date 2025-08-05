/**
 * @file VendorProtectedRoute.tsx
 * @purpose Route protection component ensuring only authenticated vendors access protected pages with trial status verification
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

/**
 * VendorProtectedRoute component for vendor authentication enforcement
 * 
 * @component
 * @returns {JSX.Element} Protected route outlet or redirect to login
 * 
 * @description
 * This component acts as a route guard for vendor-specific pages.
 * It checks vendor authentication status and provides appropriate
 * routing based on authentication state.
 * 
 * @authentication
 * - Verifies vendor JWT token validity
 * - Redirects unauthenticated users to vendor login
 * - Shows loading state during authentication check
 * 
 * @example
 * <Route element={<VendorProtectedRoute />}>
 *   <Route path="dashboard" element={<VendorDashboard />} />
 *   <Route path="profile" element={<VendorProfile />} />
 * </Route>
 * 
 * @complexity O(1) - Simple authentication check
 */
const VendorProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useVendorAuth();

  /**
   * Display loading indicator during authentication verification
   * Prevents flash of unauthorized content during auth check
   */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Authentifizierung wird überprüft...</span>
      </div>
    );
  }

  /**
   * Redirect to vendor login if not authenticated
   * Uses replace to prevent back navigation to protected route
   */
  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" replace />;
  }

  /**
   * Render protected route content via React Router Outlet
   * All child routes will have guaranteed authentication
   */
  return <Outlet />;
};

export default VendorProtectedRoute;