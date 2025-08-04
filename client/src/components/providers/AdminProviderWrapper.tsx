/**
 * Admin Provider Wrapper - Provides authentication context for admin routes
 */

import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';

interface AdminProviderWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides admin authentication context
 * Used for admin routes that require admin authentication
 */
export const AdminProviderWrapper: React.FC<AdminProviderWrapperProps> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

export default AdminProviderWrapper;