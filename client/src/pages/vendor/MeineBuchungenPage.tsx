/**
 * @file MeineBuchungenPage.tsx
 * @purpose Vendor dashboard page for managing bookings and package tracking. Displays vendor's active bookings with status filters and package tracking for additional services like storage and shipping.
 * @created 2025-01-15
 * @modified 2025-08-07
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import { IBooking, BookingStatus } from '../../types/booking';
import BookingsList from '../../components/vendor/BookingsList';
import StatusFilterTabs from '../../components/vendor/StatusFilterTabs';
import BookingDetailModal from '../../components/vendor/BookingDetailModal';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import axios from 'axios';

/**
 * Status counts interface for booking status filter tabs
 * @interface StatusCounts
 */
interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
}

/**
 * Package tracking interface for Lager- and Versandservice packages
 * @interface PackageTracking
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
 * Contract interface with additional services (Zusatzleistungen) and package tracking
 * @interface Contract
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
 * MeineBuchungenPage - Vendor dashboard for managing bookings and package tracking
 * 
 * This component provides vendors with:
 * - Overview of all their bookings with status filtering
 * - Package tracking for additional services (Lagerservice/Versandservice)
 * - Detailed booking modal for individual booking information
 * - Tab-based navigation between bookings and package tracking
 * 
 * @component
 * @returns {JSX.Element} The vendor bookings management page
 */
