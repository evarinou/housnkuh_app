import React, { useState } from 'react';
import { X, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import './TrialExpirationModal.css';

interface TrialExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onExtendTrial?: () => void;
  expirationDate?: string;
  daysRemaining?: number;
}

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