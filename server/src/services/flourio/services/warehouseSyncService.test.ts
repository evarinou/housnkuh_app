/**
 * @file warehouseSyncService.test.ts
 * @purpose Unit tests for WarehouseSyncService bulk operations
 * @created 2026-03-31
 */

import { WarehouseSyncService } from './warehouseSyncService';
import { WarehouseService } from './WarehouseService';
import { WarehouseMapper } from './warehouseMapping';
import Mietfach from '../../../models/Mietfach';
import type { IMietfach } from '../../../types/modelTypes';
import { MietfachTyp } from '../../../types/modelTypes';

jest.mock('../../../models/Mietfach');
jest.mock('./WarehouseService');
jest.mock('./warehouseMapping');

const mockWarehouseService = {
  syncMietfach: jest.fn()
} as unknown as jest.Mocked<WarehouseService>;

const createMockMietfach = (overrides?: Partial<IMietfach>): IMietfach => ({
  _id: '507f1f77bcf86cd799439011' as any,
  bezeichnung: 'Regal-A1',
  typ: MietfachTyp.REGAL,
  verfuegbar: true,
  standort: 'Hauptlager',
  groesse: { flaeche: 2.5, einheit: 'm²' },
  features: [],
  creationSource: 'manual',
  flourioWarehouseId: undefined,
  flourioSyncStatus: undefined,
  flourioLastSyncAt: undefined,
  flourioSyncError: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(true),
  isAvailableForPeriod: jest.fn(),
  ...overrides
} as any);

describe('WarehouseSyncService', () => {
  let syncService: WarehouseSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = new WarehouseSyncService(mockWarehouseService);
  });

  describe('syncAllMietfaecher', () => {
    it('should sync all Mietfaecher needing sync', async () => {
      const mietfaecher = [createMockMietfach(), createMockMietfach({ bezeichnung: 'Regal-B2' })];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(true);
      mockWarehouseService.syncMietfach.mockResolvedValue({} as any);

      const result = await syncService.syncAllMietfaecher();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockWarehouseService.syncMietfach).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid Mietfaecher', async () => {
      const mietfaecher = [createMockMietfach({ bezeichnung: '' })];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue(['Bezeichnung is required']);

      const result = await syncService.syncAllMietfaecher();

      expect(result.skipped).toBe(1);
      expect(result.synced).toBe(0);
      expect(mockWarehouseService.syncMietfach).not.toHaveBeenCalled();
    });

    it('should skip unchanged synced Mietfaecher', async () => {
      const mietfaecher = [createMockMietfach({
        flourioWarehouseId: 'wh_123',
        flourioSyncStatus: 'synced'
      })];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(false);

      const result = await syncService.syncAllMietfaecher();

      expect(result.skipped).toBe(1);
      expect(mockWarehouseService.syncMietfach).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const mietfaecher = [createMockMietfach()];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(true);

      mockWarehouseService.syncMietfach
        .mockRejectedValue(new Error('API error'));

      const result = await syncService.syncAllMietfaecher();

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('API error');
    });

    it('should handle empty Mietfaecher list', async () => {
      (Mietfach.find as jest.Mock).mockResolvedValue([]);

      const result = await syncService.syncAllMietfaecher();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should force resync already synced Mietfaecher', async () => {
      const mietfaecher = [createMockMietfach({
        flourioWarehouseId: 'wh_123',
        flourioSyncStatus: 'synced'
      })];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(false);
      mockWarehouseService.syncMietfach.mockResolvedValue({} as any);

      const result = await syncService.syncAllMietfaecher({ forceResync: true });

      expect(result.synced).toBe(1);
      expect(mockWarehouseService.syncMietfach).toHaveBeenCalled();
    });

    it('should support dry run', async () => {
      const mietfaecher = [createMockMietfach()];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(true);

      const result = await syncService.syncAllMietfaecher({ dryRun: true });

      expect(result.synced).toBe(1);
      expect(mockWarehouseService.syncMietfach).not.toHaveBeenCalled();
    });
  });

  describe('getSyncStatus', () => {
    it('should return correct sync status', async () => {
      const mietfaecher = [
        createMockMietfach({ flourioSyncStatus: 'synced', flourioLastSyncAt: new Date() }),
        createMockMietfach({ flourioSyncStatus: 'error' }),
        createMockMietfach({ flourioSyncStatus: undefined })
      ];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.hasMietfachChanged as jest.Mock)
        .mockReturnValueOnce(false) // synced and unchanged
        .mockReturnValueOnce(true); // error — doesn't matter, uses switch

      const status = await syncService.getSyncStatus();

      expect(status.total).toBe(3);
      expect(status.synced).toBe(1);
      expect(status.error).toBe(1);
      expect(status.needsSync).toBe(1);
    });
  });

  describe('retryFailedSyncs', () => {
    it('should retry only error status Mietfaecher', async () => {
      const mietfaecher = [createMockMietfach({ flourioSyncStatus: 'error' })];
      (Mietfach.find as jest.Mock).mockResolvedValue(mietfaecher);
      (WarehouseMapper.validateMietfachForSync as jest.Mock).mockReturnValue([]);
      (WarehouseMapper.hasMietfachChanged as jest.Mock).mockReturnValue(true);
      mockWarehouseService.syncMietfach.mockResolvedValue({} as any);

      const result = await syncService.retryFailedSyncs();

      expect(result.synced).toBe(1);
      expect(Mietfach.find).toHaveBeenCalledWith({ flourioSyncStatus: 'error' });
    });
  });
});
