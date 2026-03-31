/**
 * @file stockPullJob.ts
 * @purpose Cron job to pull stock item entries from Flourio every 5 minutes
 * @created 2026-03-31
 *
 * Flourio is the source of truth for inventory levels.
 * This job polls Flourio and updates local Product.flourioStock data.
 */

import * as cron from 'node-cron';
import { StockItemEntryPullService } from '../services/flourio/services/StockItemEntryPullService';
import { FlourioClient } from '../services/flourio/client/FlourioClient';
import { flourioConfig } from '../services/flourio/client/config';
import logger from '../utils/logger';

export class StockPullJob {
  private static task: cron.ScheduledTask | null = null;

  // Every 5 minutes
  static schedule = '*/5 * * * *';

  /**
   * Run the stock pull
   */
  static async run(): Promise<void> {
    logger.info('[StockPullJob] Starting stock pull from Flourio...');

    try {
      const client = new FlourioClient(flourioConfig);
      const pullService = new StockItemEntryPullService(client);

      const result = await pullService.pullAll();

      logger.info('[StockPullJob] Stock pull completed', {
        updated: result.updated,
        unchanged: result.unchanged,
        unmatched: result.unmatched,
        errors: result.errors.length,
        durationMs: result.duration
      });

      if (result.errors.length > 0) {
        logger.warn('[StockPullJob] Errors during stock pull', {
          errors: result.errors
        });
      }
    } catch (error: any) {
      logger.error('[StockPullJob] Stock pull failed', {
        error: error.message
      });
    }
  }

  /**
   * Initialize the scheduled job
   */
  static init(): void {
    if (this.task) {
      logger.warn('[StockPullJob] Already scheduled');
      return;
    }

    this.task = cron.schedule(this.schedule, () => this.run(), {
      timezone: 'Europe/Berlin'
    });

    this.task.start();
    logger.info('[StockPullJob] Scheduled (every 5 minutes)');
  }

  /**
   * Stop the scheduled job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      logger.info('[StockPullJob] Stopped');
    }
  }

  /**
   * Check if running
   */
  static isRunning(): boolean {
    return this.task !== null;
  }
}

export default StockPullJob;
