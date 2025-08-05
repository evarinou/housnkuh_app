/**
 * @file AdminProviderWrapper.tsx
 * @purpose Provider wrapper component that encapsulates admin authentication context for admin-only routes
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';

/**
 * Props interface for AdminProviderWrapper component
 * @interface AdminProviderWrapperProps
 */
interface AdminProviderWrapperProps {
  /** Child components that require admin authentication context */
  children: ReactNode;
}

/**
 * Admin Provider Wrapper component that provides authentication context specifically for admin routes.
 * 
 * Purpose:
 * - Encapsulates admin authentication logic and state management
 * - Provides clean separation between admin and vendor authentication contexts
 * - Ensures admin routes have access to proper authentication state
 * - Simplifies provider composition for admin-specific functionality
 * 
 * Features:
 * - Wraps children with AuthProvider (admin-specific context)
 * - Enables admin authentication state throughout component tree
 * - Supports admin login/logout, session management, and route protection
 * - Clean abstraction for admin authentication requirements
 * 
 * Usage:
 * Typically used in admin route layouts or admin-specific page wrappers
 * to ensure all child components have access to admin authentication state.
 * 
 * @component
 * @param {AdminProviderWrapperProps} props - Component props
 * @returns {JSX.Element} Provider wrapper with admin authentication context
 */
export const AdminProviderWrapper: React.FC<AdminProviderWrapperProps> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

export default AdminProviderWrapper;