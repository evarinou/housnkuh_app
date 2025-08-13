/**
 * @file PackageTrackingWidget.tsx
 * @purpose Complex widget component for tracking Zusatzleistungen packages with comprehensive status management
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  AlertCircle,
  ChevronRight,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

/**
 * Package tracking data interface for Zusatzleistungen
 * @interface PackageTracking
 * @property {string} _id - Unique package identifier
 * @property {string} vertrag_id - Associated contract ID
 * @property {'lagerservice' | 'versandservice'} package_typ - Type of additional service
 * @property {PackageStatus} status - Current package status in workflow
 * @property {string} ankunft_datum - Package arrival timestamp
 * @property {string} einlagerung_datum - Storage timestamp
 * @property {string} versand_datum - Shipping timestamp
 * @property {string} zustellung_datum - Delivery timestamp
 * @property {string} notizen - Admin notes for package
 * @property {string} tracking_nummer - External tracking number
 */
interface PackageTracking {
  _id: string;
  vertrag_id: string;
  package_typ: 'lagerservice' | 'versandservice';
  status: 'erwartet' | 'angekommen' | 'eingelagert' | 'versandt' | 'zugestellt';
  ankunft_datum?: string;
  einlagerung_datum?: string;
  versand_datum?: string;
  zustellung_datum?: string;
  notizen?: string;
  tracking_nummer?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Contract data interface with Zusatzleistungen configuration
 * @interface Contract
 * @property {string} _id - Contract identifier
 * @property {object} zusatzleistungen - Additional services configuration object
 * @property {PackageTracking[]} packages - Array of tracked packages for this contract
 */
interface Contract {
  _id: string;
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
    lagerservice_bestätigt?: string;
    versandservice_aktiv: boolean;
  };
  packages?: PackageTracking[];
}

/**
 * PackageTrackingWidget component displaying Zusatzleistungen package tracking
 * 
 * @component
 * @returns {JSX.Element} Widget displaying package tracking status and statistics
 * 
 * @description
 * Complex widget for vendor dashboard showing package tracking for additional services
 * (Lagerservice and Versandservice). Provides real-time status updates, timeline view,
 * and package statistics. Only displays when vendor has active Zusatzleistungen.
 * 
 * @features
 * - Real-time package status tracking (erwartet → angekommen → eingelagert → versandt → zugestellt)
 * - Zusatzleistungen integration (Lagerservice/Versandservice detection)
 * - Timeline display with timestamps for each status transition
 * - Package statistics (stored vs shipped counts)
 * - Admin notes display for package-specific information
 * - Responsive design with loading and error states
 * - Limited display (3 packages) with link to full view
 * 
 * @business_logic
 * - Fetches contracts with Zusatzleistungen from /vendor-contracts/zusatzleistungen
 * - Filters contracts to show only those with active additional services
 * - Status workflow: erwartet → angekommen → eingelagert → versandt → zugestellt
 * - Different handling for Lagerservice vs Versandservice packages
 * 
 * @api_endpoints
 * - GET /vendor-contracts/zusatzleistungen - Fetch contracts with package data
 * 
 * @complexity O(n*m) where n = contracts, m = packages per contract
 */
