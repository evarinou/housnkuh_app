/**
 * @file warehouseMapping.ts
 * @purpose Mapping between housnkuh Mietfach and FlourIO Warehouse (Lager)
 * @created 2026-03-31
 * @note In Flourio, /v3/stocks = Warehouses. Each Mietfach = one Warehouse.
 */

import type { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';

export class WarehouseMapper {
  /**
   * Convert housnkuh Mietfach to FlourIO CreateWarehouseDto
   */
  static mietfachToWarehouse(mietfach: IMietfach): CreateWarehouseDto {
    const dto: CreateWarehouseDto = {
      name: `${mietfach.bezeichnung}`,
    };

    // Add address if standort is set
    if (mietfach.standort) {
      dto.address = {
        company1: mietfach.standort,
        country: 'DE'
      };
    }

    return dto;
  }

  /**
   * Create UpdateWarehouseDto from Mietfach changes
   */
  static mietfachToUpdateDto(mietfach: IMietfach): UpdateWarehouseDto {
    const dto: UpdateWarehouseDto = {
      name: `${mietfach.bezeichnung}`,
    };

    if (mietfach.standort) {
      dto.address = {
        company1: mietfach.standort,
        country: 'DE'
      };
    }

    return dto;
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
