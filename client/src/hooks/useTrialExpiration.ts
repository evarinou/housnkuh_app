import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { createNavigationHelper } from '../utils/navigation';

interface TrialExpirationState {
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isUrgent: boolean;
  shouldShowModal: boolean;
  expirationDate: string | undefined;
}

// Safe hook wrapper that handles missing context
const useSafeVendorAuth = () => {
  try {
    return useVendorAuth();
  } catch {
    return { 
      isAuthenticated: false, 
      user: null,
      isLoading: false
    };
  }
};

export const useTrialExpiration = () => {
  const { user } = useSafeVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const [modalShown, setModalShown] = useState(false);
  const [trialState, setTrialState] = useState<TrialExpirationState>({
    daysRemaining: 0,
    isExpired: false,
    isExpiringSoon: false,
    isUrgent: false,
    shouldShowModal: false,
    expirationDate: undefined,
  });

  useEffect(() => {
    if (!user?.trialEndDate || user.registrationStatus !== 'trial_active') {
      setTrialState(prev => ({
        ...prev,
        shouldShowModal: false,
      }));
      return;
    }

    const calculateTrialState = () => {
      const now = new Date();
      const endDate = new Date(user.trialEndDate!);
      const timeDiff = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      const isExpired = daysRemaining <= 0;
      const isExpiringSoon = daysRemaining <= 3;
      const isUrgent = daysRemaining <= 1;

      // Determine if modal should be shown
      const shouldShowModal = !modalShown && (
        isExpired || 
        isUrgent || 
        (isExpiringSoon && !localStorage.getItem(`trial_warning_shown_${user.id}`))
      );

      setTrialState({
        daysRemaining: Math.max(0, daysRemaining),
        isExpired,
        isExpiringSoon,
        isUrgent,
        shouldShowModal,
        expirationDate: user.trialEndDate || undefined,
      });
    };

    calculateTrialState();
    const interval = setInterval(calculateTrialState, 1000 * 60 * 60); // Check every hour

    return () => clearInterval(interval);
  }, [user?.trialEndDate, user?.registrationStatus, user?.id, modalShown]);

  const dismissModal = () => {
    setModalShown(true);
    
    // Store that warning was shown for non-expired trials
    if (!trialState.isExpired && user?.id) {
      localStorage.setItem(`trial_warning_shown_${user.id}`, 'true');
    }
    
    setTrialState(prev => ({
      ...prev,
      shouldShowModal: false,
    }));
  };

  const handleUpgrade = () => {
    // No upgrade needed - just close the modal as transition is automatic
    dismissModal();
  };

  const handleCancelTrial = async () => {
    // Navigate to cancellation flow
    navigationHelper.goToVendorCancel();
  };

  return {
    trialState,
    dismissModal,
    handleUpgrade,
    handleCancelTrial,
  };
};