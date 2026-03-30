/**
 * @file StockService.ts
 * @purpose CRUD operations for FlourIO Stock entities
 * @created 2025-10-16
 */

import { FlourioClient } from '../client/FlourioClient';
import { StockMapper } from './stockMapping';
import type {
  Stock,
  StockQueryParams,
  PaginatedResponse
} from '../generated/api-types';
import type { IMietfach } from '../../../types/modelTypes';

export class StockService {
  constructor(private client: FlourioClient) {}

  /**
   * Create Stock in FlourIO from housnkuh Mietfach
   */
  async createFromMietfach(mietfach: IMietfach): Promise<Stock> {
    // Validate Mietfach data
    const errors = StockMapper.validateMietfachForSync(mietfach);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Map Mietfach to Stock
    const stockData = StockMapper.mietfachToStock(mietfach);

    // Create in FlourIO
    const stock = await this.client.post<Stock>(
      '/stocks',
      stockData
    );

    // Update Mietfach with FlourIO reference
    mietfach.flourioStockId = stock.id;
    mietfach.flourioSyncStatus = 'synced';
    mietfach.flourioLastSyncAt = new Date();
    await mietfach.save();

    return stock;
  }

  /**
   * Update Stock in FlourIO from housnkuh Mietfach
   */
  async updateFromMietfach(mietfach: IMietfach): Promise<Stock> {
    if (!mietfach.flourioStockId) {
      throw new Error('Mietfach not synced to FlourIO yet. Use createFromMietfach first.');
    }

    // Validate Mietfach data
    const errors = StockMapper.validateMietfachForSync(mietfach);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Map Mietfach to update DTO
    const updateData = StockMapper.mietfachToUpdateDto(mietfach);

    // Update in FlourIO
    const stock = await this.client.patch<Stock>(
      `/stocks/${mietfach.flourioStockId}`,
      updateData
    );

    // Update sync metadata
    mietfach.flourioSyncStatus = 'synced';
    mietfach.flourioLastSyncAt = new Date();
    mietfach.flourioSyncError = undefined;
    await mietfach.save();

    return stock;
  }

  /**
   * Sync Mietfach (create or update based on sync status)
   */
  async syncMietfach(mietfach: IMietfach): Promise<Stock> {
    if (mietfach.flourioStockId) {
      return this.updateFromMietfach(mietfach);
    } else {
      return this.createFromMietfach(mietfach);
    }
  }

  /**
   * Get Stock by ID from FlourIO
   */
  async get(stockId: string): Promise<Stock> {
    return this.client.get<Stock>(`/stocks/${stockId}`);
  }

  /**
   * List Stocks from FlourIO
   */
  async list(params?: StockQueryParams): Promise<Stock[]> {
    const response = await this.client.get<Stock[]>(
      '/stocks',
      { params }
    );
    return response;
  }

  /**
   * List Stocks with pagination
   */
  async listPaginated(
    params?: StockQueryParams
  ): Promise<PaginatedResponse<Stock>> {
    return this.client.get<PaginatedResponse<Stock>>(
      '/stocks',
      { params }
    );
  }

  /**
   * Delete Stock from FlourIO
   */
  async delete(stockId: string): Promise<void> {
    await this.client.delete(`/stocks/${stockId}`);
  }

  /**
   * Delete and unlink Stock from Mietfach
   */
  async deleteAndUnlink(mietfach: IMietfach): Promise<void> {
    if (!mietfach.flourioStockId) {
      throw new Error('Mietfach not synced to FlourIO');
    }

    try {
      await this.delete(mietfach.flourioStockId);
    } catch (error: any) {
      // If stock doesn't exist in FlourIO, that's ok
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    // Unlink from Mietfach
    mietfach.flourioStockId = undefined;
    mietfach.flourioSyncStatus = 'deleted';
    mietfach.flourioLastSyncAt = new Date();
    await mietfach.save();
  }

  /**
   * Check if Mietfach needs sync (data changed since last sync)
   */
  needsSync(mietfach: IMietfach): boolean {
    return StockMapper.hasMietfachChanged(mietfach);
  }
}
