import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { createNavigationHelper } from '../../utils/navigation';
import './TrialStatusWidget.css';

interface TrialStatusWidgetProps {
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

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