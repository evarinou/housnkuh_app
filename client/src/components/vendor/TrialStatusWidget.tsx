/**
 * @file TrialStatusWidget.tsx
 * @purpose Compact trial status widget with real-time countdown and progress visualization for trial management
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { createNavigationHelper } from '../../utils/navigation';
import './TrialStatusWidget.css';

/**
 * Props interface for the TrialStatusWidget component
 * @interface TrialStatusWidgetProps
 * @property {boolean} [compact] - Whether to render in compact mode (reduced information display)
 * @property {boolean} [showActions] - Whether to show action buttons (upgrade, info)
 * @property {string} [className] - Additional CSS classes for styling customization
 */
interface TrialStatusWidgetProps {
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

/**
 * Interface for remaining time calculation display
 * @interface TimeRemaining
 * @property {number} days - Days remaining in trial period
 * @property {number} hours - Hours remaining (0-23)
 * @property {number} minutes - Minutes remaining (0-59)
 * @property {number} seconds - Seconds remaining (0-59)
 */
interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * TrialStatusWidget component providing compact trial status visualization with real-time countdown
 * 
 * @component
 * @param {TrialStatusWidgetProps} props - Component props for customization and behavior
 * @returns {JSX.Element | null} Compact trial status widget or null if not in trial
 * 
 * @description
 * Compact widget component designed for embedding in layouts to show trial status at a glance.
 * Features real-time countdown, progress visualization, and contextual action buttons.
 * Automatically updates every second and adapts styling based on urgency.
 * 
 * @features
 * - Real-time countdown display (days:hours:minutes:seconds)
 * - Progress bar showing trial completion percentage
 * - Contextual styling based on urgency (active, warning, urgent)
 * - Compact mode for space-constrained layouts
 * - Action buttons for upgrade and information navigation
 * - Automatic updates every second
 * - German localized text and time formatting
 * 
 * @trial_management
 * - Only renders for users with 'trial_active' registration status
 * - Calculates progress from trial start to end dates
 * - Urgency levels: active (>3 days), warning (≤3 days), urgent (≤1 day)
 * - Zero-padded time formatting for consistent display
 * 
 * @modes
 * - Full mode: Complete countdown with seconds, progress bar, full actions
 * - Compact mode: Days/hours/minutes only, condensed layout, single action
 * 
 * @navigation_integration
 * - Uses navigationHelper for consistent routing
 * - Upgrade button → vendor upgrade flow
 * - Info button → trial information page
 * 
 * @performance
 * - 1-second interval updates for real-time display
 * - Automatic cleanup on component unmount
 * - Conditional rendering to minimize DOM updates
 * 
 * @complexity O(1) - Fixed calculations and rendering regardless of data size
 */
export const TrialStatusWidget: React.FC<TrialStatusWidgetProps> = ({ 
  compact = false, 
  showActions = true,
  className = ''
}) => {
  const { user } = useVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    if (!user?.trialEndDate) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(user.trialEndDate!);
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setProgressPercentage(100);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });

      // Calculate progress percentage
      if (user.trialStartDate) {
        const startDate = new Date(user.trialStartDate);
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        setProgressPercentage(progress);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [user?.trialEndDate, user?.trialStartDate]);

  if (!user || user.registrationStatus !== 'trial_active') {
    return null;
  }

  const isExpiringSoon = timeRemaining.days <= 3;
  const isUrgent = timeRemaining.days <= 1;

  const getStatusColor = () => {
    if (isUrgent) return 'urgent';
    if (isExpiringSoon) return 'warning';
    return 'active';
  };

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className={`trial-status-widget ${compact ? 'compact' : ''} ${getStatusColor()} ${className}`}>
      <div className="trial-status-header">
        <div className="status-indicator">
          <div className="indicator-dot"></div>
          <span className="status-text">
            {isUrgent ? 'Testperiode läuft bald ab' : isExpiringSoon ? 'Testperiode endet bald' : 'Testperiode aktiv'}
          </span>
        </div>
        {!compact && (
          <div className="trial-days-left">
            {timeRemaining.days > 0 ? `${timeRemaining.days} Tag${timeRemaining.days !== 1 ? 'e' : ''}` : 'Weniger als 1 Tag'}
          </div>
        )}
      </div>

      <div className="trial-countdown">
        <div className="countdown-display">
          <div className="time-unit">
            <span className="time-value">{formatTime(timeRemaining.days)}</span>
            <span className="time-label">Tage</span>
          </div>
          <div className="time-separator">:</div>
          <div className="time-unit">
            <span className="time-value">{formatTime(timeRemaining.hours)}</span>
            <span className="time-label">Std</span>
          </div>
          <div className="time-separator">:</div>
          <div className="time-unit">
            <span className="time-value">{formatTime(timeRemaining.minutes)}</span>
            <span className="time-label">Min</span>
          </div>
          {!compact && (
            <>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="time-value">{formatTime(timeRemaining.seconds)}</span>
                <span className="time-label">Sek</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="trial-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {Math.round(progressPercentage)}% der Testperiode verstrichen
        </div>
      </div>

      {showActions && !compact && (
        <div className="trial-actions">
          <button 
            className="btn btn-primary upgrade-btn"
            onClick={() => navigationHelper.goToVendorUpgrade()}
          >
            Jetzt upgraden
          </button>
          <button 
            className="btn btn-secondary info-btn"
            onClick={() => navigationHelper.goToVendorTrialInfo()}
          >
            Mehr Infos
          </button>
        </div>
      )}

      {compact && showActions && (
        <div className="trial-actions-compact">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => navigationHelper.goToVendorUpgrade()}
          >
            Upgraden
          </button>
        </div>
      )}
    </div>
  );
};