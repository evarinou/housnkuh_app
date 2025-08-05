/**
 * @file VendorDashboardPage.tsx
 * @purpose Main vendor dashboard page displaying trial status, bookings, profile, and upcoming features
 * @created 2024-01-01
 * @modified 2025-08-05
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, Calendar, AlertTriangle, Clock, XCircle, CheckCircle, ShoppingCart, BarChart3, FileText, Receipt } from 'lucide-react';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { createNavigationHelper } from '../utils/navigation';
import VendorLayout from '../components/vendor/VendorLayout';
import DashboardMessage from '../components/vendor/DashboardMessage';
import TrialStatusDashboard from '../components/vendor/TrialStatusDashboard';
import { TrialStatusWidget } from '../components/vendor/TrialStatusWidget';
import { TrialAccessGuard } from '../components/vendor/TrialAccessGuard';
import PackageTrackingWidget from '../components/vendor/PackageTrackingWidget';
import useDashboardMessages from '../hooks/useDashboardMessages';
import axios from 'axios';

/**
 * Vendor dashboard page component with comprehensive business management features
 * @description Main dashboard for direct marketers showing trial status, bookings, profile management, and upcoming features
 * @returns {JSX.Element} Complete vendor dashboard with trial management, booking overview, and feature widgets
 */
const VendorDashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useVendorAuth();
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  const [storeOpeningDate, setStoreOpeningDate] = useState<Date | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasZusatzleistungen, setHasZusatzleistungen] = useState(false);
  
  // Dashboard messages
  const { messages, dismissMessage } = useDashboardMessages({ 
    userId: user?.id || '' 
  });
  
  // Wenn nicht authentifiziert und das Laden abgeschlossen ist, zum Login weiterleiten
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/vendor/login');
    }
  }, [isLoading, isAuthenticated, navigate]);
  
  // Lade Eröffnungsdatum
  useEffect(() => {
    const fetchStoreOpening = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/public/store-opening`);
        
        if (response.data.success && response.data.storeOpening.enabled && response.data.storeOpening.openingDate) {
          setStoreOpeningDate(new Date(response.data.storeOpening.openingDate));
          setIsStoreOpen(response.data.storeOpening.isStoreOpen);
        }
      } catch (err) {
        console.error('Error fetching store opening:', err);
      }
    };
    
    fetchStoreOpening();
  }, []);

  // Check if vendor has zusatzleistungen
  useEffect(() => {
    const checkZusatzleistungen = async () => {
      if (!user?.id) return;
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        const response = await axios.get(`${apiUrl}/vendor/contracts/zusatzleistungen`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
          }
        });
        
        if (response.data.success && response.data.contracts) {
          const hasServices = response.data.contracts.some((contract: any) => 
            contract.zusatzleistungen?.lagerservice || contract.zusatzleistungen?.versandservice
          );
          setHasZusatzleistungen(hasServices);
        }
      } catch (err) {
        console.error('Error checking zusatzleistungen:', err);
      }
    };
    
    checkZusatzleistungen();
  }, [user?.id]);
  
  // Countdown-Timer
  useEffect(() => {
    if (!storeOpeningDate || isStoreOpen) return;
    
    const calculateCountdown = () => {
      const now = new Date().getTime();
      const openingTime = storeOpeningDate.getTime();
      const distance = openingTime - now;
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        setCountdown({ days, hours, minutes });
      } else {
        setIsStoreOpen(true);
      }
    };
    
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [storeOpeningDate, isStoreOpen]);
  
  // Diese Funktion können wir entfernen, da das Logout jetzt im VendorLayout behandelt wird
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Laden...</span>
      </div>
    );
  }
  
  return (
    <TrialAccessGuard>
      <VendorLayout>
        <div className="max-w-5xl mx-auto">
        {/* Willkommens-Header mit erweitertem Profil */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="bg-primary/10 rounded-full p-3 mr-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary">Willkommen, {user?.name}</h1>
                <p className="text-gray-600">{user?.email}</p>
                {user?.registrationStatus && (
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      user.registrationStatus === 'trial_active' ? 'bg-green-100 text-green-800' :
                      user.registrationStatus === 'trial_expired' ? 'bg-red-100 text-red-800' :
                      user.registrationStatus === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user.registrationStatus === 'trial_active' ? 'Probemonat aktiv' :
                       user.registrationStatus === 'trial_expired' ? 'Probemonat abgelaufen' :
                       user.registrationStatus === 'cancelled' ? 'Gekündigt' :
                       user.registrationStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/vendor/profile"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Profil bearbeiten
              </Link>
              {user?.registrationStatus === 'trial_active' && (
                <div className="text-sm text-gray-500 text-center sm:text-right">
                  <p>Probemonat endet am:</p>
                  <p className="font-medium text-gray-700">
                    {user.trialEndDate ? new Date(user.trialEndDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : '–'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Enhanced Trial Status Widget */}
        {user?.registrationStatus === 'trial_active' && user?.trialEndDate && (
          <TrialStatusWidget showActions={true} />
        )}
        
        {/* Trial Expired Banner */}
        {user?.registrationStatus === 'trial_expired' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <XCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-red-800 mb-2">Probemonat abgelaufen</h2>
                <p className="text-red-700 mb-4">
                  Ihr kostenloser Probemonat ist abgelaufen. Um weiterhin housnkuh nutzen zu können,
                  wählen Sie bitte ein passendes Paket.
                </p>
                <Link
                  to="/pricing"
                  className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Paket wählen
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Cancelled Status Banner */}
        {user?.registrationStatus === 'cancelled' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-gray-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Account gekündigt</h2>
                <p className="text-gray-700 mb-4">
                  Ihr Account wurde gekündigt. Sie können sich jederzeit wieder registrieren.
                </p>
                <Link
                  to="/vendor/login"
                  className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Neu registrieren
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Countdown bis zur Eröffnung */}
        {storeOpeningDate && !isStoreOpen && (
          <div className="bg-gradient-to-r from-orange-500 to-primary rounded-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center">
                  <Clock className="w-6 h-6 mr-2" />
                  Countdown zur Eröffnung
                </h2>
                <p className="text-white/90">
                  Ihr kostenloser Probemonat startet automatisch am{' '}
                  {storeOpeningDate.toLocaleDateString('de-DE', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-3xl font-bold">{countdown.days}</div>
                  <div className="text-sm text-white/80">Tage</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-3xl font-bold">{countdown.hours}</div>
                  <div className="text-sm text-white/80">Stunden</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-3xl font-bold">{countdown.minutes}</div>
                  <div className="text-sm text-white/80">Minuten</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Trial Status Dashboard */}
        {user?.registrationStatus === 'trial_active' && (
          <TrialStatusDashboard />
        )}
        
        {/* Dynamic Dashboard Messages */}
        {messages.length > 0 && (
          <div className="space-y-4 mb-8">
            {messages.map(message => (
              <DashboardMessage 
                key={message.id}
                message={message}
                onDismiss={message.dismissible ? () => dismissMessage(message.id) : undefined}
              />
            ))}
          </div>
        )}
        
        {/* Hauptbereich mit Dashboard-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Trial Status - Compact Card */}
          {user?.registrationStatus === 'trial_active' && user?.trialEndDate && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-50 p-4 border-b border-blue-100">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-secondary">Testperiode Status</h2>
                </div>
              </div>
              <div className="p-4">
                <TrialStatusWidget compact={true} showActions={false} />
                <div className="mt-4 flex gap-2">
                  <Link
                    to="/vendor/upgrade"
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Upgraden
                  </Link>
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Kündigen
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Buchungen */}
          <Link to="/vendor/meine-buchungen" className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-blue-50 p-4 border-b border-blue-100">
              <div className="flex items-center">
                <Package className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Meine Buchungen</h2>
              </div>
            </div>
            <div className="p-6">
              {user?.hasPendingBooking ? (
                <div className="text-gray-600">
                  <p>Sie haben eine ausstehende Buchungsanfrage.</p>
                  <p className="mt-2 text-blue-600 font-medium">→ Alle Buchungen anzeigen</p>
                </div>
              ) : (
                <div className="text-gray-600">
                  <p>Sie haben derzeit keine aktiven Buchungen.</p>
                  <p className="mt-2 text-blue-600 font-medium">→ Buchungen verwalten</p>
                </div>
              )}
            </div>
          </Link>

          
          {/* Kalender */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Termine & Events</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Hier werden in Zukunft Ihre Termine und Events angezeigt.</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">Kommende Funktion: Kalender für Veranstaltungen, Lieferungen und Abholungen.</p>
              </div>
            </div>
          </div>
          
          {/* Profil */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-rose-50 p-4 border-b border-rose-100">
              <div className="flex items-center">
                <User className="w-6 h-6 text-rose-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Mein Profil</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{user?.name || '–'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">E-Mail</p>
                  <p className="font-medium">{user?.email || '–'}</p>
                </div>
                <Link
                  to="/vendor/profile"
                  className="mt-2 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profil bearbeiten
                </Link>
              </div>
            </div>
          </div>
          
          {/* Produkte verwalten */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100">
              <div className="flex items-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Produkte verwalten</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Verwalten Sie hier in Zukunft Ihre Produktpalette und Angebote.</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">Kommende Funktion: Produkte anlegen, bearbeiten, Preise festlegen und Verfügbarkeiten verwalten.</p>
              </div>
            </div>
          </div>
          
          {/* Package Tracking Widget - nur wenn Zusatzleistungen vorhanden */}
          {hasZusatzleistungen ? (
            <PackageTrackingWidget />
          ) : (
            /* Berichte einsehen */
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-purple-50 p-4 border-b border-purple-100">
                <div className="flex items-center">
                  <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-secondary">Berichte einsehen</h2>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Analysieren Sie Ihre Verkaufszahlen und Performance-Daten.</p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500 italic">Kommende Funktion: Detaillierte Verkaufsberichte, Statistiken und Analysen Ihrer Geschäftstätigkeit.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Ausgangsrechnungen (Endkunde) */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-orange-50 p-4 border-b border-orange-100">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Ausgangsrechnungen (Endkunde)</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Verwalten Sie Rechnungen an Ihre Kunden und Endverbraucher.</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">Kommende Funktion: Rechnungserstellung, Verwaltung von Kundenabrechnungen und Zahlungsverfolgung.</p>
              </div>
            </div>
          </div>
          
          {/* Eingangsrechnungen (Housnkuh) */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-indigo-50 p-4 border-b border-indigo-100">
              <div className="flex items-center">
                <Receipt className="w-6 h-6 text-indigo-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Eingangsrechnungen (Housnkuh)</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Übersicht über Ihre Rechnungen von housnkuh und Zahlungshistorie.</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">Kommende Funktion: Einsicht in Mietkosten, Servicegebühren und Zahlungsverläufe bei housnkuh.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hinweis-Bereich */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Nächste Schritte</h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              Willkommen in deinem persönlichen Vendor-Dashboard! Hier verwaltest du in Zukunft deine Verkaufsflächen,
              Produkte und mehr. Wir arbeiten kontinuierlich daran, dir weitere nützliche Funktionen bereitzustellen.
            </p>
            <p className="mt-2">
              Bei Fragen oder Anregungen kontaktiere uns gerne unter{' '}
              <a href="mailto:info@housnkuh.de" className="text-primary hover:underline">
                info@housnkuh.de
              </a>.
            </p>
          </div>
        </div>
      </div>
      
      {/* Cancellation Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-secondary mb-4">Probemonat kündigen</h3>
            
            <p className="text-gray-600 mb-6">
              Sind Sie sicher, dass Sie Ihren kostenlosen Probemonat kündigen möchten?
              Sie verlieren den Zugang zu allen Funktionen.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund für die Kündigung (optional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Teilen Sie uns mit, warum Sie kündigen möchten..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCancellationModal(false);
                  setCancellationReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isCancelling}
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setIsCancelling(true);
                  try {
                    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
                    const response = await axios.post(
                      `${apiUrl}/vendor-auth/cancel/${user?.id}`,
                      { reason: cancellationReason },
                      {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('vendorToken')}`
                        }
                      }
                    );
                    
                    if (response.data.success) {
                      alert('Ihre Kündigung wurde erfolgreich bearbeitet.');
                      // Logout after successful cancellation
                      navigationHelper.goToVendorLogin();
                    }
                  } catch (error) {
                    console.error('Cancellation error:', error);
                    alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isCancelling}
              >
                {isCancelling ? 'Wird bearbeitet...' : 'Endgültig kündigen'}
              </button>
            </div>
          </div>
        </div>
      )}
      </VendorLayout>
    </TrialAccessGuard>
  );
};

export default VendorDashboardPage;