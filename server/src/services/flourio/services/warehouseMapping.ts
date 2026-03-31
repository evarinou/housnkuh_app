/**
 * @file warehouseMapping.ts
 * @purpose Mapping between housnkuh Mietfach and FlourIO Warehouse (Lager)
 * @created 2026-03-31
 * @note In Flourio, /v3/stocks = Warehouses. Each Mietfach = one Warehouse.
 */

import type { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';
import { flourioTenantConfig } from '../client/config';

export class WarehouseMapper {
  /**
   * Convert housnkuh Mietfach to FlourIO CreateWarehouseDto.
   * Uses default warehouse address from config as base, with Mietfach name.
   */
  static mietfachToWarehouse(mietfach: IMietfach): CreateWarehouseDto {
    const defaultAddr = flourioTenantConfig.defaultWarehouseAddress;

    return {
      name: mietfach.bezeichnung,
      address: {
        company1: defaultAddr.company1 || 'housnkuh',
        street: defaultAddr.street,
        streetNumber: defaultAddr.streetNumber,
        zipCode: defaultAddr.zipCode,
        city: defaultAddr.city,
        country: 'DE'
      },
      useBins: false
    };
  }

  /**
   * Create UpdateWarehouseDto from Mietfach changes
   */
  static mietfachToUpdateDto(mietfach: IMietfach): UpdateWarehouseDto {
    return {
      name: mietfach.bezeichnung
    };
  }

  /**
   * Convert FlourIO Warehouse to housnkuh Mietfach update data
   */
  static warehouseToMietfach(warehouse: Warehouse): Partial<IMietfach> {
    return {
      flourioWarehouseId: warehouse.id,
      flourioSyncStatus: 'synced',
      flourioLastSyncAt: new Date()
    };
  }

  /**
   * Validate Mietfach data before sync
   */
  static validateMietfachForSync(mietfach: IMietfach): string[] {
    const errors: string[] = [];

    if (!mietfach.bezeichnung) {
      errors.push('Bezeichnung is required');
    }

    if (typeof mietfach.verfuegbar !== 'boolean') {
      errors.push('Verfuegbar must be boolean');
    }

    if (!mietfach.typ) {
      errors.push('Typ is required');
    }

    return errors;
  }

  /**
   * Check if Mietfach data has changed since last sync
   */
  static hasMietfachChanged(mietfach: IMietfach): boolean {
    if (!mietfach.flourioLastSyncAt) return true;
    if (!mietfach.updatedAt) return false;

    return mietfach.updatedAt > mietfach.flourioLastSyncAt;
  }

  /**
   * Generate display name for Warehouse from Mietfach
   */
  static generateWarehouseDisplayName(mietfach: IMietfach): string {
    return `Lagerplatz ${mietfach.bezeichnung}`;
  }

  /**
   * Extract metadata for Warehouse from Mietfach
   */
  static extractMetadata(mietfach: IMietfach): Record<string, any> {
    return {
      housnkuhMietfachId: String(mietfach._id),
      bezeichnung: mietfach.bezeichnung,
      typ: mietfach.typ,
      groesse: mietfach.groesse,
      standort: mietfach.standort,
      features: mietfach.features,
      creationSource: mietfach.creationSource
    };
  }
}
