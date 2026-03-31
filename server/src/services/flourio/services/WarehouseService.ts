/**
 * @file WarehouseService.ts
 * @purpose CRUD operations for FlourIO Warehouse (Lager) entities
 * @created 2026-03-31
 * @note In Flourio, /v3/stocks = Warehouses. Each Mietfach maps to one Warehouse.
 */

import { FlourioClient } from '../client/FlourioClient';
import { WarehouseMapper } from './warehouseMapping';
import type {
  Warehouse,
  WarehouseQueryParams,
  PaginatedResponse,
  SearchWarehouseDto
} from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';

export class WarehouseService {
  constructor(private client: FlourioClient) {}

  /**
   * Create Warehouse in FlourIO from housnkuh Mietfach
   */
  async createFromMietfach(mietfach: IMietfach): Promise<Warehouse> {
    const errors = WarehouseMapper.validateMietfachForSync(mietfach);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const warehouseData = WarehouseMapper.mietfachToWarehouse(mietfach);

    const warehouse = await this.client.post<Warehouse>(
      '/stocks',
      warehouseData
    );

    mietfach.flourioWarehouseId = warehouse.id;
    mietfach.flourioSyncStatus = 'synced';
    mietfach.flourioLastSyncAt = new Date();
    mietfach.flourioSyncError = undefined;
    await mietfach.save();

    return warehouse;
  }

  /**
   * Update Warehouse in FlourIO from housnkuh Mietfach
   */
  async updateFromMietfach(mietfach: IMietfach): Promise<Warehouse> {
    if (!mietfach.flourioWarehouseId) {
      throw new Error('Mietfach not synced to FlourIO yet. Use createFromMietfach first.');
    }

    const errors = WarehouseMapper.validateMietfachForSync(mietfach);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const updateData = WarehouseMapper.mietfachToUpdateDto(mietfach);

    const warehouse = await this.client.patch<Warehouse>(
      `/stocks/${mietfach.flourioWarehouseId}`,
      updateData
    );

    mietfach.flourioSyncStatus = 'synced';
    mietfach.flourioLastSyncAt = new Date();
    mietfach.flourioSyncError = undefined;
    await mietfach.save();

    return warehouse;
  }

  /**
   * Sync Mietfach (create or update based on sync status)
   */
  async syncMietfach(mietfach: IMietfach): Promise<Warehouse> {
    if (mietfach.flourioWarehouseId) {
      return this.updateFromMietfach(mietfach);
    } else {
      return this.createFromMietfach(mietfach);
    }
  }

  /**
   * Get Warehouse by ID from FlourIO
   */
  async get(warehouseId: string): Promise<Warehouse> {
    return this.client.get<Warehouse>(`/stocks/${warehouseId}`);
  }

  /**
   * List Warehouses from FlourIO
   */
  async list(params?: WarehouseQueryParams): Promise<Warehouse[]> {
    const response = await this.client.get<Warehouse[]>(
      '/stocks',
      { params }
    );
    return response;
  }

  /**
   * List Warehouses with pagination
   */
  async listPaginated(
    params?: WarehouseQueryParams
  ): Promise<PaginatedResponse<Warehouse>> {
    return this.client.get<PaginatedResponse<Warehouse>>(
      '/stocks',
      { params }
    );
  }

  /**
   * Search Warehouses
   */
  async search(dto: SearchWarehouseDto): Promise<Warehouse[]> {
    const response = await this.client.post<Warehouse[]>(
      '/stocks/search',
      dto
    );
    return response;
  }

  /**
   * Get multiple Warehouses by IDs
   */
  async findMany(ids: string[]): Promise<Warehouse[]> {
    return this.client.get<Warehouse[]>(
      '/stocks/findMany',
      { params: { ids: ids.join(',') } }
    );
  }

  /**
   * Archive Warehouse in FlourIO
   */
  async archive(warehouseId: string): Promise<void> {
    await this.client.post(`/stocks/${warehouseId}/archive`, {});
  }

  /**
   * Delete Warehouse from FlourIO
   */
  async delete(warehouseId: string): Promise<void> {
    await this.client.delete(`/stocks/${warehouseId}`);
  }

  /**
   * Delete and unlink Warehouse from Mietfach
   */
  async deleteAndUnlink(mietfach: IMietfach): Promise<void> {
    if (!mietfach.flourioWarehouseId) {
      throw new Error('Mietfach not synced to FlourIO');
    }

    try {
      await this.delete(mietfach.flourioWarehouseId);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    mietfach.flourioWarehouseId = undefined;
    mietfach.flourioSyncStatus = 'deleted';
    mietfach.flourioLastSyncAt = new Date();
    await mietfach.save();
  }

  /**
   * Check if Mietfach needs sync (data changed since last sync)
   */
  needsSync(mietfach: IMietfach): boolean {
    return WarehouseMapper.hasMietfachChanged(mietfach);
  }
}
