import React from 'react';
import { X, Package, Home, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { IBooking, IPackageData } from '../../types/booking';
import BookingStatusBadge from './BookingStatusBadge';
import PriceBreakdownDisplay from '../common/PriceBreakdownDisplay';

interface BookingDetailModalProps {
  booking: IBooking;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (date: Date | string): string => {
  if (!date) return 'Nicht verfügbar';
  const dateObj = new Date(date);
  return dateObj.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


const formatPrice = (price?: number): string => {
  if (!price) return 'Preis nicht verfügbar';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

const BookingTimeline: React.FC<{ booking: IBooking }> = ({ booking }) => {
  const timelineItems = [
    {
      key: 'requested',
      label: 'Buchung eingereicht',
      date: booking.requestedAt,
      icon: Clock,
      completed: true,
      description: 'Ihre Buchungsanfrage wurde erfolgreich eingereicht.'
    },
    {
      key: 'confirmed',
      label: 'Buchung bestätigt',
      date: booking.confirmedAt,
      icon: CheckCircle,
      completed: !!booking.confirmedAt,
      description: 'Ihre Buchung wurde von unserem Team bestätigt.'
    },
    {
      key: 'active',
      label: 'Aktiv',
      date: booking.actualStartDate || booking.scheduledStartDate,
      icon: Home,
      completed: booking.status === 'active' || booking.status === 'completed',
      description: 'Ihr Mietfach ist aktiv und einsatzbereit.'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Buchungsverlauf</h3>
      <div className="space-y-4">
        {timelineItems.map((item, index) => {
          const Icon = item.icon;
          const isCompleted = item.completed;
          
          return (
            <div key={item.key} className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {item.label}
                  </h4>
                  {item.date && (
                    <span className="text-sm text-gray-500">
                      {formatDate(item.date)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MietfachDetails: React.FC<{ mietfach: IBooking['mietfach'] }> = ({ mietfach }) => {
  if (!mietfach) return null;
  
  const mietfachArray = Array.isArray(mietfach) ? mietfach : [mietfach];
  if (mietfachArray.length === 0) return null;

  const typeLabels: { [key: string]: string } = {
    'regal': 'Regal',
    'regal-b': 'Regal B',
    'kuehlregal': 'Kühlregal',
    'gefrierregal': 'Gefrierregal',
    'verkaufstisch': 'Verkaufstisch',
    'sonstiges': 'Sonstiges',
    'schaufenster': 'Schaufenster'
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center mb-3">
        <Home className="w-5 h-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">
          {mietfachArray.length > 1 ? 'Zugewiesene Mietfächer' : 'Zugewiesenes Mietfach'}
        </h3>
      </div>
      
      {mietfachArray.map((fach, index) => (
        <div key={fach._id || index} className={index > 0 ? 'mt-4 pt-4 border-t border-blue-200' : ''}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-medium text-blue-700">Bezeichnung:</dt>
              <dd className="text-blue-900 font-semibold">{fach.bezeichnung}</dd>
            </div>
            
            <div>
              <dt className="font-medium text-blue-700">Typ:</dt>
              <dd className="text-blue-900">{typeLabels[fach.typ] || fach.typ}</dd>
            </div>
            
            {fach.beschreibung && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-blue-700">Beschreibung:</dt>
                <dd className="text-blue-900">{fach.beschreibung}</dd>
              </div>
            )}
            
            {fach.groesse && (
              <div>
                <dt className="font-medium text-blue-700">Größe:</dt>
                <dd className="text-blue-900">
                  {fach.groesse.flaeche} {fach.groesse.einheit}
                </dd>
              </div>
            )}
            
            {fach.standort && (
              <div>
                <dt className="font-medium text-blue-700">Standort:</dt>
                <dd className="text-blue-900">{fach.standort}</dd>
              </div>
            )}
            
            {fach.features && fach.features.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-blue-700">Features:</dt>
                <dd className="text-blue-900">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {fach.features.map((feature, featureIndex) => (
                      <span key={featureIndex} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
};

const PackageDetails: React.FC<{ packageData?: IPackageData }> = ({ packageData }) => {
  if (!packageData) return null;
  
  const price = packageData.totalPrice || packageData.totalCost?.monthly;
  const priceBreakdown = packageData.priceBreakdown;
  const zusatzleistungen = packageData.zusatzleistungen;
  
  // Convert our price breakdown to the format expected by PriceBreakdownDisplay
  const convertedBreakdown = priceBreakdown ? {
    packageCosts: priceBreakdown.mietfachBase,
    addonCosts: 0,
    zusatzleistungenCosts: (priceBreakdown.zusatzleistungen?.lagerservice || 0) + (priceBreakdown.zusatzleistungen?.versandservice || 0),
    subtotal: priceBreakdown.subtotal,
    discount: (priceBreakdown.discount * 100), // Convert to percentage
    discountAmount: priceBreakdown.discountAmount,
    monthlyTotal: price || 0,
    totalForDuration: (price || 0) * (packageData.duration || 12),
    provision: {
      rate: 0,
      monthlyAmount: 0,
      totalAmount: 0
    }
  } : null;
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center mb-3">
        <Package className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Paket-Details</h3>
      </div>
      
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <dt className="font-medium text-gray-700">Paket:</dt>
          <dd className="text-gray-900 font-semibold">{packageData.name || 'Mietfach-Paket'}</dd>
        </div>
        
        {packageData.packageType && (
          <div>
            <dt className="font-medium text-gray-700">Typ:</dt>
            <dd className="text-gray-900">{packageData.packageType}</dd>
          </div>
        )}
        
        {packageData.duration && (
          <div>
            <dt className="font-medium text-gray-700">Laufzeit:</dt>
            <dd className="text-gray-900">{packageData.duration} Monate</dd>
          </div>
        )}
      </dl>
      
      {/* Services Section */}
      {packageData.services && Array.isArray(packageData.services) && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Services:</h4>
          <div className="space-y-2">
            {packageData.services.map((service: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                <div className="flex items-center">
                  <Home className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium">
                    {service.mietfach?.bezeichnung || 'Mietfach'}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {formatPrice(service.monatspreis)} monatlich
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Zusatzleistungen Section */}
      {zusatzleistungen && (zusatzleistungen.lagerservice || zusatzleistungen.versandservice) && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Zusatzleistungen:</h4>
          <div className="space-y-2">
            {zusatzleistungen.lagerservice && (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
                <div className="flex items-center">
                  <Package className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Lagerservice</span>
                </div>
                <span className="text-sm text-green-600">
                  {formatPrice(priceBreakdown?.zusatzleistungen?.lagerservice || 20)} monatlich
                </span>
              </div>
            )}
            {zusatzleistungen.versandservice && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded border border-blue-200">
                <div className="flex items-center">
                  <Truck className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Versandservice</span>
                </div>
                <span className="text-sm text-blue-600">
                  {formatPrice(priceBreakdown?.zusatzleistungen?.versandservice || 5)} monatlich
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Price Breakdown using central component */}
      {convertedBreakdown && (
        <PriceBreakdownDisplay 
          breakdown={convertedBreakdown}
          zusatzleistungen={zusatzleistungen}
          showDetails={true}
        />
      )}
      
      {/* Fallback total price if no breakdown available */}
      {!convertedBreakdown && price && (
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Gesamtpreis:</span>
            <span className="text-lg font-semibold text-green-600">
              {formatPrice(price)} / Monat
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const packageData = booking.packageDetails || booking.packageData;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">Buchungsdetails</h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Modal schließen"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
            {/* Timeline */}
            <BookingTimeline booking={booking} />
            
            {/* Mietfach Details (if assigned) */}
            {booking.mietfach && <MietfachDetails mietfach={booking.mietfach} />}
            
            {/* Package Details */}
            <PackageDetails packageData={packageData} />
            
            {/* Comments */}
            {booking.comments && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-yellow-900">Ihre Anmerkungen</h3>
                </div>
                <p className="text-yellow-800">{booking.comments}</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;