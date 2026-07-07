/**
 * @file warehouseMapping.test.ts
 * @purpose Unit tests for WarehouseMapper
 * @created 2026-03-31
 */

import { WarehouseMapper } from './warehouseMapping';
import type { Warehouse } from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';
import { MietfachTyp } from '../../../types/modelTypes';

// Deterministische Tenant-Config: Der Mapper nutzt die zentrale housnkuh-
// Lageradresse aus der Config (nicht den Mietfach-Standort) – siehe
// flourioTenantConfig.defaultWarehouseAddress.
jest.mock('../client/config', () => ({
  flourioTenantConfig: {
    defaultWarehouseAddress: {
      company1: 'housnkuh',
      street: 'Strauer Str.',
      streetNumber: '15',
      zipCode: '96317',
      city: 'Kronach',
      country: 'DE'
    }
  }
}));

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
  features: ['gekühlt'],
  creationSource: 'manual',
  flourioWarehouseId: undefined,
  flourioSyncStatus: undefined,
  flourioLastSyncAt: undefined,
  flourioSyncError: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn(),
  isAvailableForPeriod: jest.fn(),
  ...overrides
} as any);

describe('WarehouseMapper', () => {
  describe('mietfachToWarehouse', () => {
    it('should map Mietfach to CreateWarehouseDto with default warehouse address', () => {
      const mietfach = createMockMietfach();

      const result = WarehouseMapper.mietfachToWarehouse(mietfach);

      expect(result).toEqual({
        name: 'Regal-A1',
        address: {
          company1: 'housnkuh',
          street: 'Strauer Str.',
          streetNumber: '15',
          zipCode: '96317',
          city: 'Kronach',
          country: 'DE'
        },
        useBins: false
      });
    });

    it('should use default warehouse address even without standort', () => {
      const mietfach = createMockMietfach({ standort: undefined });

      const result = WarehouseMapper.mietfachToWarehouse(mietfach);

      expect(result.name).toBe('Regal-A1');
      expect(result.address).toEqual({
        company1: 'housnkuh',
        street: 'Strauer Str.',
        streetNumber: '15',
        zipCode: '96317',
        city: 'Kronach',
        country: 'DE'
      });
    });
  });

  describe('mietfachToUpdateDto', () => {
    it('should create UpdateWarehouseDto with name only', () => {
      const mietfach = createMockMietfach();

      const result = WarehouseMapper.mietfachToUpdateDto(mietfach);

      expect(result).toEqual({ name: 'Regal-A1' });
    });
  });

  describe('warehouseToMietfach', () => {
    it('should map Warehouse to Mietfach update fields', () => {
      const warehouse: Warehouse = {
        id: 'wh_123',
        name: 'Regal-A1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = WarehouseMapper.warehouseToMietfach(warehouse);

      expect(result.flourioWarehouseId).toBe('wh_123');
      expect(result.flourioSyncStatus).toBe('synced');
      expect(result.flourioLastSyncAt).toBeInstanceOf(Date);
    });
  });

  describe('validateMietfachForSync', () => {
    it('should return empty array for valid Mietfach', () => {
      const errors = WarehouseMapper.validateMietfachForSync(createMockMietfach());
      expect(errors).toHaveLength(0);
    });

    it('should require bezeichnung', () => {
      const errors = WarehouseMapper.validateMietfachForSync(
        createMockMietfach({ bezeichnung: '' })
      );
      expect(errors).toContain('Bezeichnung is required');
    });

    it('should require boolean verfuegbar', () => {
      const errors = WarehouseMapper.validateMietfachForSync(
        createMockMietfach({ verfuegbar: undefined })
      );
      expect(errors).toContain('Verfuegbar must be boolean');
    });

    it('should require typ', () => {
      const errors = WarehouseMapper.validateMietfachForSync(
        createMockMietfach({ typ: '' as any })
      );
      expect(errors).toContain('Typ is required');
    });
  });

  describe('hasMietfachChanged', () => {
    it('should return true for never-synced Mietfach', () => {
      const result = WarehouseMapper.hasMietfachChanged(
        createMockMietfach({ flourioLastSyncAt: undefined })
      );
      expect(result).toBe(true);
    });

    it('should return true if updatedAt > flourioLastSyncAt', () => {
      const now = new Date();
      const result = WarehouseMapper.hasMietfachChanged(
        createMockMietfach({
          flourioLastSyncAt: new Date(now.getTime() - 10000),
          updatedAt: now
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if updatedAt <= flourioLastSyncAt', () => {
      const now = new Date();
      const result = WarehouseMapper.hasMietfachChanged(
        createMockMietfach({
          flourioLastSyncAt: now,
          updatedAt: new Date(now.getTime() - 10000)
        })
      );
      expect(result).toBe(false);
    });
  });

  describe('generateWarehouseDisplayName', () => {
    it('should generate display name', () => {
      const result = WarehouseMapper.generateWarehouseDisplayName(createMockMietfach());
      expect(result).toBe('Lagerplatz Regal-A1');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata', () => {
      const result = WarehouseMapper.extractMetadata(createMockMietfach());
      expect(result.bezeichnung).toBe('Regal-A1');
      expect(result.typ).toBe(MietfachTyp.REGAL);
      expect(result.standort).toBe('Hauptlager');
    });
  });
});
