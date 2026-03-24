/**
 * @file stockSyncService.ts
 * @purpose Bulk synchronization service for Mietfächer to FlourIO Stocks
 * @created 2025-10-16
 */

import { StockService } from './StockService';
import { StockMapper } from './stockMapping';
import Mietfach from '../../../models/Mietfach';
import type { IMietfach } from '../../../types/modelTypes';
import logger from '../../../utils/logger';

export interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
  errors: Array<{
    mietfachId: string;
    mietfachName: string;
    error: string;
  }>;
}

export interface SyncOptions {
  forceResync?: boolean;  // Resync even if already synced
  dryRun?: boolean;       // Don't actually sync, just validate
  batchSize?: number;     // Process in batches (default: 10)
}

export class StockSyncService {
  constructor(private stockService: StockService) {}

  /**
   * Sync all Mietfächer that need synchronization
   */
  async syncAllMietfaecher(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      forceResync = false,
      dryRun = false,
      batchSize = 10
    } = options;

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Build query for Mietfächer that need sync
    const query: any = {};

    if (!forceResync) {
      // Only sync Mietfächer that are not synced or have errors
      query.$or = [
        { flourioSyncStatus: { $in: [undefined, 'pending', 'error'] } },
        { flourioSyncStatus: 'synced', updatedAt: { $gt: '$flourioLastSyncAt' } }
      ];
    }

    const mietfaecher = await Mietfach.find(query);

    logger.info('Found Mietfaecher to sync', { count: mietfaecher.length });

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < mietfaecher.length; i += batchSize) {
      const batch = mietfaecher.slice(i, i + batchSize);

      await Promise.all(
        batch.map(mietfach => this.syncSingleMietfach(mietfach, result, dryRun, forceResync))
      );

      // Small delay between batches to respect rate limits
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
    result: SyncResult,
    dryRun: boolean,
    forceResync: boolean = false
  ): Promise<void> {
    try {
      // Validate Mietfach data
      const errors = StockMapper.validateMietfachForSync(mietfach);
      if (errors.length > 0) {
        result.skipped++;
        result.errors.push({
          mietfachId: String(mietfach._id),
          mietfachName: mietfach.bezeichnung || 'Unknown',
          error: `Validation failed: ${errors.join(', ')}`
        });
        return;
      }

      // Skip if already synced and data hasn't changed (unless forceResync)
      if (!forceResync &&
          mietfach.flourioSyncStatus === 'synced' &&
          !StockMapper.hasMietfachChanged(mietfach)) {
        result.skipped++;
        return;
      }

      if (dryRun) {
        logger.info('[DRY RUN] Would sync Mietfach', { bezeichnung: mietfach.bezeichnung });
        result.synced++;
        return;
      }

      // Perform actual sync
      await this.stockService.syncMietfach(mietfach);
      result.synced++;

    } catch (error: any) {
      result.failed++;
      result.errors.push({
        mietfachId: String(mietfach._id),
        mietfachName: mietfach.bezeichnung || 'Unknown',
        error: error.message || 'Unknown error'
      });

      // Update Mietfach with error status
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
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const { dryRun = false } = options;

    const result: SyncResult = {
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
          if (StockMapper.hasMietfachChanged(mietfach)) {
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
  async retryFailedSyncs(options: SyncOptions = {}): Promise<SyncResult> {
    const { dryRun = false } = options;

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const mietfaecher = await Mietfach.find({
      flourioSyncStatus: 'error'
    });

    logger.info('Retrying failed syncs', { count: mietfaecher.length });

    for (const mietfach of mietfaecher) {
      await this.syncSingleMietfach(mietfach, result, dryRun);
    }

    return result;
  }
}
