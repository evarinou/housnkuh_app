import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { createNavigationHelper } from '../../utils/navigation';
import { IBooking } from '../../types/booking';
import BookingCard from './BookingCard';

interface BookingsListProps {
  bookings: IBooking[];
  onBookingClick: (booking: IBooking) => void;
  loading?: boolean;
}

const BookingsList: React.FC<BookingsListProps> = ({ bookings, onBookingClick, loading = false }) => {
  const navigate = useNavigate();
  const navigationHelper = createNavigationHelper(navigate);
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

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Keine Buchungen gefunden
        </h3>
        <p className="text-gray-500 mb-6">
          Sie haben noch keine Buchungen getätigt oder es wurden keine Buchungen mit den ausgewählten Filtern gefunden.
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
            Entdecken Sie unsere Mietfach-Pakete
          </p>
        </div>
      </div>
    );
  }

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