const MeineBuchungenPage: React.FC = () => {
  const { user, bookings, isBookingsLoading, refreshBookings } = useVendorAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<IBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'packages'>('bookings');

  /**
   * Fetches vendor contracts with package tracking information
   * @description Retrieves contracts with Zusatzleistungen and associated package tracking data
   * @returns {Promise<void>}
   */
  const fetchContractsWithPackages = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.get(`${apiUrl}/vendor/contracts/zusatzleistungen`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vendorToken')}`
        }
      });
      
      if (response.data.success) {
        setContracts(response.data.contracts || []);
      }
    } catch (err) {
      console.error('Error fetching contracts with packages:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    // Only fetch contracts - bookings are handled by VendorAuthContext
    fetchContractsWithPackages();
  }, [user?.id, fetchContractsWithPackages]);

  /**
   * Calculates booking status counts for filter tabs
   * @param {IBooking[]} bookings - Array of booking objects to count
   * @returns {StatusCounts} Object containing counts for each booking status
   */
  const getStatusCounts = (bookings: IBooking[]): StatusCounts => {
    const counts = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      active: 0,
      completed: 0
    };

    bookings.forEach(booking => {
      counts[booking.status]++;
    });

    return counts;
  };

  /**
   * Filters bookings based on selected status filter
   * @description Returns all bookings or filters by specific status
   */
  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  const statusCounts = getStatusCounts(bookings);

  /**
   * Handles clicking on a booking to open detail modal
   * @param {IBooking} booking - The booking to display in detail
   */
  const handleBookingClick = (booking: IBooking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  /**
   * Handles closing the booking detail modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  /**
   * Handles refresh action to reload bookings data
   */
  const handleRefresh = async () => {
    try {
      setError(null);
      await refreshBookings();
      await fetchContractsWithPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      console.error('Error refreshing data:', err);
    }
  };

  /**
   * Gets status configuration for package tracking display
   * @param {string} status - Package status
   * @returns {object} Configuration object with color, icon, and text for the status
   */
  const getStatusConfig = (status: string) => {
    const configs = {
      'erwartet': { 
        color: 'bg-gray-100 text-gray-800', 
        icon: Clock, 
        text: 'Erwartet' 
      },
      'angekommen': { 
        color: 'bg-blue-100 text-blue-800', 
        icon: MapPin, 
        text: 'Angekommen' 
      },
      'eingelagert': { 
        color: 'bg-green-100 text-green-800', 
        icon: Package, 
        text: 'Eingelagert' 
      },
      'versandt': { 
        color: 'bg-purple-100 text-purple-800', 
        icon: Truck, 
        text: 'Versandt' 
      },
      'zugestellt': { 
        color: 'bg-emerald-100 text-emerald-800', 
        icon: CheckCircle, 
        text: 'Zugestellt' 
      }
    };
    return configs[status as keyof typeof configs] || configs.erwartet;
  };

  /**
   * Formats date string for German locale display
   * @param {string | undefined} dateString - ISO date string to format
   * @returns {string} Formatted date string or dash if undefined
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasPackages = contracts.some(contract => 
    contract.packages && contract.packages.length > 0
  );

  const hasZusatzleistungen = contracts.some(contract => 
    contract.zusatzleistungen?.lagerservice || contract.zusatzleistungen?.versandservice
  );

  return (
    <VendorLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeTab === 'bookings' ? 'Meine Buchungen' : 'Package-Tracking'}
          </h1>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              {activeTab === 'bookings' 
                ? 'Verwalte Deine aktuellen und vergangenen Buchungen'
                : 'Verfolge Deine Lagerpakete und Versandungen'
              }
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              disabled={isBookingsLoading}
            >
              {isBookingsLoading ? 'Aktualisiert...' : 'Aktualisieren'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'bookings'
                ? 'bg-primary text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Buchungen ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'packages'
                ? 'bg-primary text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={!hasZusatzleistungen}
          >
            Package-Tracking
            {hasZusatzleistungen && (
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {contracts.reduce((sum, contract) => 
                  sum + (contract.packages?.length || 0), 0
                )}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Fehler beim Laden der Daten</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                    >
                      Erneut versuchen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <>
            <StatusFilterTabs
              activeFilter={filter}
              onFilterChange={setFilter}
              counts={statusCounts}
            />

            <div className="mt-6">
              {isBookingsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg">Lade Buchungen...</div>
                </div>
              ) : (
                <BookingsList
                  bookings={filteredBookings}
                  onBookingClick={handleBookingClick}
                />
              )}
            </div>

            {/* Booking Detail Modal */}
            {selectedBooking && (
              <BookingDetailModal
                booking={selectedBooking}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
              />
            )}
          </>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-6">
            {hasPackages ? (
              contracts.map(contract => (
                contract.packages && contract.packages.length > 0 && (
                  <div key={contract._id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h3 className="text-lg font-medium text-gray-900">
                        Vertrag: {contract._id.slice(-8)}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        {contract.zusatzleistungen?.lagerservice && (
                          <span className="flex items-center">
                            <Package className="w-4 h-4 mr-1" />
                            Lagerservice
                          </span>
                        )}
                        {contract.zusatzleistungen?.versandservice && (
                          <span className="flex items-center">
                            <Truck className="w-4 h-4 mr-1" />
                            Versandservice
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {contract.packages.map(pkg => {
                        const statusConfig = getStatusConfig(pkg.status);
                        const IconComponent = statusConfig.icon;
                        
                        return (
                          <div key={pkg._id} className="px-6 py-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-full ${statusConfig.color} bg-opacity-20`}>
                                  <IconComponent className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {pkg.package_typ === 'lagerservice' ? 'Lagerservice-Paket' : 'Versandservice-Paket'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ID: {pkg._id.slice(-8)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                                  {statusConfig.text}
                                </span>
                                <p className="mt-1 text-xs text-gray-500">
                                  Aktualisiert: {formatDate(pkg.updated_at)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Timeline */}
                            <div className="mt-4 ml-14 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              {pkg.created_at && (
                                <div className="flex items-center text-gray-600">
                                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                  <span>Erstellt: {formatDate(pkg.created_at)}</span>
                                </div>
                              )}
                              {pkg.ankunft_datum && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2 text-blue-400" />
                                  <span>Angekommen: {formatDate(pkg.ankunft_datum)}</span>
                                </div>
                              )}
                              {pkg.einlagerung_datum && (
                                <div className="flex items-center text-gray-600">
                                  <Package className="w-4 h-4 mr-2 text-green-400" />
                                  <span>Eingelagert: {formatDate(pkg.einlagerung_datum)}</span>
                                </div>
                              )}
                              {pkg.versand_datum && (
                                <div className="flex items-center text-gray-600">
                                  <Truck className="w-4 h-4 mr-2 text-purple-400" />
                                  <span>Versandt: {formatDate(pkg.versand_datum)}</span>
                                </div>
                              )}
                              {pkg.zustellung_datum && (
                                <div className="flex items-center text-gray-600">
                                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                                  <span>Zugestellt: {formatDate(pkg.zustellung_datum)}</span>
                                </div>
                              )}
                            </div>
                            
                            {pkg.notizen && (
                              <div className="mt-3 ml-14 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Notizen:</span> {pkg.notizen}
                                </p>
                              </div>
                            )}
                            
                            {pkg.tracking_nummer && (
                              <div className="mt-2 ml-14">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Tracking-Nr:</span> {pkg.tracking_nummer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Noch keine Pakete vorhanden
                </h3>
                <p className="text-gray-600">
                  Sobald Sie Pakete an unser Lager senden, können Sie hier den Status verfolgen.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default MeineBuchungenPage;