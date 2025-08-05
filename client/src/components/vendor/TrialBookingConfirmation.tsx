/**
 * @file TrialBookingConfirmation.tsx
 * @purpose Trial booking confirmation component with terms acceptance and success states for trial management
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, CheckCircle, Info, Calendar, Euro, Star } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

/**
 * Interface for booking data required for trial confirmation
 * @interface BookingData
 * @property {string} mietfachNummer - Display number of the Mietfach
 * @property {string} mietfachId - Unique identifier for the Mietfach
 * @property {string} startdatum - Booking start date (ISO string)
 * @property {number} preis - Regular monthly price after trial
 * @property {string} kategorie - Mietfach category/type
 * @property {string} [groesse] - Optional size information
 * @property {string[]} [features] - Optional array of Mietfach features
 */
interface BookingData {
  mietfachNummer: string;
  mietfachId: string;
  startdatum: string;
  preis: number;
  kategorie: string;
  groesse?: string;
  features?: string[];
}

/**
 * Props interface for the TrialBookingConfirmation component
 * @interface TrialBookingConfirmationProps
 * @property {BookingData} booking - Complete booking data for confirmation
 * @property {function} [onBack] - Optional callback for back navigation
 */
interface TrialBookingConfirmationProps {
  booking: BookingData;
  onBack?: () => void;
}

/**
 * Props interface for the TrialBookingSuccess component
 * @interface TrialBookingSuccessProps
 * @property {BookingData} booking - Booking data for success display
 */
interface TrialBookingSuccessProps {
  booking: BookingData;
}

/**
 * TrialBookingSuccess component displaying successful trial booking confirmation
 * 
 * @component
 * @param {TrialBookingSuccessProps} props - Component props containing booking data
 * @returns {JSX.Element} Success confirmation display with next steps
 * 
 * @description
 * Success page component shown after successful trial booking confirmation.
 * Provides user feedback, next steps information, and navigation options.
 * 
 * @features
 * - Success confirmation with checkmark icon
 * - Clear next steps communication
 * - Timeline expectations (24h activation, email confirmation)
 * - Navigation options to bookings or dashboard
 * - Green-themed success styling
 * 
 * @next_steps
 * - Confirmation email sent
 * - 24-hour Mietfach activation
 * - Immediate usage capability
 * - 7-day reminder before trial end
 * 
 * @navigation
 * - "Meine Buchungen anzeigen" → trial bookings page
 * - "Zum Dashboard" → vendor dashboard
 * 
 * @complexity O(1) - Static success display
 */
const TrialBookingSuccess: React.FC<TrialBookingSuccessProps> = ({ booking }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Buchung erfolgreich!</h2>
        <p className="text-gray-600">
          Ihr kostenloses Probemonat für Mietfach {booking.mietfachNummer} ist aktiv.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">Was passiert als Nächstes?</h3>
        <ul className="text-sm text-green-700 space-y-1 text-left">
          <li>• Sie erhalten eine Bestätigungs-E-Mail mit allen Details</li>
          <li>• Ihr Mietfach wird innerhalb von 24 Stunden freigeschaltet</li>
          <li>• Sie können sofort mit der Nutzung beginnen</li>
          <li>• 7 Tage vor Ende des Probemonats erhalten Sie eine Erinnerung</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate('/vendor/trial-bookings')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Meine Buchungen anzeigen
        </button>
        <button
          onClick={() => navigate('/vendor/dashboard')}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Zum Dashboard
        </button>
      </div>
    </div>
  );
};

