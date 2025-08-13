/**
 * @file VendorConfirmPage.tsx
 * @purpose Vendor registration confirmation page displaying booking details and confirmation status
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, Package, User, CheckCircle, Percent, Check } from 'lucide-react';
import axios from 'axios';
import { PriceBreakdownDisplay } from '../components/common/PriceBreakdownDisplay';
import { PriceCalculationService } from '../services/priceCalculationService';
import { Zusatzleistungen } from '../types';
//import { useVendorAuth } from '../contexts/VendorAuthContext';

/**
 * Props interface for ZusatzleistungenSection component
 * @interface ZusatzleistungenSectionProps
 * @property {Zusatzleistungen} [zusatzleistungen] - Additional services configuration
 * @property {'basic' | 'premium'} provisionType - Type of commission model
 */
interface ZusatzleistungenSectionProps {
  zusatzleistungen?: Zusatzleistungen;
  provisionType: 'basic' | 'premium';
}

/**
 * Additional services section component for vendor confirmation
 * @description Displays booked additional services with details and pricing
 * @param {ZusatzleistungenSectionProps} props - Component props
 * @returns {JSX.Element | null} Additional services section or null if not applicable
 */
const ZusatzleistungenSection: React.FC<ZusatzleistungenSectionProps> = ({ zusatzleistungen, provisionType }) => {
  if (!zusatzleistungen || provisionType !== 'premium') {
    return null;
  }

  const hasServices = zusatzleistungen.lagerservice || zusatzleistungen.versandservice;
  if (!hasServices) {
    return null;
  }

  return (
    <div 
      className="zusatzleistungen-confirmation-section bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200 mb-6"
      role="region"
      aria-labelledby="zusatzleistungen-heading"
    >
      <div className="flex items-center mb-4">
        <div className="bg-green-500 text-white rounded-full p-2 mr-3" aria-hidden="true">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h3 id="zusatzleistungen-heading" className="text-xl font-bold text-gray-800">Ihre Zusatzleistungen</h3>
          <p className="text-gray-600">Premium-Services für optimalen Service</p>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6">
        {zusatzleistungen.lagerservice && (
          <div 
            className="service-card bg-white p-4 rounded-lg border-2 border-green-200 shadow-sm"
            role="article"
            aria-label="Lagerservice Details und Preise"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3" aria-hidden="true">📦</span>
              <div>
                <h4 className="font-bold text-green-800">Lagerservice</h4>
                <p className="text-green-600 font-semibold" aria-label="Monatliche Kosten: 20 Euro">+20€/Monat</p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Professionelle Lagerung Ihrer Produkte</li>
              <li>✓ Temperaturkontrollierte Umgebung</li>
              <li>✓ Sichere und hygienische Aufbewahrung</li>
              <li>✓ Flexible Zugriffsmöglichkeiten</li>
            </ul>
          </div>
        )}

        {zusatzleistungen.versandservice && (
          <div 
            className="service-card bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm"
            role="article"
            aria-label="Versandservice Details und Preise"
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3" aria-hidden="true">🚚</span>
              <div>
                <h4 className="font-bold text-blue-800">Versandservice</h4>
                <p className="text-blue-600 font-semibold" aria-label="Monatliche Kosten: 5 Euro">+5€/Monat</p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Professionelle Verpackung</li>
              <li>✓ Schneller und sicherer Versand</li>
              <li>✓ Sendungsverfolgung inkludiert</li>
              <li>✓ Versandkostenoptimierung</li>
            </ul>
          </div>
        )}
      </div>

      {/* Mobile View */}
      <div className="md:hidden mb-6">
        <MobileZusatzleistungenCard
          service="lager"
          active={zusatzleistungen.lagerservice}
        />
        <MobileZusatzleistungenCard
          service="versand"
          active={zusatzleistungen.versandservice}
        />
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-semibold mb-2 text-gray-800">Nächste Schritte für Ihre Zusatzleistungen:</h5>
        <ul className="text-sm text-gray-600 space-y-2">
          {zusatzleistungen.lagerservice && (
            <li className="flex items-start">
              <span className="text-green-500 mr-2 mt-0.5">📦</span>
              <span>
                <strong>Lagerservice:</strong> Sie erhalten eine separate E-Mail mit 
                Informationen zur Produktanlieferung und Lagerverwaltung.
              </span>
            </li>
          )}
          {zusatzleistungen.versandservice && (
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-0.5">🚚</span>
              <span>
                <strong>Versandservice:</strong> Unser Team kontaktiert Sie für die 
                Einrichtung Ihres Versandprofils und Präferenzen.
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Enhanced Success Message Component
const SuccessMessageWithZusatzleistungen: React.FC<{
  hasZusatzleistungen: boolean;
  zusatzleistungen?: Zusatzleistungen;
  message: string;
}> = ({ hasZusatzleistungen, zusatzleistungen, message }) => {
  return (
    <div className="success-message bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <div className="bg-green-500 text-white rounded-full p-2 mr-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-green-800">
            Registrierung erfolgreich abgeschlossen!
          </h2>
          <p className="text-green-600">
            {message}
          </p>
        </div>
      </div>

      {hasZusatzleistungen && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">
            🎯 Ihre Premium-Services sind aktiviert
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Sie haben folgende Zusatzleistungen gebucht:
          </p>
          <div className="flex flex-wrap gap-2">
            {zusatzleistungen?.lagerservice && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                📦 Lagerservice
              </span>
            )}
            {zusatzleistungen?.versandservice && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🚚 Versandservice
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Price Display Component
const EnhancedPriceDisplay: React.FC<{
  packageData: any;
  contractData?: any;
}> = ({ packageData }) => {
  const priceConfig = {
    mietfachPrices: packageData.packageCounts ? 
      Object.entries(packageData.packageCounts)
        .filter(([_, count]) => Number(count) > 0)
        .map(([packageId, count]) => {
          const option = packageData.packageOptions?.find((p: any) => p.id === packageId);
          return {
            id: packageId,
            name: `${count}x ${option?.name || packageId}`,
            price: (option?.price || 0) * Number(count)
          };
        }) : [],
    zusatzleistungen: packageData.zusatzleistungen,
    discount: packageData.discount,
    provisionType: packageData.selectedProvisionType || 'basic'
  };

  const breakdown = PriceCalculationService.calculateDetailedPrice(priceConfig);

  return (
    <div className="price-confirmation-section bg-gray-50 p-6 rounded-lg mb-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Ihre Kostenübersicht
      </h3>
      
      <PriceBreakdownDisplay 
        breakdown={{
          packageCosts: breakdown.mietfach.total,
          addonCosts: 0,
          zusatzleistungenCosts: breakdown.zusatzleistungen.total,
          subtotal: breakdown.subtotal,
          discount: breakdown.discount.percentage * 100,
          discountAmount: breakdown.discount.amount,
          monthlyTotal: breakdown.monthly,
          totalForDuration: breakdown.total,
          provision: {
            rate: packageData.selectedProvisionType === 'premium' ? 7 : 4,
            monthlyAmount: 0,
            totalAmount: 0
          }
        }}
        zusatzleistungen={packageData.zusatzleistungen}
        showDetails={true}
        className="bg-white p-4 rounded-lg shadow-sm"
      />

      {/* Provisionsmodell-Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <div className="bg-blue-500 text-white rounded-full p-1 mr-3">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-800">
              {packageData.selectedProvisionType === 'premium' ? 'Premium' : 'Basis'}-Provisionsmodell
            </h4>
            <p className="text-blue-600 text-sm">
              {packageData.selectedProvisionType === 'premium' 
                ? '7% Provision auf Verkäufe + Zusatzleistungen verfügbar'
                : '4% Provision auf Verkäufe'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Zusatzleistungen Card Component
const MobileZusatzleistungenCard: React.FC<{
  service: 'lager' | 'versand';
  active: boolean;
}> = ({ service, active }) => {
  if (!active) return null;

  const config = {
    lager: {
      icon: '📦',
      title: 'Lagerservice',
      price: '+20€/Monat',
      color: 'green',
      features: [
        'Professionelle Lagerung',
        'Temperaturkontrolle',
        'Sichere Aufbewahrung'
      ]
    },
    versand: {
      icon: '🚚',
      title: 'Versandservice', 
      price: '+5€/Monat',
      color: 'blue',
      features: [
        'Professionelle Verpackung',
        'Schneller Versand',
        'Sendungsverfolgung'
      ]
    }
  }[service];

  return (
    <div 
      className={`
        mobile-service-card 
        bg-white border-2 border-${config.color}-200 rounded-lg p-4 mb-4
        shadow-sm hover:shadow-md transition-shadow
      `}
      role="article"
      aria-label={`${config.title} Details und Preise`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Service details are already visible
        }
      }}
    >
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-2" aria-hidden="true">{config.icon}</span>
          <div>
            <h4 className={`font-bold text-${config.color}-800 text-lg`}>
              {config.title}
            </h4>
            <p 
              className={`text-${config.color}-600 font-semibold`}
              aria-label={`Monatliche Kosten: ${config.price.replace('+', '').replace('€/Monat', ' Euro pro Monat')}`}
            >
              {config.price}
            </p>
          </div>
        </div>
        <div className={`bg-${config.color}-100 p-2 rounded-full`} aria-hidden="true">
          <Check className={`w-5 h-5 text-${config.color}-600`} />
        </div>
      </div>

      {/* Mobile Features */}
      <div className="text-sm text-gray-600">
        {config.features.map((feature, index) => (
          <div key={index} className="flex items-center mb-1">
            <span className="text-green-500 mr-2">✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Vendor confirmation page component
 * @description Handles vendor email confirmation and displays booking details with success/error states
 * @returns {JSX.Element} Complete vendor confirmation page with status handling
 */
const VendorConfirmPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [vendorData, setVendorData] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
 // const { login } = useVendorAuth();

  useEffect(() => {
    let mounted = true;
    let hasRun = false;
    
    const confirmAccount = async () => {
      // Prevent duplicate calls
      if (hasRun || !mounted) return;
      hasRun = true;
      
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Kein Bestätigungstoken gefunden.');
        return;
      }
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        
        // Using the token as a path parameter to match the API's route definition
        // The email sends a URL with query parameter ?token=xyz but we need to use it in the path /:token
        console.log(`Confirming vendor email with token: ${token}`);
        const response = await axios.get(`${apiUrl}/vendor-auth/confirm/${token}`);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Account erfolgreich bestätigt!');
          setUserConfirmed(true);
          
          // Store vendor data if provided in response
          if (response.data.vendor && response.data.vendor.packageData) {
            setVendorData(response.data.vendor);
          } else {
            // No package data available - user will see basic confirmation without package details
            console.log('No package data available from server');
            setVendorData(null);
          }
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Ein Fehler ist aufgetreten bei der Bestätigung.');
        }
      } catch (error) {
        setStatus('error');
        if (axios.isAxiosError(error) && error.response) {
          setMessage(error.response.data.message || 'Fehler bei der Bestätigung des Accounts.');
        } else {
          setMessage('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        }
      }
    };
    
    confirmAccount();
    
    return () => {
      mounted = false;
    };
  }, [location]);

  const handleLoginRedirect = () => {
    // Hier könnten Sie direkt ein Login-Modal öffnen oder zur Login-Seite weiterleiten
    navigate('/pricing'); // Zurück zur Buchungsseite
  };

  return (
    <div className="max-w-3xl mx-auto p-8 my-12 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-secondary">
        Account-Bestätigung
      </h1>
      
      <div className="flex flex-col items-center justify-center p-6 text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-xl">Bestätigung wird verarbeitet...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            {/* Enhanced Success Message */}
            <SuccessMessageWithZusatzleistungen
              hasZusatzleistungen={vendorData?.packageData?.zusatzleistungen && 
                (vendorData.packageData.zusatzleistungen.lagerservice || vendorData.packageData.zusatzleistungen.versandservice)}
              zusatzleistungen={vendorData?.packageData?.zusatzleistungen}
              message={message}
            />

            {/* Enhanced Price Display */}
            {vendorData?.packageData && (
              <EnhancedPriceDisplay
                packageData={vendorData.packageData}
                contractData={vendorData.contractData}
              />
            )}

            {/* Zusatzleistungen Section */}
            {vendorData?.packageData && (
              <ZusatzleistungenSection
                zusatzleistungen={vendorData.packageData.zusatzleistungen}
                provisionType={vendorData.packageData.selectedProvisionType || 'basic'}
              />
            )}
            
            {userConfirmed && (
              <div className="bg-blue-50 p-6 rounded-lg mb-8 max-w-md">
                <div className="flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-900">
                    Nächste Schritte
                  </h3>
                </div>
                <div className="text-left space-y-3 text-blue-800">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <span>Dein Account ist jetzt aktiv und Du kannst sich anmelden</span>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <span>Wir nehmen in Kürze Kontakt mit dir auf, um Details zu besprechen</span>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <span>Wir suchen dir ein verfügbares Mietfach und dann kann alles losgehen</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={handleLoginRedirect}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium flex items-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Anmelden</span>
              </button>
              <Link 
                to="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Zurück zur Startseite
              </Link>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="bg-red-100 p-4 rounded-full mb-6">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-secondary">
              Bestätigung fehlgeschlagen
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              {message}
            </p>
            <p className="text-gray-600 mb-8">
              Falls der Link abgelaufen ist, können Sie sich gerne direkt bei uns melden.
            </p>
            <div className="flex gap-4">
              <Link 
                to="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Zurück zur Startseite
              </Link>
              <Link 
                to="/kontakt"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg 
                         transition-all duration-200 font-medium"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </>
        )}
      </div>
      
      {/* Kontakt-Information */}
      <div className="mt-8 text-center border-t pt-6">
        <h3 className="text-lg font-semibold text-secondary mb-2">
          Haben Sie Fragen?
        </h3>
        <p className="text-gray-600">
          Telefon: 0152 22035788<br/>
          E-Mail: eva-maria.schaller@housnkuh.de
        </p>
      </div>
    </div>
  );
};

export default VendorConfirmPage;