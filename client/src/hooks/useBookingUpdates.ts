/**
 * @file useBookingUpdates.ts
 * @purpose Custom hook for real-time booking updates via WebSocket with polling fallback
 * @created 2025-01-15
 * @modified 2026-07-07
 */

import { useState, useEffect, useCallback } from 'react';
import { IBooking } from '../types/booking';
import { apiUtils } from '../utils/auth';
import { getVendorSocket } from '../utils/vendorSocket';

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
 * Real-time booking update event structure (Server-Event 'booking:updated')
 * @interface BookingUpdateEvent
 */
interface BookingUpdateEvent {
  /** ID of affected booking */
  bookingId: string;
  /** New booking status */
  status: string;
  /** Event timestamp */
  timestamp: string;
}

/**
 * Custom hook for managing real-time booking updates and status monitoring
 * 
 * @description Provides real-time booking data via WebSocket ('booking:updated'-Events).
 * Fällt nur bei fehlender Verbindung auf 30-Sekunden-Polling zurück.
 * Includes manual refresh capability.
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

  // Fetch bookings from API; liefert die frische Liste für Event-Handler zurück
  const fetchBookings = useCallback(async (): Promise<IBooking[]> => {
    if (!userId) return [];

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('vendorToken');
      const response = await fetch(`${apiUtils.getApiUrl()}/vendor-auth/bookings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Buchungen');
      }

      const data = await response.json();
      const fresh: IBooking[] = data.bookings || [];
      setBookings(fresh);
      return fresh;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      console.error('Error fetching bookings:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Real-time updates via WebSocket; Polling nur als Fallback ohne Verbindung
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchBookings();

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(fetchBookings, 30000);
      }
    };
    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const socket = getVendorSocket();
    if (!socket) {
      // Kein Token → wie bisher pollen
      startPolling();
      return stopPolling;
    }

    const handleBookingUpdate = async (update: BookingUpdateEvent) => {
      const fresh = await fetchBookings();
      if (onStatusUpdate) {
        const affected = fresh.find(booking => booking.id === update.bookingId);
        if (affected) {
          onStatusUpdate(affected);
        }
      }
    };
    const handleConnect = () => {
      // Verpasste Änderungen aus der Offline-Zeit nachladen, dann Polling aus
      stopPolling();
      fetchBookings();
    };
    const handleDisconnect = () => startPolling();

    socket.on('booking:updated', handleBookingUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (!socket.connected) {
      startPolling();
    }

    return () => {
      socket.off('booking:updated', handleBookingUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      stopPolling();
    };
  }, [userId, fetchBookings, onStatusUpdate]);

  // Refresh function to manually refetch data
  const refresh = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    refresh
  };
};

export default useBookingUpdates;