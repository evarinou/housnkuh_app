/**
 * @file BookingCard.tsx
 * @purpose Display card component for vendor bookings with comprehensive booking information and Zusatzleistungen
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useCallback } from 'react';
import { IBooking, IPackageData } from '../../types/booking';
import BookingStatusBadge from './BookingStatusBadge';

/**
 * Props interface for the BookingCard component
 * @interface BookingCardProps
 * @property {IBooking} booking - Booking data to display
 * @property {function} onClick - Callback function when card is clicked
 */
interface BookingCardProps {
  booking: IBooking;
  onClick: (booking: IBooking) => void;
}

/**
 * Formats date for German locale display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string in DD.MM.YYYY format
 */
const formatDate = (date: Date): string => {
  if (!date) return 'Unbekannt';
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats price with breakdown for Zusatzleistungen display
 * @param {IPackageData} packageData - Package data containing pricing information
 * @returns {object} Price formatting result with breakdown and Zusatzleistungen flags
 * @property {string} formatted - Formatted price in EUR currency
 * @property {string} breakdown - Additional services breakdown text
 * @property {boolean} hasZusatzleistungen - Whether additional services are included
 * 
 * @complexity O(1) - Simple data transformation
 */
const formatPriceWithBreakdown = (packageData?: IPackageData): { 
  formatted: string; 
  breakdown?: string; 
  hasZusatzleistungen: boolean 
} => {
  const price = packageData?.totalPrice || packageData?.totalCost?.monthly;
  if (!price) return { formatted: 'Preis nicht verfügbar', hasZusatzleistungen: false };
  
  const formatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
  
  const breakdown = packageData?.priceBreakdown;
  const zusatzleistungen = packageData?.zusatzleistungen;
  const hasZusatzleistungen = zusatzleistungen?.lagerservice || zusatzleistungen?.versandservice || false;
  
  if (!breakdown) {
    return { formatted, hasZusatzleistungen };
  }
  
  const parts = [];
  if (hasZusatzleistungen) {
    if (zusatzleistungen?.lagerservice) parts.push('Lagerservice');
    if (zusatzleistungen?.versandservice) parts.push('Versandservice');
  }
  if (breakdown.discount > 0) {
    parts.push(`${(breakdown.discount * 100).toFixed(0)}% Rabatt`);
  }
  
  const breakdownText = parts.length > 0 ? `inkl. ${parts.join(', ')}` : '';
  
  return { formatted, breakdown: breakdownText, hasZusatzleistungen };
};

/**
 * BookingCard component displaying detailed vendor booking information
 * 
 * @component
 * @param {BookingCardProps} props - Component props containing booking data and onClick handler
 * @returns {JSX.Element} Interactive booking card with comprehensive booking details
 * 
 * @example
 * <BookingCard 
 *   booking={bookingData} 
 *   onClick={(booking) => openDetailModal(booking)} 
 * />
 * 
 * @features
 * - Booking status badge with color coding
 * - Trial booking identification and payment schedule
 * - Zusatzleistungen (Lagerservice, Versandservice) breakdown
 * - Price breakdown with discounts and additional services
 * - Mietfach assignment display
 * - Keyboard navigation support
 * - Click handling with event propagation control
 * 
 * @accessibility
 * - ARIA labels for screen readers
 * - Keyboard navigation (Enter/Space)
 * - Focus management
 * - Role and tabIndex attributes
 * 
 * @performance
 * - React.memo for re-render optimization
 * - useCallback for memoized click handler
 * 
 * @complexity O(n) where n = number of Mietfächer in booking
 */
const BookingCard: React.FC<BookingCardProps> = React.memo(({ booking, onClick }) => {
  const packageData = booking.packageDetails || booking.packageData;
  const mietfachArray = Array.isArray(booking.mietfach) ? booking.mietfach : booking.mietfach ? [booking.mietfach] : [];
  const priceInfo = formatPriceWithBreakdown(packageData);
  
  /**
   * Memoized click handler to prevent unnecessary re-renders
   * @callback handleClick
   */
  const handleClick = useCallback(() => {
    onClick(booking);
  }, [booking, onClick]);
  
  return (
    <div 
      className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(booking);
        }
      }}
      aria-label={`Buchungsdetails für ${packageData?.name || 'Paket'} anzeigen`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {packageData?.name || 'Mietfach-Paket'}
              </h3>
              {booking.istProbemonatBuchung && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Probemonat
                  </span>
                </div>
              )}
            </div>
            <div className="ml-2 flex-shrink-0">
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
          
          <dl className="text-sm text-gray-600 space-y-1">
            <div className="flex flex-wrap gap-x-4">
              <dt className="font-medium">Angefragt:</dt>
              <dd>{formatDate(booking.requestedAt)}</dd>
            </div>
            
            {booking.confirmedAt && (
              <div className="flex flex-wrap gap-x-4">
                <dt className="font-medium">Bestätigt:</dt>
                <dd>{formatDate(booking.confirmedAt)}</dd>
              </div>
            )}
            
            {mietfachArray.length > 0 && (
              <div className="flex flex-wrap gap-x-4">
                <dt className="font-medium">Mietfach:</dt>
                <dd className="font-medium text-blue-600">
                  {mietfachArray.map(m => m.bezeichnung).join(', ')}
                </dd>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4">
              <dt className="font-medium">Preis:</dt>
              <dd className="font-semibold text-green-600">
                {priceInfo.formatted}
                {packageData?.duration && ` (${packageData.duration} Monate)`}
                {booking.istProbemonatBuchung && booking.zahlungspflichtigAb && (
                  <div className="text-sm text-amber-600 font-normal mt-1">
                    Zahlung ab: {formatDate(booking.zahlungspflichtigAb)}
                  </div>
                )}
                {priceInfo.breakdown && (
                  <div className="text-sm text-gray-600 font-normal mt-1">
                    {priceInfo.breakdown}
                  </div>
                )}
              </dd>
            </div>
            
            {priceInfo.hasZusatzleistungen && packageData?.priceBreakdown && (
              <div className="flex flex-wrap gap-x-4 text-sm">
                <dt className="font-medium text-gray-500">Aufschlüsselung:</dt>
                <dd className="text-gray-600">
                  Mietfach: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(packageData.priceBreakdown.mietfachBase)}
                  {packageData.priceBreakdown.zusatzleistungen.lagerservice > 0 && (
                    <span> + Lagerservice: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(packageData.priceBreakdown.zusatzleistungen.lagerservice)}</span>
                  )}
                  {packageData.priceBreakdown.zusatzleistungen.versandservice > 0 && (
                    <span> + Versandservice: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(packageData.priceBreakdown.zusatzleistungen.versandservice)}</span>
                  )}
                  {packageData.priceBreakdown.discount > 0 && (
                    <span> - Rabatt: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(packageData.priceBreakdown.discountAmount)}</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
        
        <div className="flex sm:flex-col gap-2">
          <button 
            className="w-full sm:w-auto px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onClick(booking);
            }}
          >
            Details anzeigen
          </button>
        </div>
      </div>
    </div>
  );
});

export default BookingCard;