/**
 * TrialBookingConfirmation component for trial booking confirmation with terms acceptance
 * 
 * @component
 * @param {TrialBookingConfirmationProps} props - Component props containing booking data and callbacks
 * @returns {JSX.Element} Comprehensive booking confirmation interface or success page
 * 
 * @description
 * Main trial booking confirmation component that guides users through accepting trial terms
 * and confirming their booking. Transitions to success state after confirmation.
 * 
 * @features
 * - Comprehensive booking overview with pricing details
 * - Trial terms and conditions display
 * - Terms acceptance checkbox requirement
 * - API integration for booking confirmation
 * - Loading states during submission
 * - Error handling with user feedback
 * - Success state transition
 * - Cancellation information and policies
 * 
 * @trial_terms
 * - First month completely free
 * - Cancellable anytime during trial without reasons
 * - Regular monthly billing after trial
 * - 7-day reminder before trial end
 * - 24-hour activation timeline
 * 
 * @api_integration
 * - POST to /vendor-auth/bookings/confirm
 * - Includes mietfachId, startdatum, istProbemonatBuchung flag
 * - Bearer token authentication
 * - Error handling with user alerts
 * 
 * @state_management
 * - confirmed: Boolean for success state transition
 * - termsAccepted: Boolean for terms acceptance validation
 * - isSubmitting: Boolean for loading state during API calls
 * 
 * @complexity O(1) - Fixed form processing regardless of data size
 */
const TrialBookingConfirmation: React.FC<TrialBookingConfirmationProps> = ({ 
  booking, 
  onBack 
}) => {
  const { user } = useVendorAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmation = async () => {
    if (!termsAccepted) {
      window.alert('Bitte akzeptieren Sie die Probemonat-Bedingungen');
      return;
    }

    setIsSubmitting(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/vendor-auth/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
        },
        body: JSON.stringify({
          mietfachId: booking.mietfachId,
          startdatum: booking.startdatum,
          istProbemonatBuchung: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setConfirmed(true);
      } else {
        window.alert(result.message || 'Fehler bei der Buchungsbestätigung');
      }
    } catch (error) {
      console.error('Booking confirmation error:', error);
      window.alert('Fehler bei der Buchungsbestätigung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmed) {
    return <TrialBookingSuccess booking={booking} />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 mr-3" />
          <h2 className="text-2xl font-bold">Ihre Probemonat-Buchung</h2>
        </div>
        <p className="text-center text-blue-100">
          Bestätigen Sie Ihre kostenlose Probemonat-Buchung
        </p>
      </div>

      <div className="p-6">
        {/* Booking Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Buchungsübersicht
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Mietfach</label>
                <div className="text-lg font-semibold">{booking.mietfachNummer}</div>
                <div className="text-sm text-gray-600">{booking.kategorie}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Startdatum</label>
                <div className="font-medium">
                  {new Date(booking.startdatum).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="text-sm font-medium text-green-700">Kosten im Probemonat</label>
                <div className="text-2xl font-bold text-green-800 flex items-center">
                  <Euro className="w-6 h-6 mr-1" />
                  0,00
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Regulärer Preis ab {user?.trialEndDate ? new Date(user.trialEndDate).toLocaleDateString('de-DE') : 'Ende des Probemonats'}
                </label>
                <div className="font-medium">€{booking.preis}/Monat</div>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Terms */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Probemonat-Bedingungen
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">
                Der erste Monat ist <strong>komplett kostenlos</strong> - keine versteckten Kosten
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">
                Sie können <strong>jederzeit während des Probemonats</strong> ohne Angabe von Gründen kündigen
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">
                Nach Ablauf des Probemonats beginnt die <strong>reguläre monatliche Abrechnung</strong>
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">
                Sie erhalten eine <strong>Erinnerung 7 Tage vor Ende</strong> des Probemonats
              </span>
            </li>
          </ul>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm text-blue-700">
                Ich habe die Probemonat-Bedingungen gelesen und akzeptiere sie
              </span>
            </label>
          </div>
        </div>

        {/* Cancellation Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <strong>Stornierung jederzeit möglich:</strong> Sie können diese Buchung jederzeit 
              während des Probemonats in Ihrem Dashboard unter "Meine Buchungen" stornieren. 
              Es fallen keine Kosten an.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Zurück
          </button>
        )}
        <button 
          onClick={handleConfirmation}
          disabled={!termsAccepted || isSubmitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Wird bestätigt...' : 'Probemonat-Buchung bestätigen'}
        </button>
      </div>
    </div>
  );
};

export default TrialBookingConfirmation;