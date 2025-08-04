/**
 * Shared Provider Wrapper - Provides both admin and vendor authentication contexts
 * Used for routes that need access to both authentication systems
 */

import React, { ReactNode } from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

interface SharedProviderWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides both admin and vendor authentication contexts
 * Used for routes that need access to both authentication systems
 * Note: This maintains the same nesting order as the original global setup
 */
export const SharedProviderWrapper: React.FC<SharedProviderWrapperProps> = ({ children }) => (
  <AuthProvider>
    <VendorAuthProvider>
      {children}
    </VendorAuthProvider>
  </AuthProvider>
);

export default SharedProviderWrapper;