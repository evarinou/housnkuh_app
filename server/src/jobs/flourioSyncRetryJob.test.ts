/**
 * @file flourioSyncRetryJob.test.ts
 * @purpose Sichert den stündlichen flour.io-Sync-Retry-Job (AUDIT OP6 + T4.2):
 *          Überlappungs-Lock, Ablauf aller drei Schritte, Fehler-Isolation
 *          zwischen den Schritten und Token-Gate.
 */

const mockBpRetryFailedSyncs = jest.fn();
const mockWhRetryFailedSyncs = jest.fn();
const mockWhSyncAllMietfaecher = jest.fn();

const mockFlourioConfig: { bearerToken: string } = { bearerToken: 'test-token' };

jest.mock('../services/flourio/client/FlourioClient', () => ({
  FlourioClient: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../services/flourio/client/config', () => ({
  get flourioConfig() { return mockFlourioConfig; }
}));
jest.mock('../services/flourio/services/BusinessPartnerService', () => ({
  BusinessPartnerService: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../services/flourio/services/WarehouseService', () => ({
  WarehouseService: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../services/flourio/services/businessPartnerSyncService', () => ({
  BusinessPartnerSyncService: jest.fn().mockImplementation(() => ({
    retryFailedSyncs: mockBpRetryFailedSyncs
  }))
}));
jest.mock('../services/flourio/services/warehouseSyncService', () => ({
  WarehouseSyncService: jest.fn().mockImplementation(() => ({
    retryFailedSyncs: mockWhRetryFailedSyncs,
    syncAllMietfaecher: mockWhSyncAllMietfaecher
  }))
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { FlourioSyncRetryJob } from './flourioSyncRetryJob';

const okResult = { synced: 0, failed: 0, skipped: 0, errors: [] };

describe('FlourioSyncRetryJob (AUDIT OP6 + T4.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFlourioConfig.bearerToken = 'test-token';
    mockBpRetryFailedSyncs.mockResolvedValue(okResult);
    mockWhRetryFailedSyncs.mockResolvedValue(okResult);
    mockWhSyncAllMietfaecher.mockResolvedValue(okResult);
  });

  it('führt alle drei Schritte aus: BP-Retry, Warehouse-Retry, Warehouse-Sync neuer Mietfächer', async () => {
    await FlourioSyncRetryJob.run();

    expect(mockBpRetryFailedSyncs).toHaveBeenCalledTimes(1);
    expect(mockWhRetryFailedSyncs).toHaveBeenCalledTimes(1);
    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledTimes(1);
    // Schritt (c) darf den Retry-Deckel nicht umgehen: error-Einträge auslassen
    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledWith({ excludeErrors: true });
  });

  it('überspringt einen zweiten Lauf, solange der erste läuft (Überlappungs-Lock)', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    mockBpRetryFailedSyncs.mockImplementation(async () => { await gate; return okResult; });

    const first = FlourioSyncRetryJob.run();
    await FlourioSyncRetryJob.run(); // Lock aktiv → sofortiger Rücksprung

    expect(mockBpRetryFailedSyncs).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(mockBpRetryFailedSyncs).toHaveBeenCalledTimes(1);
    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledTimes(1);
  });

  it('gibt den Lock nach einem Lauf wieder frei', async () => {
    await FlourioSyncRetryJob.run();
    await FlourioSyncRetryJob.run();

    expect(mockBpRetryFailedSyncs).toHaveBeenCalledTimes(2);
    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledTimes(2);
  });

  it('Fehler in Schritt (a) stoppt (b) und (c) nicht', async () => {
    mockBpRetryFailedSyncs.mockRejectedValue(new Error('BP boom'));

    await expect(FlourioSyncRetryJob.run()).resolves.toBeUndefined();

    expect(mockWhRetryFailedSyncs).toHaveBeenCalledTimes(1);
    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledTimes(1);
  });

  it('Fehler in Schritt (b) stoppt (c) nicht', async () => {
    mockWhRetryFailedSyncs.mockRejectedValue(new Error('WH boom'));

    await FlourioSyncRetryJob.run();

    expect(mockWhSyncAllMietfaecher).toHaveBeenCalledTimes(1);
  });

  it('tut nichts ohne konfiguriertes flour.io-Token und gibt den Lock frei', async () => {
    mockFlourioConfig.bearerToken = '';

    await FlourioSyncRetryJob.run();

    expect(mockBpRetryFailedSyncs).not.toHaveBeenCalled();
    expect(mockWhRetryFailedSyncs).not.toHaveBeenCalled();
    expect(mockWhSyncAllMietfaecher).not.toHaveBeenCalled();

    // Lock wurde freigegeben: nächster Lauf (mit Token) läuft normal
    mockFlourioConfig.bearerToken = 'test-token';
    await FlourioSyncRetryJob.run();
    expect(mockBpRetryFailedSyncs).toHaveBeenCalledTimes(1);
  });
});
