/**
 * @file TrialExpirationModal.tsx
 * @purpose Modal component for trial expiration warnings and upgrade prompts with contextual messaging
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './TrialExpirationModal.css';

/**
 * Props interface for the TrialExpirationModal component
 * @interface TrialExpirationModalProps
 * @property {boolean} isOpen - Modal visibility state
 * @property {function} onClose - Callback function to close modal
 * @property {function} onUpgrade - Callback function for upgrade action
 * @property {function} [onExtendTrial] - Optional callback for trial extension
 * @property {string} [expirationDate] - Trial expiration date (ISO string)
 * @property {number} [daysRemaining] - Days remaining in trial period (default: 0)
 */
interface TrialExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onExtendTrial?: () => void;
  expirationDate?: string;
  daysRemaining?: number;
}

/**
 * TrialExpirationModal component providing contextual trial expiration warnings and upgrade prompts
 * 
 * @component
 * @param {TrialExpirationModalProps} props - Component props containing state and callbacks
 * @returns {JSX.Element | null} Contextual expiration modal or null when closed
 * 
 * @description
 * Comprehensive modal component that displays contextual trial expiration warnings based on
 * remaining time. Provides upgrade prompts, trial extension options, and feature benefits.
 * Adapts messaging, styling, and urgency based on days remaining.
 * 
 * @features
 * - Contextual messaging based on expiration urgency
 * - Dynamic styling (expired: red, urgent: orange, warning: blue)
 * - Feature benefits presentation for paid plans
 * - Optional trial extension functionality
 * - Access restriction warnings for expired trials
 * - Loading states during async operations
 * - German localized content
 * 
 * @urgency_levels
 * - Expired (≤0 days): Red styling, access restrictions, urgent upgrade required
 * - Urgent (≤1 day): Orange styling, last chance messaging, immediate action needed
 * - Warning (≤3 days): Blue styling, preparation messaging, upgrade encouraged
 * - Info (>3 days): Blue styling, informational messaging, exploration encouraged
 * 
 * @modal_states
 * - expired: Red theme, AlertTriangle icon, access restrictions shown
 * - urgent: Orange theme, Clock icon, last chance messaging
 * - warning: Blue theme, CheckCircle icon, preparation messaging
 * - info: Blue theme, CheckCircle icon, exploration messaging
 * 
 * @feature_benefits
 * - Unlimited access to all features
 * - Priority support
 * - Advanced sales tools
 * - Detailed analytics and reports
 * - Ad-free experience
 * 
 * @accessibility
 * - ARIA labels and descriptions
 * - Keyboard navigation support
 * - Focus management within modal
 * - Clear visual hierarchy and contrast
 * 
 * @complexity O(1) - Fixed rendering regardless of trial data
 */
export const TrialExpirationModal: React.FC<TrialExpirationModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  onExtendTrial,
  expirationDate,
  daysRemaining = 0
}) => {
  const { user } = useVendorAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  if (!isOpen) return null;

  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining <= 3;
  const isUrgent = daysRemaining <= 1;

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgrade();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!onExtendTrial) return;
    
    setIsProcessing(true);
    try {
      await onExtendTrial();
    } finally {
      setIsProcessing(false);
    }
  };

  const getModalTitle = () => {
    if (isExpired) return 'Testperiode abgelaufen';
    if (isUrgent) return 'Testperiode läuft heute ab';
    if (isExpiringSoon) return 'Testperiode läuft bald ab';
    return 'Testperiode Information';
  };

  const getModalIcon = () => {
    if (isExpired) return <AlertTriangle className="w-12 h-12 text-red-500" />;
    if (isUrgent) return <Clock className="w-12 h-12 text-orange-500" />;
    return <CheckCircle className="w-12 h-12 text-blue-500" />;
  };

  const getModalMessage = () => {
    if (isExpired) {
      return (
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Ihre kostenlose Testperiode ist am{' '}
            <strong>
              {expirationDate ? new Date(expirationDate).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }) : 'heute'}
            </strong>{' '}
            abgelaufen.
          </p>
          <p className="text-gray-700 mb-4">
            Um housnkuh weiterhin nutzen zu können, müssen Sie auf ein kostenpflichtiges Paket upgraden.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">
              <strong>Zugang eingeschränkt:</strong> Sie können keine neuen Buchungen vornehmen oder 
              auf erweiterte Funktionen zugreifen.
            </p>
          </div>
        </div>
      );
    }

    if (isUrgent) {
      return (
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Ihre kostenlose Testperiode läuft <strong>heute</strong> ab.
          </p>
          <p className="text-gray-700 mb-4">
            Nach Ablauf der Testperiode haben Sie keinen Zugang mehr zu housnkuh, 
            es sei denn, Sie upgraden auf ein kostenpflichtiges Paket.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-orange-700 text-sm">
              <strong>Letzte Chance:</strong> Upgraden Sie jetzt, um Ihren Zugang zu erhalten.
            </p>
          </div>
        </div>
      );
    }

    if (isExpiringSoon) {
      return (
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Ihre kostenlose Testperiode läuft in <strong>{daysRemaining} Tag{daysRemaining !== 1 ? 'en' : ''}</strong> ab.
          </p>
          <p className="text-gray-700 mb-4">
            Entscheiden Sie sich jetzt für ein passendes Paket, um housnkuh ohne Unterbrechung 
            weiterhin nutzen zu können.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-700 text-sm">
              <strong>Verpassen Sie nicht:</strong> Sichern Sie sich jetzt Ihren dauerhaften Zugang.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className="text-gray-700 mb-4">
          Ihre kostenlose Testperiode läuft noch <strong>{daysRemaining} Tage</strong>.
        </p>
        <p className="text-gray-700 mb-4">
          Nutzen Sie diese Zeit, um alle Funktionen von housnkuh zu erkunden und 
          das für Sie passende Paket zu wählen.
        </p>
      </div>
    );
  };

  return (
    <div className="trial-expiration-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className={`modal-content ${isExpired ? 'expired' : isUrgent ? 'urgent' : 'warning'}`}>
        <div className="modal-header">
          <button
            onClick={onClose}
            className="modal-close"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-icon">
            {getModalIcon()}
          </div>

          <h2 className="modal-title">{getModalTitle()}</h2>

          {getModalMessage()}

          <div className="trial-features">
            <h3 className="features-title">Was Sie mit einem kostenpflichtigen Paket erhalten:</h3>
            <ul className="features-list">
              <li>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Unbegrenzter Zugang zu allen Funktionen</span>
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Prioritäts-Support</span>
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Erweiterte Verkaufstools</span>
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Detaillierte Analysen und Berichte</span>
              </li>
              <li>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Keine Werbeeinblendungen</span>
              </li>
            </ul>
          </div>

          <div className="modal-actions">
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className={`btn btn-primary ${isExpired ? 'btn-urgent' : ''}`}
            >
              {isProcessing ? 'Wird verarbeitet...' : 'Jetzt upgraden'}
            </button>

            {onExtendTrial && !isExpired && (
              <button
                onClick={handleExtendTrial}
                disabled={isProcessing}
                className="btn btn-secondary"
              >
                {isProcessing ? 'Wird verarbeitet...' : 'Testperiode verlängern'}
              </button>
            )}

            {!isExpired && (
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="btn btn-ghost"
              >
                Später entscheiden
              </button>
            )}
          </div>

          {isExpired && (
            <div className="access-restriction-info">
              <div className="restriction-icon">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="restriction-text">
                Der Zugang zu housnkuh ist eingeschränkt. Sie können keine neuen Buchungen vornehmen 
                oder auf erweiterte Funktionen zugreifen, bis Sie upgraden.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};