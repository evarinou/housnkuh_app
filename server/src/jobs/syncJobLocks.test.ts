/**
 * @file syncJobLocks.test.ts
 * @purpose Sichert die Überlappungs-Locks (AUDIT OP9) von StockPullJob und
 *          DocumentSyncJob: ein zweiter run() während eines laufenden run()
 *          wird übersprungen; nach Fehlern wird der Lock freigegeben.
 *          Ergänzend (AUDIT OP14): isBusy() als Baustein des Graceful Shutdown
 *          in index.ts — true während eines Laufs, false danach/nach Fehlern.
 */

const mockStockPullAll = jest.fn();
const mockDocPullAll = jest.fn();

jest.mock('../services/flourio/client/FlourioClient', () => ({
  FlourioClient: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../services/flourio/client/config', () => ({ flourioConfig: {} }));
jest.mock('../services/flourio/services/StockItemEntryPullService', () => ({
  StockItemEntryPullService: jest.fn().mockImplementation(() => ({ pullAll: mockStockPullAll }))
}));
jest.mock('../services/flourio/services/DocumentPullService', () => ({
  DocumentPullService: jest.fn().mockImplementation(() => ({ pullAll: mockDocPullAll }))
}));
jest.mock('../services/vendorSaleProjectionService', () => ({
  VendorSaleProjectionService: {
    project: jest.fn().mockResolvedValue({ documents: 0, created: 0, skippedNoVendor: 0 })
  }
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { StockPullJob } from './stockPullJob';
import { DocumentSyncJob } from './documentSyncJob';

const okStockResult = { updated: 0, unchanged: 0, unmatched: 0, errors: [], duration: 1 };
const okDocResult = { created: 0, updated: 0, errors: [], duration: 1 };

describe('Sync-Job Überlappungs-Locks (AUDIT OP9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('StockPullJob überspringt einen zweiten Lauf, solange der erste läuft', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    mockStockPullAll.mockImplementation(async () => { await gate; return okStockResult; });

    const first = StockPullJob.run();
    await StockPullJob.run(); // Lock aktiv → sofortiger Rücksprung

    expect(mockStockPullAll).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(mockStockPullAll).toHaveBeenCalledTimes(1);
  });

  it('StockPullJob gibt den Lock nach einem Fehler wieder frei', async () => {
    mockStockPullAll.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(okStockResult);

    await StockPullJob.run();
    await StockPullJob.run();

    expect(mockStockPullAll).toHaveBeenCalledTimes(2);
  });

  it('DocumentSyncJob überspringt einen zweiten Lauf, solange der erste läuft', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    mockDocPullAll.mockImplementation(async () => { await gate; return okDocResult; });

    const first = DocumentSyncJob.run();
    await DocumentSyncJob.run();

    expect(mockDocPullAll).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(mockDocPullAll).toHaveBeenCalledTimes(1);
  });

  it('DocumentSyncJob gibt den Lock nach einem Fehler wieder frei', async () => {
    mockDocPullAll.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(okDocResult);

    await DocumentSyncJob.run();
    await DocumentSyncJob.run();

    expect(mockDocPullAll).toHaveBeenCalledTimes(2);
  });
});

describe('isBusy() für Graceful Shutdown (AUDIT OP14)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('StockPullJob.isBusy() ist während eines laufenden run() true, danach false', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    mockStockPullAll.mockImplementation(async () => { await gate; return okStockResult; });

    expect(StockPullJob.isBusy()).toBe(false);
    const run = StockPullJob.run();
    expect(StockPullJob.isBusy()).toBe(true); // Shutdown würde jetzt warten

    release();
    await run;
    expect(StockPullJob.isBusy()).toBe(false); // Shutdown darf fortfahren
  });

  it('StockPullJob.isBusy() ist nach einem Fehler false', async () => {
    mockStockPullAll.mockRejectedValueOnce(new Error('boom'));

    await StockPullJob.run();

    expect(StockPullJob.isBusy()).toBe(false);
  });

  it('DocumentSyncJob.isBusy() ist während eines laufenden run() true, danach false', async () => {
    let release!: () => void;
    const gate = new Promise<void>(res => { release = res; });
    mockDocPullAll.mockImplementation(async () => { await gate; return okDocResult; });

    expect(DocumentSyncJob.isBusy()).toBe(false);
    const run = DocumentSyncJob.run();
    expect(DocumentSyncJob.isBusy()).toBe(true);

    release();
    await run;
    expect(DocumentSyncJob.isBusy()).toBe(false);
  });

  it('DocumentSyncJob.isBusy() ist nach einem Fehler false', async () => {
    mockDocPullAll.mockRejectedValueOnce(new Error('boom'));

    await DocumentSyncJob.run();

    expect(DocumentSyncJob.isBusy()).toBe(false);
  });
});
