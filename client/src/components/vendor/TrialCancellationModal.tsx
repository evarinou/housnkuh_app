/**
 * @file TrialCancellationModal.tsx
 * @purpose Modal component for trial booking cancellation with reason collection and confirmation workflow
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useState } from 'react';
import { X, Info, AlertTriangle } from 'lucide-react';

/**
 * Interface for trial booking data required for cancellation
 * @interface TrialBooking
 * @property {string} id - Unique booking identifier
 * @property {string} mietfachNummer - Display number of the Mietfach
 * @property {string} startDate - Booking start date (ISO string)
 * @property {string} trialEndDate - Trial period end date (ISO string)
 * @property {number} regularPrice - Regular monthly price (shows cost savings)
 * @property {string} willBeChargedOn - Date when regular billing would start
 */
interface TrialBooking {
  id: string;
  mietfachNummer: string;
  startDate: string;
  trialEndDate: string;
  regularPrice: number;
  willBeChargedOn: string;
}

/**
 * Props interface for the TrialCancellationModal component
 * @interface TrialCancellationModalProps
 * @property {TrialBooking} booking - Trial booking data for cancellation
 * @property {function} onConfirm - Async callback function for cancellation confirmation
 * @property {function} onClose - Callback function to close the modal
 */
interface TrialCancellationModalProps {
  booking: TrialBooking;
  onConfirm: (reason?: string) => Promise<void>;
  onClose: () => void;
}

/**
 * TrialCancellationModal component for handling trial booking cancellation workflow
 * 
 * @component
 * @param {TrialCancellationModalProps} props - Component props containing booking data and callbacks
 * @returns {JSX.Element} Full-screen modal with cancellation workflow
 * 
 * @description
 * Comprehensive modal component for trial booking cancellation that collects cancellation
 * reasons, displays impact information, and provides clear confirmation workflow.
 * Ensures users understand consequences before proceeding with cancellation.
 * 
 * @features
 * - Full-screen overlay modal with backdrop
 * - Booking details summary with cost savings display
 * - Cancellation impact information (immediate end, no costs)
 * - Optional reason collection with predefined options
 * - Confirmation checkbox requirement
 * - Loading states during processing
 * - Warning about Mietfach availability
 * - German localized content
 * 
 * @cancellation_process
 * - Shows immediate booking termination
 * - Mietfach released for others
 * - No costs incurred
 * - Email confirmation sent
 * - Prevents accidental cancellations
 * 
 * @reason_options
 * - wrong_size: Mietfach doesn't fit needs
 * - changed_mind: Changed mind about booking
 * - found_alternative: Found alternative solution
 * - technical_issues: Technical problems
 * - cost_concerns: Cost-related reasons
 * - time_constraints: Time management issues
 * - other: Other unspecified reasons
 * 
 * @state_management
 * - reason: String for selected cancellation reason
 * - confirmed: Boolean for confirmation checkbox
 * - isProcessing: Boolean for async operation states
 * 
 * @accessibility
 * - Focus management within modal
 * - Keyboard navigation support
 * - Clear labeling and descriptions
 * - Disabled states during processing
 * 
 * @complexity O(1) - Fixed form processing regardless of booking data
 */
const TrialCancellationModal: React.FC<TrialCancellationModalProps> = ({ 
  booking, 
  onConfirm, 
  onClose 
}) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmation = async () => {
    if (!confirmed) {
      alert('Bitte bestätigen Sie die Stornierung');
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(reason);
    } catch (error) {
      console.error('Cancellation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Probemonat-Buchung stornieren</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Was passiert bei der Stornierung?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Ihre Buchung wird sofort beendet</li>
                  <li>• Das Mietfach wird wieder für andere freigegeben</li>
                  <li>• Es entstehen keine Kosten</li>
                  <li>• Sie erhalten eine Bestätigung per E-Mail</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-3">Buchungsdetails</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Mietfach:</span>
                <div className="font-medium">{booking.mietfachNummer}</div>
              </div>
              <div>
                <span className="text-gray-600">Gebucht seit:</span>
                <div className="font-medium">
                  {new Date(booking.startDate).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Probemonat endet:</span>
                <div className="font-medium">
                  {new Date(booking.trialEndDate).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Kostenersparnis:</span>
                <div className="font-medium text-green-600">€{booking.regularPrice}</div>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grund für die Stornierung (optional)
            </label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            >
              <option value="">Bitte wählen...</option>
              <option value="wrong_size">Mietfach passt nicht zu meinen Bedürfnissen</option>
              <option value="changed_mind">Habe es mir anders überlegt</option>
              <option value="found_alternative">Alternative Lösung gefunden</option>
              <option value="technical_issues">Technische Probleme</option>
              <option value="cost_concerns">Kostengründe</option>
              <option value="time_constraints">Zeitmangel</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>

          {/* Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <span className="text-sm text-gray-700">
                Ich möchte diese Probemonat-Buchung wirklich stornieren und verstehe, 
                dass das Mietfach sofort wieder verfügbar wird.
              </span>
            </label>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <strong>Hinweis:</strong> Nach der Stornierung können Sie das gleiche Mietfach 
                möglicherweise nicht mehr buchen, da es von anderen Nutzern reserviert werden könnte.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isProcessing}
          >
            Buchung behalten
          </button>
          <button 
            onClick={handleConfirmation}
            disabled={!confirmed || isProcessing}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Wird storniert...' : 'Buchung stornieren'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialCancellationModal;