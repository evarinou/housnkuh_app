/**
 * @file useBookingUpdates.ts
 * @purpose Custom hook for real-time booking updates and status monitoring with polling fallback
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { useState, useEffect, useCallback } from 'react';
import { IBooking } from '../types/booking';

/**
 * Configuration options for useBookingUpdates hook
 * @interface UseBookingUpdatesOptions
 */
interface UseBookingUpdatesOptions {
  /** User ID to fetch bookings for */
  userId: string;
  /** Optional callback when booking status changes */
  onStatusUpdate?: (booking: IBooking) => void;
}

/**
 * Real-time booking update event structure
 * @interface BookingUpdateEvent
 */
interface BookingUpdateEvent {
  /** Type of booking event */
  type: 'STATUS_CHANGED' | 'BOOKING_CREATED' | 'BOOKING_DELETED';
  /** ID of affected booking */
  bookingId: string;
  /** New status for status change events */
  newStatus?: string;
  /** Confirmation timestamp */
  confirmedAt?: Date;
  /** Full booking object for creation events */
  booking?: IBooking;
}

/**
 * Custom hook for managing real-time booking updates and status monitoring
 * 
 * @description Provides real-time booking data with status updates using polling fallback.
 * Fetches user's bookings and monitors for changes with 30-second polling interval.
 * Includes manual refresh capability and simulation methods for testing.
 * 
 * @param {UseBookingUpdatesOptions} options - Hook configuration
 * @returns {object} Booking data, loading state, error state, and control functions
 * 
 * @hook
 * @dependencies useState, useEffect, useCallback
 */
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