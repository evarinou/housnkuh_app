/**
 * @file socketService.test.ts
 * @purpose Integrationstests für die WebSocket-Infrastruktur: JWT-Handshake-Auth,
 * Raum-Isolation je Vendor und die bookingEvents-Brücke (T4.3)
 * @created 2026-07-07
 */

import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import socketService from './socketService';
import bookingEvents from '../utils/bookingEvents';
import config from '../config/config';
import { BookingStatus } from '../types/modelTypes';

describe('socketService', () => {
  let httpServer: HttpServer;
  let url: string;
  const openClients: ClientSocket[] = [];

  const vendorToken = (id: string): string =>
    jwt.sign({ id, isVendor: true }, config.jwtSecret);

  const connect = (auth?: object): ClientSocket => {
    const client = ioClient(url, {
      auth,
      reconnection: false,
      transports: ['websocket']
    });
    openClients.push(client);
    return client;
  };

  const waitForConnect = (client: ClientSocket): Promise<void> =>
    new Promise((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(err));
    });

  beforeAll((done) => {
    httpServer = createServer();
    httpServer.listen(0, () => {
      const { port } = httpServer.address() as AddressInfo;
      url = `http://localhost:${port}`;
      socketService.initialize(httpServer);
      done();
    });
  });

  afterEach(() => {
    openClients.forEach((client) => client.disconnect());
    openClients.length = 0;
  });

  afterAll(async () => {
    await socketService.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('rejects connections without token', async () => {
    const client = connect();
    await expect(waitForConnect(client)).rejects.toThrow('Kein Token');
  });

  it('rejects connections with invalid token', async () => {
    const client = connect({ token: 'kaputt' });
    await expect(waitForConnect(client)).rejects.toThrow('Token ist ungültig');
  });

  it('rejects tokens without vendor/admin role', async () => {
    const token = jwt.sign({ id: 'user1' }, config.jwtSecret);
    const client = connect({ token });
    await expect(waitForConnect(client)).rejects.toThrow('Keine Berechtigung');
  });

  it('accepts a valid vendor token', async () => {
    const client = connect({ token: vendorToken('vendor1') });
    await waitForConnect(client);
    expect(client.connected).toBe(true);
    expect(socketService.getConnectionCount()).toBe(1);
  });

  it('pushes booking updates and dashboard refresh only to the affected vendor', async () => {
    const clientA = connect({ token: vendorToken('vendorA') });
    const clientB = connect({ token: vendorToken('vendorB') });
    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

    const receivedA: any[] = [];
    let refreshedA = false;
    let receivedB = false;
    clientA.on('booking:updated', (payload) => receivedA.push(payload));
    clientA.on('dashboard:refresh', () => { refreshedA = true; });
    clientB.on('booking:updated', () => { receivedB = true; });
    clientB.on('dashboard:refresh', () => { receivedB = true; });

    bookingEvents.emitStatusChange({
      userId: 'vendorA',
      bookingId: 'booking42',
      status: BookingStatus.CONFIRMED,
      timestamp: new Date()
    });

    // Kurz warten, bis die Events über den Draht sind
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(receivedA).toHaveLength(1);
    expect(receivedA[0]).toMatchObject({ bookingId: 'booking42', status: 'confirmed' });
    expect(refreshedA).toBe(true);
    expect(receivedB).toBe(false);
  });

  it('emitDashboardRefresh reaches the vendor room directly', async () => {
    const client = connect({ token: vendorToken('vendorC') });
    await waitForConnect(client);

    const refreshed = new Promise<void>((resolve) => {
      client.on('dashboard:refresh', () => resolve());
    });

    socketService.emitDashboardRefresh('vendorC');
    await refreshed;
  });
});
