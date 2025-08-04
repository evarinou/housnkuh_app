/**
 * Vendor Provider Wrapper - Provides vendor authentication context for vendor routes
 */

import React, { ReactNode } from 'react';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

interface VendorProviderWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides vendor authentication context
 * Used for vendor routes that require vendor authentication
 */
export const VendorProviderWrapper: React.FC<VendorProviderWrapperProps> = ({ children }) => (
  <VendorAuthProvider>
    {children}
  </VendorAuthProvider>
);

export default VendorProviderWrapper;