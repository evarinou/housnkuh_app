/**
 * @file vendorSocket.ts
 * @purpose Gemeinsame socket.io-Verbindung für Echtzeit-Updates im Vendor-Bereich.
 * Authentifiziert sich mit dem Vendor-JWT aus localStorage; socket.io übernimmt
 * Auto-Reconnect (exponentielles Backoff) und Transport-Fallback (Long-Polling).
 * Hooks abonnieren Events ('dashboard:refresh', 'booking:updated') und refetchen
 * daraufhin über die bestehende REST-API.
 * @created 2026-07-07
 */

import { io, Socket } from 'socket.io-client';
import { apiUtils } from './auth';

let socket: Socket | null = null;

/** Socket-Origin = API-URL ohne /api-Suffix (Dev: :4000 direkt, Prod: gleiche Domain) */
const getSocketUrl = (): string => {
  return apiUtils.getApiUrl().replace(/\/api\/?$/, '');
};

/**
 * Liefert die gemeinsame Vendor-Socket-Verbindung (lazy erstellt).
 * Gibt null zurück, wenn kein Vendor-Token vorliegt (nicht eingeloggt).
 */
export const getVendorSocket = (): Socket | null => {
  const token = localStorage.getItem('vendorToken');
  if (!token) {
    return null;
  }

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token }
    });
  }

  return socket;
};

/**
 * Trennt die Verbindung und verwirft den Socket (z. B. bei Logout,
 * damit keine Verbindung mit veraltetem Token weiterlebt).
 */
export const disconnectVendorSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