const PackageTrackingWidget: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContractsWithPackages();
  }, []);

  /**
   * Fetches vendor contracts with Zusatzleistungen and package tracking data
   * @async
   * @function fetchContractsWithPackages
   * @returns {Promise<void>} Updates contracts state with fetched data
   * 
   * @api_call GET /vendor-contracts/zusatzleistungen
   * @authentication Bearer token from localStorage
   * @error_handling 401 → Session expired, Other → Generic error message
   */
  const fetchContractsWithPackages = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      if (!token) {
        setError('Authentifizierung erforderlich');
        return;
      }

      const response = await axios.get(`${apiUrl}/vendor/contracts/zusatzleistungen`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setContracts(response.data.contracts);
      } else {
        setError('Unerwartete Antwort vom Server');
      }
    } catch (err: any) {
      console.error('Error fetching contracts with packages:', err);
      const errorMessage = err.response?.status === 401 
        ? 'Sitzung abgelaufen - bitte neu anmelden'
        : 'Fehler beim Laden der Package-Daten';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maps package status to display configuration (colors, icons, text)
   * @param {string} status - Package status from database
   * @returns {object} Status configuration with color classes, icon component, and text
   * 
   * @status_workflow
   * erwartet → angekommen → eingelagert → versandt → zugestellt
   * 
   * @color_coding
   * - Gray: erwartet (waiting)
   * - Blue: angekommen (arrived)  
   * - Green: eingelagert (stored)
   * - Purple: versandt (shipped)
   * - Emerald: zugestellt (delivered)
   */
  const getStatusConfig = (status: string) => {
    const configs = {
      'erwartet': { 
        color: 'bg-gray-100 text-gray-800 border-gray-300', 
        icon: Clock, 
        text: 'Erwartet',
        description: 'Paket wird erwartet'
      },
      'angekommen': { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        icon: MapPin, 
        text: 'Angekommen',
        description: 'Paket ist im Lager angekommen'
      },
      'eingelagert': { 
        color: 'bg-green-100 text-green-800 border-green-300', 
        icon: Package, 
        text: 'Eingelagert',
        description: 'Paket ist eingelagert'
      },
      'versandt': { 
        color: 'bg-purple-100 text-purple-800 border-purple-300', 
        icon: Truck, 
        text: 'Versandt',
        description: 'Paket wurde versandt'
      },
      'zugestellt': { 
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300', 
        icon: CheckCircle, 
        text: 'Zugestellt',
        description: 'Paket wurde zugestellt'
      }
    };
    return configs[status as keyof typeof configs] || configs.erwartet;
  };

  /**
   * Formats timestamp for German locale display with time
   * @param {string | undefined} dateString - ISO date string from database
   * @returns {string | null} Formatted date string or null if no date provided
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return 'Ungültiges Datum';
    }
  };

  const hasActivePackages = contracts.some(contract => 
    contract.packages && contract.packages.length > 0
  );

  const hasZusatzleistungen = contracts.some(contract => 
    contract.zusatzleistungen?.lagerservice || contract.zusatzleistungen?.versandservice
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!hasZusatzleistungen) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-50 p-4 border-b border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="w-6 h-6 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-secondary">Package-Tracking</h2>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Aktivieren Sie Zusatzleistungen wie Lager- oder Versandservice, um das Package-Tracking zu nutzen.
          </p>
          <Link 
            to="/vendor/contracts"
            className="inline-flex items-center text-primary hover:text-primary/80"
          >
            Zu meinen Verträgen
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-indigo-50 p-4 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-6 h-6 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-secondary">Package-Tracking</h2>
          </div>
          <Link 
            to="/vendor/meine-buchungen"
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            Alle Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
      
      <div className="p-6">
        {hasActivePackages ? (
          <div className="space-y-4">
            {contracts.map(contract => (
              contract.packages && contract.packages.length > 0 && (
                <div key={contract._id} className="space-y-3">
                  {contract.packages.slice(0, 3).map(pkg => {
                    const statusConfig = getStatusConfig(pkg.status);
                    const IconComponent = statusConfig.icon;
                    
                    return (
                      <div 
                        key={pkg._id} 
                        className={`border rounded-lg p-4 ${statusConfig.color} border-opacity-50`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${statusConfig.color} bg-opacity-50`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {pkg.package_typ === 'lagerservice' ? 'Lagerservice' : 'Versandservice'}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {statusConfig.description}
                              </div>
                              
                              {/* Timeline info */}
                              <div className="mt-2 space-y-1 text-xs text-gray-500">
                                {pkg.ankunft_datum && (
                                  <div className="flex items-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Ankunft: {formatDate(pkg.ankunft_datum)}
                                  </div>
                                )}
                                {pkg.einlagerung_datum && (
                                  <div className="flex items-center">
                                    <Package className="w-3 h-3 mr-1" />
                                    Eingelagert: {formatDate(pkg.einlagerung_datum)}
                                  </div>
                                )}
                                {pkg.versand_datum && (
                                  <div className="flex items-center">
                                    <Truck className="w-3 h-3 mr-1" />
                                    Versandt: {formatDate(pkg.versand_datum)}
                                  </div>
                                )}
                              </div>
                              
                              {pkg.notizen && (
                                <div className="mt-2 flex items-start text-xs text-gray-600">
                                  <MessageSquare className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                  <span className="italic">{pkg.notizen}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            {statusConfig.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ))}
            
            {contracts.some(c => c.packages && c.packages.length > 3) && (
              <Link 
                to="/vendor/meine-buchungen"
                className="block text-center text-sm text-indigo-600 hover:text-indigo-800 pt-2"
              >
                Weitere Packages anzeigen →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Noch keine Packages vorhanden</p>
            <p className="text-sm text-gray-500">
              Senden Sie Ihr erstes Paket an unser Lager, um das Tracking zu starten.
            </p>
          </div>
        )}
        
        {/* Quick Stats */}
        {hasActivePackages && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {contracts.reduce((sum, c) => sum + (c.packages?.filter(p => p.status === 'eingelagert').length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Eingelagert</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {contracts.reduce((sum, c) => sum + (c.packages?.filter(p => p.status === 'versandt' || p.status === 'zugestellt').length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Versandt</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageTrackingWidget;