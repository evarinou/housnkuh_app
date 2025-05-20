// client/src/pages/VendorDashboardPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import VendorLayout from '../components/vendor/VendorLayout';

const VendorDashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useVendorAuth();
  const navigate = useNavigate();
  
  // Wenn nicht authentifiziert und das Laden abgeschlossen ist, zum Login weiterleiten
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/vendor/login');
    }
  }, [isLoading, isAuthenticated, navigate]);
  
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
    <VendorLayout>
      <div className="max-w-5xl mx-auto">
        {/* Willkommens-Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center">
            <div className="bg-primary/10 rounded-full p-3 mr-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary">Willkommen, {user?.name}</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>
        
        {/* Status-Karte für ausstehende Buchung */}
        {user?.hasPendingBooking && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-amber-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-amber-800 mb-2">Buchungsanfrage in Bearbeitung</h2>
                <p className="text-amber-700 mb-4">
                  Ihre Buchungsanfrage wird aktuell bearbeitet. Wir setzen uns in Kürze mit Ihnen in Verbindung, 
                  um die Details zu besprechen und den Mietvertrag zu finalisieren.
                </p>
                <div className="text-sm text-amber-600">
                  <p>Bei Fragen kontaktieren Sie uns gerne:</p>
                  <p className="mt-1">
                    <a href="tel:+4915735711257" className="text-primary hover:underline">
                      0157 35711257
                    </a>
                    {' '}oder{' '}
                    <a href="mailto:info@housnkuh.de" className="text-primary hover:underline">
                      info@housnkuh.de
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Hauptbereich mit Dashboard-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Buchungen */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                  <p className="mt-2">Sobald diese bestätigt wurde, werden hier Ihre aktiven Buchungen angezeigt.</p>
                </div>
              ) : (
                <div className="text-gray-600">
                  <p>Sie haben derzeit keine aktiven Buchungen.</p>
                  <p className="mt-2">Buchen Sie Verkaufsflächen über unsere Preisseite.</p>
                  <div className="mt-4">
                    <a 
                      href="/pricing" 
                      className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Flächen buchen
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          
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
          
          {/* Zahlungen */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-violet-50 p-4 border-b border-violet-100">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-violet-600 mr-2" />
                <h2 className="text-lg font-semibold text-secondary">Zahlungen & Rechnungen</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Hier finden Sie in Zukunft Ihre Rechnungen und Zahlungshistorie.</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 italic">Kommende Funktion: Übersicht aller Rechnungen und getätigten Zahlungen.</p>
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
                <button
                  className="mt-2 inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Profil bearbeiten
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hinweis-Bereich */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Nächste Schritte</h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              Willkommen in Ihrem persönlichen Vendor-Dashboard! Hier verwalten Sie in Zukunft Ihre Verkaufsflächen,
              Produkte und mehr. Wir arbeiten kontinuierlich daran, Ihnen weitere nützliche Funktionen bereitzustellen.
            </p>
            <p className="mt-2">
              Bei Fragen oder Anregungen kontaktieren Sie uns gerne unter{' '}
              <a href="mailto:info@housnkuh.de" className="text-primary hover:underline">
                info@housnkuh.de
              </a>.
            </p>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorDashboardPage;