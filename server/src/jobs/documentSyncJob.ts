/**
 * @file documentSyncJob.ts
 * @purpose Cron job to pull documents from Flourio every 15 minutes
 * @created 2026-03-31
 */

import * as cron from 'node-cron';
import { DocumentPullService } from '../services/flourio/services/DocumentPullService';
import { FlourioClient } from '../services/flourio/client/FlourioClient';
import { flourioConfig } from '../services/flourio/client/config';
import { VendorSaleProjectionService } from '../services/vendorSaleProjectionService';
import logger from '../utils/logger';

export class DocumentSyncJob {
  private static task: cron.ScheduledTask | null = null;

  // Every 15 minutes
  static schedule = '*/15 * * * *';

  /**
   * Run the document pull
   */
  static async run(): Promise<void> {
    logger.info('[DocumentSyncJob] Starting document pull from Flourio...');

    try {
      const client = new FlourioClient(flourioConfig);
      const pullService = new DocumentPullService(client);

      const result = await pullService.pullAll();

      logger.info('[DocumentSyncJob] Document pull completed', {
        created: result.created,
        updated: result.updated,
        errors: result.errors.length,
        durationMs: result.duration
      });

      if (result.errors.length > 0) {
        logger.warn('[DocumentSyncJob] Errors during document pull', {
          errors: result.errors
        });
      }

      // Frisch gepullte Verkaufsbelege in den abrechenbaren VendorSale-Ledger
      // projizieren (idempotent). Fenster großzügig über das 15-Min-Intervall.
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const projection = await VendorSaleProjectionService.project({ since });
        logger.info('[DocumentSyncJob] VendorSale projection completed', {
          documents: projection.documents,
          created: projection.created,
          skippedNoVendor: projection.skippedNoVendor
        });
      } catch (projErr: any) {
        logger.error('[DocumentSyncJob] VendorSale projection failed', {
          error: projErr.message
        });
      }
    } catch (error: any) {
      logger.error('[DocumentSyncJob] Document pull failed', {
        error: error.message
      });
    }
  }

  /**
   * Initialize the scheduled job
   */
  static init(): void {
    if (this.task) {
      logger.warn('[DocumentSyncJob] Already scheduled');
      return;
    }

    this.task = cron.schedule(this.schedule, () => this.run(), {
      timezone: 'Europe/Berlin'
    });

    this.task.start();
    logger.info('[DocumentSyncJob] Scheduled (every 15 minutes)');
  }

  /**
   * Stop the scheduled job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      logger.info('[DocumentSyncJob] Stopped');
    }
  }

  static isRunning(): boolean {
    return this.task !== null;
  }
}

export default DocumentSyncJob;
