import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, AlertCircle, RefreshCw, Rocket, Timer, Package } from 'lucide-react';
import axios from 'axios';

interface LaunchDayMetrics {
  launchConfiguration: {
    enabled: boolean;
    openingDate: string | null;
    openingTime: string;
    isStoreOpen: boolean;
    launchStatus: 'not_configured' | 'scheduled' | 'launched';
    isLaunchDay: boolean;
    timeUntilLaunch: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
      totalMilliseconds: number;
    } | null;
  };
  vendorStatistics: {
    preregistered: number;
    activeTrials: number;
    expiredTrials: number;
    totalVendors: number;
    readyForActivation: number;
    activationRate: number;
  };
  recentActivations: Array<{
    name: string;
    email: string;
    activatedAt: string;
  }>;
  systemStatus: {
    scheduledJobs: {
      totalJobs: number;
      jobs: Record<string, any>;
      timezone: string;
    };
    nextActivationCheck: string;
    serverTime: string;
    timezone: string;
  };
}

const LaunchDayMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<LaunchDayMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  const fetchMetrics = async () => {
    setError('');
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.get(`${apiUrl}/admin/launch-day/metrics`);
      
      if (response.data.success) {
        setMetrics(response.data.metrics);
      } else {
        setError('Fehler beim Laden der Launch-Metriken');
      }
    } catch (err) {
      console.error('Error fetching launch metrics:', err);
      setError('Fehler beim Laden der Launch-Metriken');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!metrics?.launchConfiguration.timeUntilLaunch) return;

    const updateCountdown = () => {
      if (metrics.launchConfiguration.openingDate) {
        const openingDate = new Date(metrics.launchConfiguration.openingDate);
        const [hours, minutes] = (metrics.launchConfiguration.openingTime || '00:00').split(':').map(Number);
        openingDate.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const timeDiff = openingDate.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          setCountdown({
            days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
          });
        } else {
          setCountdown(null);
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [metrics]);

  const triggerManualActivation = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.post(`${apiUrl}/admin/trials/activate`);
      
      if (response.data.success) {
        alert(response.data.activated ? 
          'Trial-Aktivierung wurde erfolgreich durchgeführt!' : 
          'Keine Aktivierung notwendig - Store ist noch nicht geöffnet oder keine vorregistrierten Vendors vorhanden.'
        );
        fetchMetrics();
      }
    } catch (err) {
      alert('Fehler bei der manuellen Aktivierung');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-600 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error || 'Keine Metriken verfügbar'}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'launched': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'launched': return 'Store geöffnet';
      case 'scheduled': return 'Geplant';
      default: return 'Nicht konfiguriert';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Rocket className="h-8 w-8 mr-3 text-primary" />
          Launch Day Monitor
        </h2>
        <button
          onClick={fetchMetrics}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Launch Status */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Launch Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(metrics.launchConfiguration.launchStatus)}`}>
              {getStatusText(metrics.launchConfiguration.launchStatus)}
            </span>
          </div>
          {metrics.launchConfiguration.isLaunchDay && (
            <div className="text-orange-600 font-bold text-lg animate-pulse">
              🚀 LAUNCH DAY!
            </div>
          )}
        </div>

        {/* Countdown or Launch Info */}
        {countdown && metrics.launchConfiguration.launchStatus === 'scheduled' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Zeit bis zur Store-Eröffnung:</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{countdown.days}</div>
                <div className="text-sm text-blue-700">Tage</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{countdown.hours}</div>
                <div className="text-sm text-blue-700">Stunden</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{countdown.minutes}</div>
                <div className="text-sm text-blue-700">Minuten</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{countdown.seconds}</div>
                <div className="text-sm text-blue-700">Sekunden</div>
              </div>
            </div>
            {metrics.launchConfiguration.openingDate && (
              <p className="text-sm text-blue-700 mt-3 text-center">
                Geplant für: {new Date(metrics.launchConfiguration.openingDate).toLocaleDateString('de-DE')} 
                {' '}um {metrics.launchConfiguration.openingTime} Uhr
              </p>
            )}
          </div>
        ) : metrics.launchConfiguration.launchStatus === 'launched' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-green-800">
              <CheckCircle className="inline h-5 w-5 mr-2" />
              Store wurde am {metrics.launchConfiguration.openingDate ? 
                new Date(metrics.launchConfiguration.openingDate).toLocaleDateString('de-DE') : 'unbekannt'} 
              {' '}um {metrics.launchConfiguration.openingTime} Uhr geöffnet.
            </p>
          </div>
        ) : (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mt-4">
            <p className="text-gray-600">
              <AlertCircle className="inline h-5 w-5 mr-2" />
              Kein Eröffnungsdatum konfiguriert.
            </p>
          </div>
        )}
      </div>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Vorregistriert</p>
              <p className="text-2xl font-bold text-blue-900">{metrics.vendorStatistics.preregistered}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-xs text-blue-600 mt-2">Bereit für Aktivierung</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Aktive Trials</p>
              <p className="text-2xl font-bold text-green-900">{metrics.vendorStatistics.activeTrials}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-xs text-green-600 mt-2">
            {metrics.vendorStatistics.activationRate}% Aktivierungsrate
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gesamt Vendors</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.vendorStatistics.totalVendors}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {metrics.vendorStatistics.expiredTrials} abgelaufen
          </p>
        </div>
      </div>

      {/* Recent Activations */}
      {metrics.recentActivations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kürzliche Aktivierungen</h3>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aktiviert am</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.recentActivations.map((activation, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-900">{activation.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{activation.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(activation.activatedAt).toLocaleString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            <span>Nächste Prüfung: {new Date(metrics.systemStatus.nextActivationCheck).toLocaleTimeString('de-DE')}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Timer className="h-4 w-4 mr-2 text-gray-400" />
            <span>Server Zeit: {new Date(metrics.systemStatus.serverTime).toLocaleString('de-DE')}</span>
          </div>
        </div>

        {/* Manual Activation Button */}
        {metrics.vendorStatistics.preregistered > 0 && metrics.launchConfiguration.isStoreOpen && (
          <div className="mt-6">
            <button
              onClick={triggerManualActivation}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Manuelle Aktivierung durchführen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchDayMonitor;