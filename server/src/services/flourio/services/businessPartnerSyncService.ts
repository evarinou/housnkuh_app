/**
 * @file businessPartnerSyncService.ts
 * @purpose Bulk synchronization service for vendors to FlourIO BusinessPartners
 * @created 2025-10-16
 */

import { BusinessPartnerService } from './BusinessPartnerService';
import { BusinessPartnerMapper } from './businessPartnerMapping';
import User from '../../../models/User';
import type { IUser } from '../../../types/modelTypes';
import logger from '../../../utils/logger';

export interface SyncResult {
  synced: number;
  failed: number;
  skipped: number;
  errors: Array<{
    vendorId: string;
    vendorName: string;
    error: string;
  }>;
}

export interface SyncOptions {
  forceResync?: boolean;  // Resync even if already synced
  dryRun?: boolean;       // Don't actually sync, just validate
  batchSize?: number;     // Process in batches (default: 10)
}

export class BusinessPartnerSyncService {
  constructor(private businessPartnerService: BusinessPartnerService) {}

  /**
   * Sync all vendors that need synchronization
   */
  async syncAllVendors(options: SyncOptions = {}): Promise<SyncResult> {
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

    // Build query for vendors that need sync
    const query: any = { isVendor: true };

    if (!forceResync) {
      // Only sync vendors that are not synced or have errors
      query.$or = [
        { flourioSyncStatus: { $in: [undefined, 'pending', 'error'] } },
        { flourioSyncStatus: 'synced', updatedAt: { $gt: '$flourioLastSyncAt' } }
      ];
    }

    const vendors = await User.find(query);

    logger.info('Found vendors to sync', { count: vendors.length });

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < vendors.length; i += batchSize) {
      const batch = vendors.slice(i, i + batchSize);

      await Promise.all(
        batch.map(vendor => this.syncSingleVendor(vendor, result, dryRun))
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < vendors.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return result;
  }

  /**
   * Sync a single vendor
   */
  private async syncSingleVendor(
    vendor: IUser,
    result: SyncResult,
    dryRun: boolean
  ): Promise<void> {
    try {
      // Validate vendor data
      const errors = BusinessPartnerMapper.validateVendorForSync(vendor);
      if (errors.length > 0) {
        result.skipped++;
        result.errors.push({
          vendorId: String(vendor._id),
          vendorName: vendor.kontakt?.name || 'Unknown',
          error: `Validation failed: ${errors.join(', ')}`
        });
        return;
      }

      // Skip if already synced and data hasn't changed
      if (vendor.flourioSyncStatus === 'synced' &&
          !BusinessPartnerMapper.hasVendorChanged(vendor)) {
        result.skipped++;
        return;
      }

      if (dryRun) {
        logger.info('[DRY RUN] Would sync vendor', { name: vendor.kontakt?.name });
        result.synced++;
        return;
      }

      // Perform actual sync
      await this.businessPartnerService.syncVendor(vendor);
      result.synced++;

    } catch (error: any) {
      result.failed++;
      result.errors.push({
        vendorId: String(vendor._id),
        vendorName: vendor.kontakt?.name || 'Unknown',
        error: error.message || 'Unknown error'
      });

      // Update vendor with error status
      vendor.flourioSyncStatus = 'error';
      vendor.flourioSyncError = error.message;
      await vendor.save();
    }
  }

  /**
   * Sync specific vendors by IDs
   */
  async syncVendorsByIds(
    vendorIds: string[],
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const { dryRun = false } = options;

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const vendors = await User.find({
      _id: { $in: vendorIds },
      isVendor: true
    });

    for (const vendor of vendors) {
      await this.syncSingleVendor(vendor, result, dryRun);
    }

    return result;
  }

  /**
   * Get sync status for all vendors
   */
  async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    pending: number;
    error: number;
    needsSync: number;
  }> {
    const vendors = await User.find({ isVendor: true });

    const status = {
      total: vendors.length,
      synced: 0,
      pending: 0,
      error: 0,
      needsSync: 0
    };

    for (const vendor of vendors) {
      switch (vendor.flourioSyncStatus) {
        case 'synced':
          if (BusinessPartnerMapper.hasVendorChanged(vendor)) {
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

    const vendors = await User.find({
      isVendor: true,
      flourioSyncStatus: 'error'
    });

    logger.info('Retrying failed syncs', { count: vendors.length });

    for (const vendor of vendors) {
      await this.syncSingleVendor(vendor, result, dryRun);
    }

    return result;
  }
}
