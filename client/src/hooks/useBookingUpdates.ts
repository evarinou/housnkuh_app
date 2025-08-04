import { useState, useEffect, useCallback } from 'react';
import { IBooking } from '../types/booking';

interface UseBookingUpdatesOptions {
  userId: string;
  onStatusUpdate?: (booking: IBooking) => void;
}

interface BookingUpdateEvent {
  type: 'STATUS_CHANGED' | 'BOOKING_CREATED' | 'BOOKING_DELETED';
  bookingId: string;
  newStatus?: string;
  confirmedAt?: Date;
  booking?: IBooking;
}

export const useBookingUpdates = ({ userId, onStatusUpdate }: UseBookingUpdatesOptions) => {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`http://localhost:4000/api/vendor-auth/bookings/${userId}`, {
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
  }, [userId]);

  // Handle real-time updates via WebSocket (simplified version)
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchBookings();

    // TODO: Implement WebSocket connection
    // For now, we'll use polling as a fallback
    const pollInterval = setInterval(() => {
      fetchBookings();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [userId, fetchBookings]);

  // Simulate real-time updates (for demonstration purposes)
  const simulateUpdate = useCallback((update: BookingUpdateEvent) => {
    setBookings(prev => {
      const updated = prev.map(booking => {
        if (booking.id === update.bookingId) {
          const updatedBooking = {
            ...booking,
            status: update.newStatus as any || booking.status,
            confirmedAt: update.confirmedAt || booking.confirmedAt
          };
          
          // Call the callback with the updated booking
          if (onStatusUpdate) {
            onStatusUpdate(updatedBooking);
          }
          
          return updatedBooking;
        }
        return booking;
      });
      
      return updated;
    });
  }, [onStatusUpdate]);

  // Refresh function to manually refetch data
  const refresh = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    refresh,
    simulateUpdate // For testing purposes
  };
};

export default useBookingUpdates;