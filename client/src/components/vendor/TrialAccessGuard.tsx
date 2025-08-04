import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { createNavigationHelper } from '../../utils/navigation';
import { TrialExpirationModal } from './TrialExpirationModal';
import { useTrialExpiration } from '../../hooks/useTrialExpiration';

interface TrialAccessGuardProps {
  children: React.ReactNode;
  requiresFullAccess?: boolean;
  fallbackComponent?: React.ReactNode;
}

export const TrialAccessGuard: React.FC<TrialAccessGuardProps> = ({
  children,
  requiresFullAccess = false,
  fallbackComponent,
}) => {
  const { user } = useVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const { trialState, dismissModal, handleUpgrade, handleCancelTrial } = useTrialExpiration();

  // If user is not on trial, allow full access
  if (!user || user.registrationStatus !== 'trial_active') {
    return <>{children}</>;
  }

  // Show modal if needed
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

  // If trial is expired and component requires full access, show fallback
  if (trialState.isExpired && requiresFullAccess) {
    return (
      <>
        {fallbackComponent || <TrialExpiredFallback />}
        {modalComponent}
      </>
    );
  }

  // Otherwise, show children with modal if needed
  return (
    <>
      {children}
      {modalComponent}
    </>
  );
};

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