/**
 * @file warehouseSyncService.ts
 * @purpose Bulk synchronization service for Mietfächer to FlourIO Warehouses
 * @created 2026-03-31
 * @note In Flourio, /v3/stocks = Warehouses. Each Mietfach = one Warehouse.
 */

import { WarehouseService } from './WarehouseService';
import { WarehouseMapper } from './warehouseMapping';
import Mietfach from '../../../models/Mietfach';
import type { IMietfach } from '../../../types/modelTypes';
import logger from '../../../utils/logger';

export interface WarehouseSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  errors: Array<{
    mietfachId: string;
    mietfachName: string;
    error: string;
  }>;
}

export interface WarehouseSyncOptions {
  forceResync?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

export class WarehouseSyncService {
  constructor(private warehouseService: WarehouseService) {}

  /**
   * Sync all Mietfächer that need synchronization
   */
  async syncAllMietfaecher(options: WarehouseSyncOptions = {}): Promise<WarehouseSyncResult> {
    const {
      forceResync = false,
      dryRun = false,
      batchSize = 10
    } = options;

    const result: WarehouseSyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const query: any = {};

    if (!forceResync) {
      query.$or = [
        { flourioSyncStatus: { $in: [undefined, 'pending', 'error'] } },
        { flourioSyncStatus: 'synced', updatedAt: { $gt: '$flourioLastSyncAt' } }
      ];
    }

    const mietfaecher = await Mietfach.find(query);

    logger.info('[WarehouseSyncService] Found Mietfaecher to sync', { count: mietfaecher.length });

    for (let i = 0; i < mietfaecher.length; i += batchSize) {
      const batch = mietfaecher.slice(i, i + batchSize);

      await Promise.all(
        batch.map(mietfach => this.syncSingleMietfach(mietfach, result, dryRun, forceResync))
      );

      if (i + batchSize < mietfaecher.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * Sync a single Mietfach
   */
  private async syncSingleMietfach(
    mietfach: IMietfach,
    result: WarehouseSyncResult,
    dryRun: boolean,
    forceResync: boolean = false
  ): Promise<void> {
    try {
      const errors = WarehouseMapper.validateMietfachForSync(mietfach);
      if (errors.length > 0) {
        result.skipped++;
        result.errors.push({
          mietfachId: String(mietfach._id),
          mietfachName: mietfach.bezeichnung || 'Unknown',
          error: `Validation failed: ${errors.join(', ')}`
        });
        return;
      }

      if (!forceResync &&
          mietfach.flourioSyncStatus === 'synced' &&
          !WarehouseMapper.hasMietfachChanged(mietfach)) {
        result.skipped++;
        return;
      }

      if (dryRun) {
        logger.info('[DRY RUN] Would sync Mietfach as Warehouse', { bezeichnung: mietfach.bezeichnung });
        result.synced++;
        return;
      }

      await this.warehouseService.syncMietfach(mietfach);
      result.synced++;

    } catch (error: any) {
      result.failed++;
      result.errors.push({
        mietfachId: String(mietfach._id),
        mietfachName: mietfach.bezeichnung || 'Unknown',
        error: error.message || 'Unknown error'
      });

      mietfach.flourioSyncStatus = 'error';
      mietfach.flourioSyncError = error.message;
      await mietfach.save();
    }
  }

  /**
   * Sync specific Mietfächer by IDs
   */
  async syncMietfaecherByIds(
    mietfachIds: string[],
    options: WarehouseSyncOptions = {}
  ): Promise<WarehouseSyncResult> {
    const { dryRun = false } = options;

    const result: WarehouseSyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const mietfaecher = await Mietfach.find({
      _id: { $in: mietfachIds }
    });

    for (const mietfach of mietfaecher) {
      await this.syncSingleMietfach(mietfach, result, dryRun);
    }

    return result;
  }

  /**
   * Get sync status for all Mietfächer
   */
  async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    pending: number;
    error: number;
    needsSync: number;
  }> {
    const mietfaecher = await Mietfach.find();

    const status = {
      total: mietfaecher.length,
      synced: 0,
      pending: 0,
      error: 0,
      needsSync: 0
    };

    for (const mietfach of mietfaecher) {
      switch (mietfach.flourioSyncStatus) {
        case 'synced':
          if (WarehouseMapper.hasMietfachChanged(mietfach)) {
            status.needsSync++;
          } else {
            status.synced++;
          }
          break;
        case 'pending':
          status.pending++;
          break;
        case 'error':
          status.error++;
          break;
        default:
          status.needsSync++;
      }
    }

    return status;
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs(options: WarehouseSyncOptions = {}): Promise<WarehouseSyncResult> {
    const { dryRun = false } = options;

    const result: WarehouseSyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const mietfaecher = await Mietfach.find({
      flourioSyncStatus: 'error'
    });

    logger.info('[WarehouseSyncService] Retrying failed syncs', { count: mietfaecher.length });

    for (const mietfach of mietfaecher) {
      await this.syncSingleMietfach(mietfach, result, dryRun);
    }

    return result;
  }
}
