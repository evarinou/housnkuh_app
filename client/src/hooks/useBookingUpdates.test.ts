/**
 * @file useBookingUpdates.test.ts
 * @purpose Tests für den Booking-Updates-Hook: WebSocket-Event triggert Refetch und
 * onStatusUpdate-Callback, Polling nur als Fallback (T4.3)
 * @created 2026-07-07
 */

import { renderHook, act } from '@testing-library/react';
import { useBookingUpdates } from './useBookingUpdates';
import { getVendorSocket } from '../utils/vendorSocket';

let mockSocketListeners: Record<string, Array<(...args: any[]) => void>>;
let mockSocket: any;

jest.mock('../utils/vendorSocket', () => ({
  getVendorSocket: jest.fn(() => mockSocket)
}));

const flush = () => act(async () => { await Promise.resolve(); });

const emitSocketEvent = (event: string, ...args: any[]) => {
  act(() => {
    (mockSocketListeners[event] || []).forEach((handler) => handler(...args));
  });
};

describe('useBookingUpdates', () => {
  beforeEach(() => {
    mockSocketListeners = {};
    mockSocket = {
      connected: true,
      on: (event: string, handler: (...args: any[]) => void) => {
        (mockSocketListeners[event] = mockSocketListeners[event] || []).push(handler);
      },
      off: (event: string, handler: (...args: any[]) => void) => {
        mockSocketListeners[event] = (mockSocketListeners[event] || []).filter(h => h !== handler);
      }
    };
    (getVendorSocket as jest.Mock).mockImplementation(() => mockSocket);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bookings: [{ id: 'b1', status: 'confirmed' }]
      })
    }) as any;
    localStorage.setItem('vendorToken', 'test-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('refetcht bei booking:updated und ruft onStatusUpdate mit der betroffenen Buchung', async () => {
    const onStatusUpdate = jest.fn();
    const { result } = renderHook(() => useBookingUpdates({ userId: 'u1', onStatusUpdate }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.bookings).toHaveLength(1);

    emitSocketEvent('booking:updated', { bookingId: 'b1', status: 'confirmed', timestamp: '2026-07-07' });
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(onStatusUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }));
  });

  it('pollt nicht, solange der Socket verbunden ist', async () => {
    jest.useFakeTimers();
    renderHook(() => useBookingUpdates({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(120000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fällt bei Verbindungsverlust auf 30-s-Polling zurück', async () => {
    jest.useFakeTimers();
    renderHook(() => useBookingUpdates({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    emitSocketEvent('disconnect');
    act(() => { jest.advanceTimersByTime(30000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
