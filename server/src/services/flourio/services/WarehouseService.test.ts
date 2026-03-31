/**
 * @file WarehouseService.test.ts
 * @purpose Unit tests for WarehouseService CRUD operations
 * @created 2026-03-31
 */

import { WarehouseService } from './WarehouseService';
import { WarehouseMapper } from './warehouseMapping';
import type { FlourioClient } from '../client/FlourioClient';
import type { Warehouse } from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';
import { MietfachTyp } from '../../../types/modelTypes';

const mockFlourioClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
} as unknown as jest.Mocked<FlourioClient>;

const createMockMietfach = (overrides?: Partial<IMietfach>): IMietfach => ({
  _id: '507f1f77bcf86cd799439011' as any,
  bezeichnung: 'Regal-A1',
  typ: MietfachTyp.REGAL,
  verfuegbar: true,
  standort: 'Hauptlager',
  groesse: {
    flaeche: 2.5,
    einheit: 'm²'
  },
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

const mockWarehouse: Warehouse = {
  id: 'wh_123',
  name: 'Regal-A1',
  address: { company1: 'Hauptlager', country: 'DE' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('WarehouseService', () => {
  let service: WarehouseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WarehouseService(mockFlourioClient);
  });

  describe('createFromMietfach', () => {
    it('should create Warehouse in FlourIO and update Mietfach', async () => {
      const mietfach = createMockMietfach();
      mockFlourioClient.post.mockResolvedValue(mockWarehouse);

      const result = await service.createFromMietfach(mietfach);

      expect(result).toEqual(mockWarehouse);
      expect(mockFlourioClient.post).toHaveBeenCalledWith('/stocks', {
        name: 'Regal-A1',
        address: { company1: 'Hauptlager', country: 'DE' }
      });
      expect(mietfach.flourioWarehouseId).toBe('wh_123');
      expect(mietfach.flourioSyncStatus).toBe('synced');
      expect(mietfach.save).toHaveBeenCalled();
    });

    it('should throw on validation failure', async () => {
      const mietfach = createMockMietfach({ bezeichnung: '' });

      await expect(service.createFromMietfach(mietfach))
        .rejects.toThrow('Validation failed');
      expect(mockFlourioClient.post).not.toHaveBeenCalled();
    });
  });

  describe('updateFromMietfach', () => {
    it('should update Warehouse in FlourIO', async () => {
      const mietfach = createMockMietfach({ flourioWarehouseId: 'wh_123' });
      mockFlourioClient.patch.mockResolvedValue(mockWarehouse);

      const result = await service.updateFromMietfach(mietfach);

      expect(result).toEqual(mockWarehouse);
      expect(mockFlourioClient.patch).toHaveBeenCalledWith('/stocks/wh_123', {
        name: 'Regal-A1',
        address: { company1: 'Hauptlager', country: 'DE' }
      });
      expect(mietfach.flourioSyncStatus).toBe('synced');
    });

    it('should throw if Mietfach not synced', async () => {
      const mietfach = createMockMietfach({ flourioWarehouseId: undefined });

      await expect(service.updateFromMietfach(mietfach))
        .rejects.toThrow('not synced');
    });
  });

  describe('syncMietfach', () => {
    it('should create if no flourioWarehouseId', async () => {
      const mietfach = createMockMietfach();
      mockFlourioClient.post.mockResolvedValue(mockWarehouse);

      await service.syncMietfach(mietfach);

      expect(mockFlourioClient.post).toHaveBeenCalled();
    });

    it('should update if flourioWarehouseId exists', async () => {
      const mietfach = createMockMietfach({ flourioWarehouseId: 'wh_123' });
      mockFlourioClient.patch.mockResolvedValue(mockWarehouse);

      await service.syncMietfach(mietfach);

      expect(mockFlourioClient.patch).toHaveBeenCalled();
    });
  });

  describe('CRUD operations', () => {
    it('should get warehouse by ID', async () => {
      mockFlourioClient.get.mockResolvedValue(mockWarehouse);

      const result = await service.get('wh_123');

      expect(result).toEqual(mockWarehouse);
      expect(mockFlourioClient.get).toHaveBeenCalledWith('/stocks/wh_123');
    });

    it('should list warehouses', async () => {
      mockFlourioClient.get.mockResolvedValue([mockWarehouse]);

      const result = await service.list();

      expect(result).toEqual([mockWarehouse]);
      expect(mockFlourioClient.get).toHaveBeenCalledWith('/stocks', { params: undefined });
    });

    it('should delete warehouse', async () => {
      mockFlourioClient.delete.mockResolvedValue(undefined);

      await service.delete('wh_123');

      expect(mockFlourioClient.delete).toHaveBeenCalledWith('/stocks/wh_123');
    });
  });

  describe('deleteAndUnlink', () => {
    it('should delete from FlourIO and unlink Mietfach', async () => {
      const mietfach = createMockMietfach({ flourioWarehouseId: 'wh_123' });
      mockFlourioClient.delete.mockResolvedValue(undefined);

      await service.deleteAndUnlink(mietfach);

      expect(mietfach.flourioWarehouseId).toBeUndefined();
      expect(mietfach.flourioSyncStatus).toBe('deleted');
      expect(mietfach.save).toHaveBeenCalled();
    });

    it('should handle 404 gracefully', async () => {
      const mietfach = createMockMietfach({ flourioWarehouseId: 'wh_123' });
      mockFlourioClient.delete.mockRejectedValue({ response: { status: 404 } });

      await service.deleteAndUnlink(mietfach);

      expect(mietfach.flourioWarehouseId).toBeUndefined();
      expect(mietfach.flourioSyncStatus).toBe('deleted');
    });

    it('should throw if not synced', async () => {
      const mietfach = createMockMietfach();

      await expect(service.deleteAndUnlink(mietfach))
        .rejects.toThrow('not synced');
    });
  });

  describe('needsSync', () => {
    it('should return true for never-synced Mietfach', () => {
      const mietfach = createMockMietfach();
      expect(service.needsSync(mietfach)).toBe(true);
    });

    it('should return false for unchanged synced Mietfach', () => {
      const now = new Date();
      const mietfach = createMockMietfach({
        flourioLastSyncAt: now,
        updatedAt: new Date(now.getTime() - 1000)
      });
      expect(service.needsSync(mietfach)).toBe(false);
    });
  });
});
