/**
 * @file BookingsList.tsx
 * @purpose List container component for displaying vendor bookings with loading and empty states
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { createNavigationHelper } from '../../utils/navigation';
import { IBooking } from '../../types/booking';
import BookingCard from './BookingCard';

/**
 * Props interface for the BookingsList component
 * @interface BookingsListProps
 * @property {IBooking[]} bookings - Array of booking data to display
 * @property {function} onBookingClick - Callback function when a booking is clicked
 * @property {boolean} loading - Optional loading state indicator
 */
interface BookingsListProps {
  bookings: IBooking[];
  onBookingClick: (booking: IBooking) => void;
  loading?: boolean;
}

/**
 * BookingsList component displaying a list of vendor bookings
 * 
 * @component
 * @param {BookingsListProps} props - Component props containing bookings data and callbacks
 * @returns {JSX.Element} List of booking cards with appropriate loading and empty states
 * 
 * @example
 * <BookingsList 
 *   bookings={vendorBookings} 
 *   onBookingClick={(booking) => openDetailModal(booking)}
 *   loading={isLoadingBookings}
 * />
 * 
 * @features
 * - Loading state with animated skeleton cards
 * - Empty state with call-to-action navigation
 * - Responsive booking card layout
 * - Click handling delegation to BookingCard components
 * - Integration with navigation helper for booking flow
 * 
 * @states
 * - Loading: Shows 3 animated skeleton placeholders
 * - Empty: Shows empty state with navigation to booking flow
 * - Populated: Renders BookingCard components for each booking
 * 
 * @complexity O(n) where n = number of bookings to render
 */
const BookingsList: React.FC<BookingsListProps> = ({ bookings, onBookingClick, loading = false }) => {
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
  
  /**
   * Loading state with animated skeleton placeholders
   * Shows 3 skeleton cards to indicate data is being fetched
   */
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /**
   * Empty state when no bookings are found
   * Provides call-to-action navigation to home page for new bookings
   */
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Keine Buchungen gefunden
        </h3>
        <p className="text-gray-500 mb-6">
          Du hast noch keine Buchungen getätigt oder es wurden keine Buchungen mit den ausgewählten Filtern gefunden.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => navigationHelper.goToHome()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Package className="w-4 h-4 mr-2" />
            Jetzt buchen
          </button>
          <p className="text-sm text-gray-400">
            Entdecke die Mietfach-Pakete
          </p>
        </div>
      </div>
    );
  }

  /**
   * Main content state - render list of BookingCard components
   * Each booking gets a unique key using either id or _id field
   */
  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id || booking._id}
          booking={booking}
          onClick={onBookingClick}
        />
      ))}
    </div>
  );
};

export default BookingsList;