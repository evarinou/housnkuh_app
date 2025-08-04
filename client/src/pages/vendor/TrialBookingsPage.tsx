import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Package, Calendar, X, CheckCircle } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import TrialCancellationModal from '../../components/vendor/TrialCancellationModal';

interface TrialBooking {
  id: string;
  mietfachNummer: string;
  startDate: string;
  trialEndDate: string;
  regularPrice: number;
  willBeChargedOn: string;
  isCancellable: boolean;
  isCancelled: boolean;
  status: string;
}

interface TrialData {
  isInTrial: boolean;
  trialBookings: TrialBooking[];
  daysRemaining: number;
  canBookMore: boolean;
}

const TrialBookingsPage: React.FC = () => {
  const { user, getTrialStatus, cancelTrialBooking } = useVendorAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<TrialBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<TrialBooking | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getTrialStatus();
      if (response.success && response.data) {
        setBookings(response.data.trialBookings || []);
      } else {
        setError(response.message || 'Fehler beim Laden der Buchungen');
      }
    } catch (err) {
      setError('Fehler beim Laden der Buchungen');
      console.error('Trial bookings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (booking: TrialBooking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!selectedBooking) return;

    try {
      const result = await cancelTrialBooking(selectedBooking.id, reason);
      if (result.success) {
        setNotification({ type: 'success', message: 'Buchung erfolgreich storniert' });
        fetchBookings(); // Refresh bookings
        setShowCancelModal(false);
        setSelectedBooking(null);
      } else {
        setNotification({ type: 'error', message: result.message || 'Fehler beim Stornieren der Buchung' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Fehler beim Stornieren der Buchung' });
      console.error('Cancel booking error:', err);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Calculate trial countdown badge
  const TrialCountdownBadge = () => {
    if (!user?.trialEndDate) return null;

    const end = new Date(user.trialEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    return (
      <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
        <Star className="w-4 h-4 mr-1" />
        <span>{daysRemaining} Tag{daysRemaining !== 1 ? 'e' : ''} verbleibend</span>
      </div>
    );
  };

  if (loading) {
    return (
      <VendorLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meine Probemonat-Buchungen</h1>
            <p className="text-gray-600">
              Verwalten Sie Ihre kostenlosen Probemonat-Buchungen
            </p>
          </div>
          <TrialCountdownBadge />
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <X className="w-5 h-5 mr-2" />
              )}
              {notification.message}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
            <button 
              onClick={fetchBookings}
              className="ml-2 text-red-600 hover:text-red-800 underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Bookings Grid */}
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Noch keine Probemonat-Buchungen
            </h3>
            <p className="text-gray-500 mb-6">
              Nutzen Sie Ihren kostenlosen Probemonat und buchen Sie Ihr erstes Mietfach.
            </p>
            <button
              onClick={() => navigate('/mietfach-buchen')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package className="w-5 h-5 mr-2" />
              Jetzt kostenlos buchen
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Mietfach {booking.mietfachNummer}
                        </h3>
                        <div className="flex items-center mt-1">
                          {booking.isCancelled ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Storniert
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              <Star className="w-3 h-3 mr-1" />
                              Probemonat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${booking.isCancelled ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(booking.startDate).toLocaleDateString('de-DE')}
                          </div>
                          <div className="text-xs text-gray-500">Probemonat beginnt</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 h-px bg-gray-200"></div>
                      
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${booking.isCancelled ? 'bg-gray-300' : 'bg-gray-300'}`}></div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(booking.trialEndDate).toLocaleDateString('de-DE')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.isCancelled ? 'Storniert' : 'Reguläre Laufzeit beginnt'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="font-medium">
                        {booking.isCancelled ? (
                          <span className="text-gray-600">Storniert</span>
                        ) : (
                          <span className="text-green-600">Aktiv (kostenlos)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Kosten aktuell</div>
                      <div className="font-medium text-green-600">€0,00</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">
                        Kosten ab {new Date(booking.trialEndDate).toLocaleDateString('de-DE')}
                      </div>
                      <div className="font-medium">€{booking.regularPrice}/Monat</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!booking.isCancelled && booking.isCancellable && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleCancelClick(booking)}
                        className="inline-flex items-center px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Kostenlos stornieren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trial FAQ Section */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Häufige Fragen zum Probemonat</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Ist der Probemonat wirklich kostenlos?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Ja, der erste Monat ist komplett kostenlos. Es entstehen keine Kosten und keine Verpflichtungen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Kann ich während des Probemonats kündigen?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Ja, Sie können jederzeit ohne Angabe von Gründen und ohne Fristen kündigen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Was passiert nach dem Probemonat?</h4>
              <p className="text-sm text-gray-600 mt-1">
                Nach dem Probemonat beginnt die reguläre monatliche Abrechnung. Sie erhalten eine Erinnerung 7 Tage vorher.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedBooking && (
          <TrialCancellationModal
            booking={selectedBooking}
            onConfirm={handleCancelConfirm}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedBooking(null);
            }}
          />
        )}
      </div>
    </VendorLayout>
  );
};

export default TrialBookingsPage;