/**
 * @file socketService.ts
 * @purpose WebSocket-Infrastruktur (socket.io) für Echtzeit-Updates im Vendor-Dashboard.
 * Authentifiziert Verbindungen per Vendor-JWT (gleicher Secret/Payload wie vendorAuth),
 * gruppiert Clients in Räume je Vendor und übersetzt bookingEvents-Statusänderungen
 * in gezielte Push-Signale. Der Client refetcht daraufhin über die bestehende REST-API
 * (Signal-statt-Daten: keine Duplizierung der Message-Berechnungslogik).
 * @created 2026-07-07
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import bookingEvents from '../utils/bookingEvents';
import logger from '../utils/logger';

/** Decoded JWT payload shape (identisch zur REST-Auth-Middleware) */
interface JwtPayload {
  id: string;
  isAdmin?: boolean;
  isVendor?: boolean;
  email?: string;
}

/** Raum-Name für einen Vendor */
const vendorRoom = (userId: string): string => `vendor:${userId}`;

class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * Handshake-Authentifizierung: verifiziert das Vendor-JWT aus socket.handshake.auth.token.
   * Admin-Tokens werden ebenfalls akzeptiert (für spätere Admin-Dashboards), alles andere abgelehnt.
   */
  private authenticate(socket: Socket, next: (err?: Error) => void): void {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      next(new Error('Kein Token, Autorisierung verweigert'));
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      if (!decoded.isVendor && !decoded.isAdmin) {
        next(new Error('Keine Berechtigung'));
        return;
      }
      socket.data.userId = decoded.id;
      socket.data.isVendor = !!decoded.isVendor;
      socket.data.isAdmin = !!decoded.isAdmin;
      next();
    } catch (_err) {
      next(new Error('Token ist ungültig'));
    }
  }

  /**
   * Initialisiert den socket.io-Server auf dem bestehenden HTTP-Server und
   * verdrahtet die bookingEvents-Brücke. Idempotent (Zweitaufruf ist ein No-op).
   */
  initialize(httpServer: HttpServer): void {
    if (this.io) {
      logger.warn('SocketService bereits initialisiert');
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
          : true,
        credentials: true
      }
    });

    this.io.use((socket, next) => this.authenticate(socket, next));

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId as string;
      socket.join(vendorRoom(userId));
      logger.info('WebSocket verbunden', { userId, socketId: socket.id });

      socket.on('disconnect', (reason) => {
        logger.debug('WebSocket getrennt', { userId, socketId: socket.id, reason });
      });
    });

    // Brücke: Buchungs-Statusänderungen (confirm/reject) an den betroffenen Vendor pushen
    bookingEvents.onStatusChanged(async (booking) => {
      this.emitBookingUpdate(booking.userId, {
        bookingId: booking.bookingId,
        status: booking.status,
        timestamp: booking.timestamp
      });
    });

    logger.info('SocketService initialisiert (Pfad /socket.io)');
  }

  /** Signalisiert einem Vendor eine Buchungsänderung + generischen Dashboard-Refresh */
  emitBookingUpdate(userId: string, payload: { bookingId: string; status: string; timestamp: Date }): void {
    if (!this.io) return;
    this.io.to(vendorRoom(userId)).emit('booking:updated', payload);
    this.io.to(vendorRoom(userId)).emit('dashboard:refresh');
  }

  /** Generisches Refresh-Signal an einen Vendor (z. B. neue Dashboard-Message) */
  emitDashboardRefresh(userId: string): void {
    if (!this.io) return;
    this.io.to(vendorRoom(userId)).emit('dashboard:refresh');
  }

  /** Anzahl aktuell verbundener Sockets (für Health/Monitoring) */
  getConnectionCount(): number {
    return this.io ? this.io.sockets.sockets.size : 0;
  }

  /** Schließt alle Verbindungen und den Server (Graceful Shutdown) */
  async close(): Promise<void> {
    if (!this.io) return;
    const io = this.io;
    this.io = null;
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    logger.info('SocketService gestoppt');
  }
}

/** Anwendungsweite Singleton-Instanz */
const socketService = new SocketService();
export default socketService;
