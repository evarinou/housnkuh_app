import React, { useState, useEffect, useCallback } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import VendorLayout from '../../components/vendor/VendorLayout';
import { IBooking, BookingStatus } from '../../types/booking';
import BookingsList from '../../components/vendor/BookingsList';
import StatusFilterTabs from '../../components/vendor/StatusFilterTabs';
import BookingDetailModal from '../../components/vendor/BookingDetailModal';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import axios from 'axios';

interface StatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
}

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

const MeineBuchungenPage: React.FC = () => {
  const { user } = useVendorAuth();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<IBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'packages'>('bookings');

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`http://localhost:4000/api/vendor-auth/bookings/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Buchungen');
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch contracts with packages
  const fetchContractsWithPackages = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.get(`${apiUrl}/vendor-contracts/zusatzleistungen`, {
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
    fetchBookings();
    fetchContractsWithPackages();
  }, [user?.id, fetchBookings, fetchContractsWithPackages]);

  // Calculate status counts
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

  // Filter bookings based on selected filter
  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filter);

  const statusCounts = getStatusCounts(bookings);

  const handleBookingClick = (booking: IBooking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  // Helper functions for package tracking
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
          <p className="text-gray-600">
            {activeTab === 'bookings' 
              ? 'Überblick über alle Ihre Buchungen und deren aktuellen Status'
              : 'Verfolgen Sie den Status Ihrer Lager- und Versandpakete'
            }
          </p>
        </div>

        {/* Tab Navigation - nur wenn Zusatzleistungen vorhanden */}
        {hasZusatzleistungen && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bookings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Buchungen
              </button>
              <button
                onClick={() => setActiveTab('packages')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'packages'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                Package-Tracking
                {hasPackages && (
                  <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                    {contracts.reduce((sum, c) => sum + (c.packages?.length || 0), 0)}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {activeTab === 'bookings' ? (
          <>
            {/* Status Filter Tabs */}
            <StatusFilterTabs 
              activeFilter={filter}
              onFilterChange={setFilter}
              counts={statusCounts}
            />

            {/* Bookings List */}
            <BookingsList 
              bookings={filteredBookings}
              onBookingClick={handleBookingClick}
              loading={loading}
            />

            {/* Booking Detail Modal */}
            {selectedBooking && (
              <BookingDetailModal
                booking={selectedBooking}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
              />
            )}
          </>
        ) : (
          /* Package Tracking Section */
          <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-20 bg-gray-100 rounded"></div>
                  <div className="h-20 bg-gray-100 rounded"></div>
                </div>
              </div>
            ) : hasPackages ? (
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