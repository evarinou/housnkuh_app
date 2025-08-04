import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Package, Info } from 'lucide-react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

interface TrialBooking {
  id: string;
  mietfachNummer: string;
  startDate: string;
  trialEndDate: string;
  willBeChargedOn: string;
  isCancellable: boolean;
  status: string;
}

interface TrialData {
  isInTrial: boolean;
  trialBookings: TrialBooking[];
  daysRemaining: number;
  canBookMore: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
}

const TrialStatusDashboard: React.FC = () => {
  const { user, getTrialStatus, cancelTrialBooking } = useVendorAuth();
  const navigate = useNavigate();
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTrialStatus();
      if (response.success && response.data) {
        setTrialData(response.data);
      } else {
        setError(response.message || 'Fehler beim Laden der Probemonat-Daten');
      }
    } catch (err) {
      setError('Fehler beim Laden der Probemonat-Daten');
      console.error('Trial status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getTrialStatus]);

  const updateCountdown = useCallback(() => {
    if (user?.trialEndDate) {
      const end = new Date(user.trialEndDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeRemaining({ days, hours, minutes });
      } else {
        setTimeRemaining(null);
      }
    }
  }, [user?.trialEndDate]);

  useEffect(() => {
    fetchTrialStatus();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [fetchTrialStatus, updateCountdown]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Möchten Sie diese Buchung wirklich stornieren?')) {
      return;
    }

    try {
      const result = await cancelTrialBooking(bookingId);
      if (result.success) {
        window.alert('Buchung erfolgreich storniert');
        fetchTrialStatus(); // Refresh data
      } else {
        window.alert(result.message || 'Fehler beim Stornieren der Buchung');
      }
    } catch (err) {
      window.alert('Fehler beim Stornieren der Buchung');
      console.error('Cancel booking error:', err);
    }
  };

  const navigateToBooking = () => {
    navigate('/mietfach-buchen');
  };

  const navigateToInfo = () => {
    navigate('/probemonat-info');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center text-red-700">
          <Info className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!trialData || !trialData.isInTrial) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-md p-6 mb-8 border border-blue-200">
      <div className="trial-header mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-blue-500 text-white p-2 rounded-full mr-3">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-800">Probemonat Aktiv</h2>
              <p className="text-blue-600">Kostenlos bis zum Ende Ihres Probemonats</p>
            </div>
          </div>
          
          {timeRemaining && (
            <div className="flex items-center space-x-3 text-center">
              <div className="bg-white/80 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold text-blue-800">{timeRemaining.days}</div>
                <div className="text-xs text-blue-600">Tage</div>
              </div>
              <div className="bg-white/80 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold text-blue-800">{timeRemaining.hours}</div>
                <div className="text-xs text-blue-600">Stunden</div>
              </div>
              <div className="bg-white/80 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold text-blue-800">{timeRemaining.minutes}</div>
                <div className="text-xs text-blue-600">Minuten</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/80 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Ihre Probemonat-Vorteile
          </h3>
          <ul className="space-y-2">
            <li className="flex items-center text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Erste Buchung komplett kostenlos
            </li>
            <li className="flex items-center text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Jederzeit kündbar ohne Frist
            </li>
            <li className="flex items-center text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Voller Zugang zu allen Funktionen
            </li>
            <li className="flex items-center text-sm text-blue-700">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Keine Zahlungsverpflichtung
            </li>
          </ul>
        </div>

        {trialData.trialBookings.length > 0 && (
          <div className="bg-white/80 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Ihre Probemonat-Buchungen
            </h3>
            <div className="space-y-3">
              {trialData.trialBookings.map(booking => (
                <div key={booking.id} className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-blue-800">Mietfach {booking.mietfachNummer}</div>
                      <div className="text-sm text-blue-600">
                        Start: {new Date(booking.startDate).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Kostenlos
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mb-2">
                    Kostenlos bis {new Date(booking.willBeChargedOn).toLocaleDateString('de-DE')}
                  </div>
                  {booking.isCancellable && (
                    <button 
                      className="text-xs text-red-600 hover:text-red-700 hover:underline"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      Kostenlos stornieren
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          onClick={navigateToBooking}
        >
          <Package className="w-4 h-4 mr-2" />
          Jetzt Mietfach buchen
        </button>
        <button 
          className="flex items-center justify-center px-6 py-3 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          onClick={navigateToInfo}
        >
          <Info className="w-4 h-4 mr-2" />
          Mehr über den Probemonat
        </button>
      </div>
    </div>
  );
};

export default TrialStatusDashboard;