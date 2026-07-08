/**
 * @file stockPullJob.test.ts
 * @purpose Sichert das Ausfall-/Recovery-Verhalten des StockPullJob (AUDIT OP14):
 *          flour.io-Fehler (Netzwerkausfall) dürfen den Job nicht nach außen
 *          crashen, werden geloggt und geben den Lock für Folge-Läufe frei;
 *          Teilfehler (errors-Array im Ergebnis) führen zu einem warn-Log.
 */

const mockStockPullAll = jest.fn();

jest.mock('../services/flourio/client/FlourioClient', () => ({
  FlourioClient: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../services/flourio/client/config', () => ({ flourioConfig: {} }));
jest.mock('../services/flourio/services/StockItemEntryPullService', () => ({
  StockItemEntryPullService: jest.fn().mockImplementation(() => ({ pullAll: mockStockPullAll }))
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { StockPullJob } from './stockPullJob';
import logger from '../utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

const okStockResult = { updated: 0, unchanged: 0, unmatched: 0, errors: [], duration: 1 };

describe('StockPullJob – flour.io-Ausfallszenarien (AUDIT OP14)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schluckt einen Netzwerkfehler von pullAll (kein Throw) und loggt error', async () => {
    mockStockPullAll.mockRejectedValueOnce(new Error('ECONNREFUSED flour.io'));

    // run() darf den Fehler nicht nach außen werfen
    await expect(StockPullJob.run()).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[StockPullJob] Stock pull failed',
      { error: 'ECONNREFUSED flour.io' }
    );
  });

  it('gibt den Lock nach einem flour.io-Ausfall frei — ein Folge-Lauf läuft wieder', async () => {
    mockStockPullAll
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(okStockResult);

    await StockPullJob.run(); // Ausfall
    await StockPullJob.run(); // Recovery-Lauf muss pullAll erneut aufrufen

    expect(mockStockPullAll).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[StockPullJob] Stock pull completed',
      expect.objectContaining({ errors: 0 })
    );
  });

  it('loggt warn bei Teilfehlern (errors-Array im Ergebnis), ohne zu werfen', async () => {
    const partialErrors = [{ articleId: 'art-1', error: 'article not found' }];
    mockStockPullAll.mockResolvedValueOnce({ ...okStockResult, errors: partialErrors });

    await expect(StockPullJob.run()).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[StockPullJob] Errors during stock pull',
      { errors: partialErrors }
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('loggt bei Erfolg ohne Teilfehler kein warn', async () => {
    mockStockPullAll.mockResolvedValueOnce(okStockResult);

    await StockPullJob.run();

    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
