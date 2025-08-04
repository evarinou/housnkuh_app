import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Info, Check, AlertCircle } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { createNavigationHelper } from '../../utils/navigation';
import './TrialTransitionModal.css';

interface TrialTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  daysRemaining?: number;
}

export const TrialTransitionModal: React.FC<TrialTransitionModalProps> = ({
  isOpen,
  onClose,
  daysRemaining = 0
}) => {
  const { user } = useVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  
  // Get the user's calculated monthly package price
  // This should come from their selected packages + addons + zusatzleistungen
  const monthlyPrice = user?.calculatedMonthlyPrice || 0;
  const hasPackageData = !!user?.packageSummary;
  
  if (!isOpen) return null;

  const isExpired = daysRemaining <= 0;
  const isLastDay = daysRemaining === 1;
  const isExpiringSoon = daysRemaining <= 3;

  return (
    <div className="trial-transition-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            {isExpired ? 'Testperiode beendet' : 
             isLastDay ? 'Letzter Tag der Testperiode' : 
             'Testperiode läuft aus'}
          </h2>
          <button 
            onClick={onClose} 
            className="modal-close"
            aria-label="close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="modal-body">
          <div className={`status-icon ${isExpired ? 'expired' : isExpiringSoon ? 'warning' : 'info'}`}>
            {isExpired ? <AlertCircle className="w-12 h-12" /> : <Info className="w-12 h-12" />}
          </div>

          <div className="message-content">
            {isExpired ? (
              <p className="main-message">
                Ihre 30-tägige Testperiode ist beendet. Ihr Konto wurde automatisch auf das kostenpflichtige Abo umgestellt.
              </p>
            ) : isLastDay ? (
              <p className="main-message">
                Heute ist der letzte Tag Ihrer kostenlosen Testperiode. Ab morgen wird Ihr Konto automatisch auf das kostenpflichtige Abo (€{monthlyPrice.toFixed(2)}/Monat) umgestellt.
              </p>
            ) : (
              <p className="main-message">
                Ihre Testperiode endet in <strong>{daysRemaining} Tagen</strong>. Nach Ablauf wird Ihr Konto automatisch auf das kostenpflichtige Abo (€{monthlyPrice.toFixed(2)}/Monat) umgestellt.
              </p>
            )}
          </div>

          <div className="transition-info-box">
            <h3 className="info-title">
              <Info className="w-5 h-5" />
              Automatische Umstellung
            </h3>
            <p className="info-text">
              Nach der Testperiode geht es nahtlos weiter. Sie müssen nichts tun - alle Ihre Daten und Einstellungen bleiben erhalten.
            </p>
          </div>

          <div className="pricing-details">
            <h3 className="pricing-title">Ihre Paketzusammenstellung:</h3>
            <div className="pricing-box">
              {hasPackageData ? (
                <div className="package-breakdown">
                  <h4 className="breakdown-title">Gewählte Pakete:</h4>
                  <ul className="package-items">
                    {user.packageSummary?.mietfaecher?.map((item: any, index: number) => (
                      <li key={index} className="package-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">€{item.price.toFixed(2)}</span>
                      </li>
                    ))}
                    {user.packageSummary?.zusatzleistungen?.lagerservice && (
                      <li className="package-item">
                        <span className="item-name">Lagerservice</span>
                        <span className="item-price">€20.00</span>
                      </li>
                    )}
                    {user.packageSummary?.zusatzleistungen?.versandservice && (
                      <li className="package-item">
                        <span className="item-name">Versandservice</span>
                        <span className="item-price">€5.00</span>
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="package-breakdown">
                  <p className="no-package-info">
                    Ihr monatlicher Preis basiert auf Ihrer individuellen Paketzusammenstellung und wird nach der Bestätigung durch unser Team berechnet.
                  </p>
                </div>
              )}
              
              <div className="price-display">
                <span className="total-label">Monatlicher Gesamtpreis:</span>
                <div className="price-amount">
                  <span className="currency">€</span>
                  <span className="amount">{monthlyPrice > 0 ? monthlyPrice.toFixed(2) : '---'}</span>
                  <span className="period">/Monat</span>
                </div>
              </div>
              
              <ul className="pricing-features">
                <li>
                  <Check className="w-4 h-4" />
                  <span>Basierend auf Ihrer Paketzusammenstellung</span>
                </li>
                <li>
                  <Check className="w-4 h-4" />
                  <span>Monatlich kündbar</span>
                </li>
                <li>
                  <Check className="w-4 h-4" />
                  <span>Keine Einrichtungsgebühr</span>
                </li>
                <li>
                  <Check className="w-4 h-4" />
                  <span>Automatische Rechnungsstellung</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              className="btn btn-primary"
              onClick={onClose}
            >
              {isExpired ? 'Verstanden' : 'OK, weiter mit housnkuh'}
            </button>
            
            {!isExpired && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  // Navigate to cancellation
                  navigationHelper.goToVendorCancel();
                }}
              >
                Testperiode beenden
              </button>
            )}
          </div>

          <p className="cancel-info">
            Sie können jederzeit in Ihren Kontoeinstellungen kündigen. Bei Kündigung endet der Zugang zum Monatsende.
          </p>
        </div>
      </div>
    </div>
  );
};