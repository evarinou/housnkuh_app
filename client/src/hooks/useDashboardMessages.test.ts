/**
 * @file useDashboardMessages.test.ts
 * @purpose Tests für den Dashboard-Messages-Hook: WebSocket-Refresh, Polling nur als
 * Fallback bei Verbindungsverlust bzw. ohne Socket (T4.3)
 * @created 2026-07-07
 */

import { renderHook, act } from '@testing-library/react';
import { useDashboardMessages } from './useDashboardMessages';
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

describe('useDashboardMessages', () => {
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
      json: async () => ({ messages: [] })
    }) as any;
    localStorage.setItem('vendorToken', 'test-token');
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('lädt initial und refetcht bei dashboard:refresh-Event', async () => {
    renderHook(() => useDashboardMessages({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    emitSocketEvent('dashboard:refresh');
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('pollt nicht, solange der Socket verbunden ist', async () => {
    jest.useFakeTimers();
    renderHook(() => useDashboardMessages({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(180000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fällt bei Verbindungsverlust auf Polling zurück und stoppt es nach Reconnect', async () => {
    jest.useFakeTimers();
    renderHook(() => useDashboardMessages({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    emitSocketEvent('disconnect');
    act(() => { jest.advanceTimersByTime(60000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Reconnect: einmal sofort nachladen, dann kein Polling mehr
    emitSocketEvent('connect');
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(3);

    act(() => { jest.advanceTimersByTime(180000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('pollt klassisch weiter, wenn kein Socket verfügbar ist (kein Token)', async () => {
    (getVendorSocket as jest.Mock).mockReturnValue(null);
    jest.useFakeTimers();
    renderHook(() => useDashboardMessages({ userId: 'u1' }));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    act(() => { jest.advanceTimersByTime(60000); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
