/**
 * @file SharedProviderWrapper.tsx
 * @purpose Provider wrapper component that combines both admin and vendor authentication contexts for multi-role functionality
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

/**
 * Props interface for SharedProviderWrapper component
 * @interface SharedProviderWrapperProps
 */
interface SharedProviderWrapperProps {
  /** Child components that require both admin and vendor authentication contexts */
  children: ReactNode;
}

/**
 * Shared Provider Wrapper component that provides both admin and vendor authentication contexts.
 * 
 * Purpose:
 * - Enables dual authentication context access for complex multi-role scenarios
 * - Maintains proper provider nesting order to prevent context conflicts
 * - Provides unified authentication state for components that need both contexts
 * - Supports admin-vendor interaction features and cross-system functionality
 * 
 * Features:
 * - Nested provider composition (AuthProvider wraps VendorAuthProvider)
 * - Consistent with global provider hierarchy to prevent context issues
 * - Enables admin oversight of vendor operations
 * - Supports hybrid authentication scenarios
 * - Clean abstraction for multi-context authentication requirements
 * 
 * Provider Nesting Order (Important):
 * - AuthProvider (admin) as outer provider
 * - VendorAuthProvider (vendor) as inner provider
 * - This order matches the original global setup to maintain consistency
 * 
 * Usage:
 * Typically used for:
 * - Admin pages that need vendor context access (e.g., vendor management)
 * - Cross-system reporting and analytics
 * - Features requiring both admin and vendor data
 * - Transition routes where users might have both roles
 * 
 * @component
 * @param {SharedProviderWrapperProps} props - Component props
 * @returns {JSX.Element} Provider wrapper with both authentication contexts
 */
export const SharedProviderWrapper: React.FC<SharedProviderWrapperProps> = ({ children }) => (
  <AuthProvider>
    <VendorAuthProvider>
      {children}
    </VendorAuthProvider>
  </AuthProvider>
);

export default SharedProviderWrapper;