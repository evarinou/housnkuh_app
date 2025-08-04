import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import { TrialStatusWidget } from '../../components/vendor/TrialStatusWidget';
import { TrialTransitionModal } from '../../components/vendor/TrialTransitionModal';
import { ArrowLeft, CheckCircle, Star, Shield, CreditCard } from 'lucide-react';

const VendorUpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useVendorAuth();
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  const monthlyPrice = user?.calculatedMonthlyPrice || 0;

  const isTrialUser = user?.registrationStatus === 'trial_active';
  const trialDaysRemaining = user?.trialEndDate 
    ? Math.ceil((new Date(user.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <VendorLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zurück zum Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isTrialUser ? 'Ihr Abo nach der Testperiode' : 'housnkuh Abonnement'}
          </h1>
          <p className="text-gray-600">
            {isTrialUser 
              ? 'Nach der Testperiode erfolgt automatisch die Umstellung auf Ihr individuelles Paket'
              : 'Ihr individuelles Paket basiert auf Ihrer Auswahl'}
          </p>
        </div>

        {/* Trial Status Widget */}
        {isTrialUser && (
          <div className="mb-8">
            <TrialStatusWidget showActions={false} />
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-2/3 mb-6 lg:mb-0">
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                {isTrialUser ? 'Automatische Umstellung' : 'Ihr Paket'}
              </h2>
              <p className="text-lg opacity-90 mb-6">
                {isTrialUser 
                  ? 'Nach der Testperiode geht es nahtlos weiter - Sie müssen nichts tun!'
                  : 'Ihr individuelles Paket mit allen gewählten Leistungen.'}
              </p>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="font-semibold">Ihr monatlicher Preis</span>
                </div>
                <p className="text-sm opacity-90">
                  {monthlyPrice > 0 
                    ? `€${monthlyPrice.toFixed(2)} pro Monat basierend auf Ihrer Paketzusammenstellung`
                    : 'Wird nach Bestätigung durch unser Team berechnet'}
                </p>
              </div>
              
              <button
                onClick={() => setShowTransitionModal(true)}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                {isTrialUser ? 'Details zur Umstellung' : 'Paketdetails anzeigen'}
              </button>
            </div>
            
            <div className="lg:w-1/3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="font-semibold mb-4">Sofortiger Zugang zu:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span>Erweiterte Verkaufstools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span>Detaillierte Analysen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span>Prioritäts-Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    <span>Unbegrenzte Mietfächer</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sicherheit & Zuverlässigkeit</h3>
            <p className="text-gray-600">
              Höchste Sicherheitsstandards und 99.9% Uptime-Garantie für Ihr Business.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Premium Support</h3>
            <p className="text-gray-600">
              Direkter Zugang zu unserem Expertenteam und bevorzugte Bearbeitung Ihrer Anfragen.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Flexible Zahlungsoptionen</h3>
            <p className="text-gray-600">
              Monatliche oder jährliche Abrechnung mit sicheren Zahlungsmethoden.
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-gray-50 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            Was unsere Kunden sagen
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">Maria Weber</h4>
                  <p className="text-sm text-gray-600">Hofladen Weber</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "Seit dem Upgrade zu housnkuh Pro haben sich meine Verkäufe verdoppelt. 
                Die erweiterten Tools sind genau das, was ich brauchte!"
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  J
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">Johann Müller</h4>
                  <p className="text-sm text-gray-600">Müller's Gemüsehof</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "Der Support ist fantastisch und die Analysen helfen mir dabei, 
                mein Business strategisch zu entwickeln."
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            Häufige Fragen
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Kann ich jederzeit kündigen?
              </h3>
              <p className="text-gray-600">
                Ja, Sie können Ihr Abonnement jederzeit mit nur einem Klick kündigen. 
                Keine Kündigungsfristen oder versteckte Gebühren.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Erhalte ich eine Geld-zurück-Garantie?
              </h3>
              <p className="text-gray-600">
                Absolut! Wir bieten eine 30-tägige Geld-zurück-Garantie. 
                Wenn Sie nicht zufrieden sind, erstatten wir Ihnen den vollen Betrag.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Was passiert mit meinen Daten bei einem Upgrade?
              </h3>
              <p className="text-gray-600">
                Alle Ihre Daten bleiben erhalten und werden nahtlos übertragen. 
                Sie verlieren keine Informationen oder Einstellungen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Transition Modal */}
      <TrialTransitionModal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        daysRemaining={trialDaysRemaining}
      />
    </VendorLayout>
  );
};

export default VendorUpgradePage;