/**
 * @file db.test.ts
 * @purpose Sichert das MongoDB-Reconnect-Verhalten (AUDIT OP2/OP14): connectDB
 *          registriert die Verbindungs-Event-Handler (disconnected/reconnected/
 *          error), und die Handler loggen nur, statt den Prozess zu crashen.
 */

const mockConnectionOn = jest.fn();
const mockConnect = jest.fn();
const mockCreateIndex = jest.fn();

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connection: { on: mockConnectionOn },
    connect: mockConnect,
    model: jest.fn(() => ({ collection: { createIndex: mockCreateIndex } })),
    set: jest.fn()
  }
}));
jest.mock('./config', () => ({
  __esModule: true,
  default: { mongoURI: 'mongodb://localhost:27017/housnkuh-test' }
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import connectDB from './db';
import logger from '../utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

/** Liefert den bei connection.on('<event>', …) registrierten Handler. */
function registeredHandler(event: string): (...args: any[]) => void {
  const call = mockConnectionOn.mock.calls.find(([name]) => name === event);
  expect(call).toBeDefined();
  return call![1];
}

describe('connectDB – MongoDB-Reconnect-Verhalten (AUDIT OP2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockCreateIndex.mockResolvedValue(undefined);
  });

  it('registriert die Verbindungs-Event-Handler disconnected/reconnected/error', async () => {
    await connectDB();

    const events = mockConnectionOn.mock.calls.map(([name]) => name);
    expect(events).toEqual(expect.arrayContaining(['disconnected', 'reconnected', 'error']));
  });

  it('disconnected-Handler loggt eine Warnung statt zu crashen', async () => {
    await connectDB();

    const onDisconnected = registeredHandler('disconnected');
    expect(() => onDisconnected()).not.toThrow();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'MongoDB-Verbindung getrennt — Treiber versucht Reconnect'
    );
  });

  it('reconnected-Handler loggt info', async () => {
    await connectDB();

    const onReconnected = registeredHandler('reconnected');
    expect(() => onReconnected()).not.toThrow();
    expect(mockLogger.info).toHaveBeenCalledWith('MongoDB erneut verbunden');
  });

  it('error-Handler loggt die Fehlermeldung statt zu crashen', async () => {
    await connectDB();

    const onError = registeredHandler('error');
    expect(() => onError(new Error('socket hang up'))).not.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'MongoDB-Verbindungsfehler',
      { error: 'socket hang up' }
    );

    // Auch ein Fehler ohne message-Feld darf den Handler nicht crashen
    expect(() => onError(undefined)).not.toThrow();
  });
});
