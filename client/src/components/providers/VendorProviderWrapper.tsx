/**
 * @file VendorProviderWrapper.tsx
 * @purpose Provider wrapper component that encapsulates vendor authentication context for vendor-only routes
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { ReactNode } from 'react';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

/**
 * Props interface for VendorProviderWrapper component
 * @interface VendorProviderWrapperProps
 */
interface VendorProviderWrapperProps {
  /** Child components that require vendor authentication context */
  children: ReactNode;
}

/**
 * Vendor Provider Wrapper component that provides authentication context specifically for vendor routes.
 * 
 * Purpose:
 * - Encapsulates vendor authentication logic and state management
 * - Provides clean separation between vendor and admin authentication contexts
 * - Ensures vendor routes have access to proper authentication state
 * - Simplifies provider composition for vendor-specific functionality
 * 
 * Features:
 * - Wraps children with VendorAuthProvider (vendor-specific context)
 * - Enables vendor authentication state throughout component tree
 * - Supports vendor login/logout, session management, and route protection
 * - Clean abstraction for vendor authentication requirements
 * - Vendor-specific data access and permissions
 * 
 * Usage:
 * Typically used in vendor route layouts or vendor-specific page wrappers
 * to ensure all child components have access to vendor authentication state.
 * Essential for vendor dashboard, product management, and vendor-specific features.
 * 
 * @component
 * @param {VendorProviderWrapperProps} props - Component props
 * @returns {JSX.Element} Provider wrapper with vendor authentication context
 */
export const VendorProviderWrapper: React.FC<VendorProviderWrapperProps> = ({ children }) => (
  <VendorAuthProvider>
    {children}
  </VendorAuthProvider>
);

export default VendorProviderWrapper;