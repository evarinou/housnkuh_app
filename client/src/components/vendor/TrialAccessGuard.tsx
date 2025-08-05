/**
 * @file TrialAccessGuard.tsx
 * @purpose Critical trial access control component managing feature access based on trial status with modal integration
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { createNavigationHelper } from '../../utils/navigation';
import { TrialExpirationModal } from './TrialExpirationModal';
import { useTrialExpiration } from '../../hooks/useTrialExpiration';

/**
 * Props interface for the TrialAccessGuard component
 * @interface TrialAccessGuardProps
 * @property {React.ReactNode} children - Components to render when access is granted
 * @property {boolean} requiresFullAccess - Whether this component requires full access (blocks expired trials)
 * @property {React.ReactNode} fallbackComponent - Custom component to show when access is denied
 */
interface TrialAccessGuardProps {
  children: React.ReactNode;
  requiresFullAccess?: boolean;
  fallbackComponent?: React.ReactNode;
}

/**
 * TrialAccessGuard component providing granular access control for trial users
 * 
 * @component
 * @param {TrialAccessGuardProps} props - Component props
 * @returns {JSX.Element} Children components with conditional access control
 * 
 * @description
 * Critical component for trial access management. Controls feature availability
 * based on trial status and expiration dates. Integrates with TrialExpirationModal
 * for seamless user experience during trial transitions.
 * 
 * @example
 * // Allow trial users with fallback for expired trials
 * <TrialAccessGuard requiresFullAccess={true}>
 *   <PremiumFeature />
 * </TrialAccessGuard>
 * 
 * @example  
 * // Always allow access but show expiration warnings
 * <TrialAccessGuard>
 *   <BasicFeature />
 * </TrialAccessGuard>
 * 
 * @access_control
 * - Non-trial users: Full access always granted
 * - Active trial users: Access granted with modal warnings
 * - Expired trial users: Conditional access based on requiresFullAccess
 * 
 * @business_logic
 * - Integrates with useTrialExpiration hook for state management
 * - Manages modal display timing and user interactions
 * - Provides upgrade flow navigation
 * 
 * @complexity O(1) - Simple conditional rendering based on trial state
 */
export const TrialAccessGuard: React.FC<TrialAccessGuardProps> = ({
  children,
  requiresFullAccess = false,
  fallbackComponent,
}) => {
  const { user } = useVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const { trialState, dismissModal, handleUpgrade, handleCancelTrial } = useTrialExpiration();

  /**
   * Grant full access to non-trial users
   * Users with completed registrations or other statuses bypass trial restrictions
   */
  if (!user || user.registrationStatus !== 'trial_active') {
    return <>{children}</>;
  }

  /**
   * Conditional modal rendering based on trial expiration state
   * Shows expiration warnings and upgrade prompts
   */
  const modalComponent = trialState.shouldShowModal && (
    <TrialExpirationModal
      isOpen={true}
      onClose={dismissModal}
      onUpgrade={handleUpgrade}
      onExtendTrial={handleCancelTrial}
      expirationDate={trialState.expirationDate}
      daysRemaining={trialState.daysRemaining}
    />
  );

  /**
   * Block access for expired trials requiring full access
   * Shows fallback component or default expired message
   */
  if (trialState.isExpired && requiresFullAccess) {
    return (
      <>
        {fallbackComponent || <TrialExpiredFallback />}
        {modalComponent}
      </>
    );
  }

  /**
   * Allow access with modal overlay for trial warnings
   * Standard behavior for most components
   */
  return (
    <>
      {children}
      {modalComponent}
    </>
  );
};

/**
 * Default fallback component for expired trial access
 * 
 * @component
 * @returns {JSX.Element} Warning message with upgrade call-to-action
 * 
 * @description
 * Displays when trial has expired and component requires full access.
 * Provides clear messaging and direct navigation to upgrade flow.
 */
const TrialExpiredFallback: React.FC = () => {
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  
  return (
  <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
    <div className="text-red-500 mb-4">
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-red-800 mb-2">Zugang eingeschränkt</h3>
    <p className="text-red-700 text-center mb-4">
      Ihre Testperiode ist abgelaufen. Um auf diese Funktion zugreifen zu können, 
      müssen Sie auf ein kostenpflichtiges Paket upgraden.
    </p>
    <button
      onClick={() => navigationHelper.goToVendorUpgrade()}
      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      Jetzt upgraden
    </button>
  </div>
  );
};