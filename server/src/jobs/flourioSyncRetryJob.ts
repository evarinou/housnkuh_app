/**
 * @file flourioSyncRetryJob.ts
 * @purpose Cron-Job (stündlich um :15): wiederholt fehlgeschlagene flour.io-Syncs
 *          (BusinessPartner + Warehouse, AUDIT OP6) und synct neue/pending
 *          Mietfächer als Warehouses nach flour.io (T4.2).
 * @created 2026-07-08
 *
 * Überlappungssicher (AUDIT OP9-Muster): ein In-Process-Lock (`running`)
 * verhindert, dass sich zwei Läufe überschneiden. Jeder der drei Schritte
 * fängt seine Fehler selbst — ein Fehler in Schritt (a) stoppt (b)/(c) nicht.
 * Der Retry-Deckel (MAX_SYNC_RETRIES) liegt in den Sync-Services; dauerhaft
 * fehlgeschlagene Einträge brauchen ein manuelles Admin-Retry.
 */

import * as cron from 'node-cron';
import { BusinessPartnerSyncService } from '../services/flourio/services/businessPartnerSyncService';
import { BusinessPartnerService } from '../services/flourio/services/BusinessPartnerService';
import { WarehouseSyncService } from '../services/flourio/services/warehouseSyncService';
import { WarehouseService } from '../services/flourio/services/WarehouseService';
import { FlourioClient } from '../services/flourio/client/FlourioClient';
import { flourioConfig } from '../services/flourio/client/config';
import logger from '../utils/logger';

export class FlourioSyncRetryJob {
  private static task: cron.ScheduledTask | null = null;
  private static running = false;

  // Stündlich um :15 (versetzt zu den 5-Min-Jobs)
  static schedule = '15 * * * *';

  /**
   * Ein Retry-Lauf: (a) BusinessPartner-Retries, (b) Warehouse-Retries,
   * (c) Warehouse-Sync für noch nie gesyncte/pending Mietfächer.
   */
  static async run(): Promise<void> {
    if (FlourioSyncRetryJob.running) {
      logger.warn('[FlourioSyncRetryJob] Vorheriger Lauf läuft noch — übersprungen');
      return;
    }
    FlourioSyncRetryJob.running = true;
    try {
      if (!flourioConfig.bearerToken) {
        logger.debug('[FlourioSyncRetryJob] Übersprungen (kein flour.io-Token konfiguriert)');
        return;
      }
      logger.info('[FlourioSyncRetryJob] Starte flour.io-Sync-Retry-Lauf...');

      const client = new FlourioClient(flourioConfig);
      const businessPartnerSync = new BusinessPartnerSyncService(new BusinessPartnerService(client));
      const warehouseSync = new WarehouseSyncService(new WarehouseService(client));

      // (a) Fehlgeschlagene BusinessPartner-Syncs erneut versuchen
      try {
        const result = await businessPartnerSync.retryFailedSyncs();
        if (result.synced || result.failed || result.skipped) {
          logger.info('[FlourioSyncRetryJob] BusinessPartner-Retries', {
            synced: result.synced, failed: result.failed, skipped: result.skipped
          });
        }
      } catch (error: any) {
        logger.error('[FlourioSyncRetryJob] BusinessPartner-Retry fehlgeschlagen', { error: error.message });
      }

      // (b) Fehlgeschlagene Warehouse-Syncs erneut versuchen
      try {
        const result = await warehouseSync.retryFailedSyncs();
        if (result.synced || result.failed || result.skipped) {
          logger.info('[FlourioSyncRetryJob] Warehouse-Retries', {
            synced: result.synced, failed: result.failed, skipped: result.skipped
          });
        }
      } catch (error: any) {
        logger.error('[FlourioSyncRetryJob] Warehouse-Retry fehlgeschlagen', { error: error.message });
      }

      // (c) T4.2: Noch nie gesyncte/pending Mietfächer als Warehouse anlegen.
      //     excludeErrors: 'error'-Einträge behandelt Schritt (b) mit Retry-Deckel —
      //     hier würden sie den Deckel umgehen und doppelt versucht.
      try {
        const result = await warehouseSync.syncAllMietfaecher({ excludeErrors: true });
        if (result.synced || result.failed) {
          logger.info('[FlourioSyncRetryJob] Warehouse-Sync neuer Mietfächer', {
            synced: result.synced, failed: result.failed, skipped: result.skipped
          });
        }
      } catch (error: any) {
        logger.error('[FlourioSyncRetryJob] Warehouse-Sync neuer Mietfächer fehlgeschlagen', { error: error.message });
      }
    } finally {
      FlourioSyncRetryJob.running = false;
    }
  }

  static init(): void {
    if (FlourioSyncRetryJob.task) {
      logger.warn('[FlourioSyncRetryJob] Already scheduled');
      return;
    }
    FlourioSyncRetryJob.task = cron.schedule(FlourioSyncRetryJob.schedule, () => FlourioSyncRetryJob.run(), {
      timezone: 'Europe/Berlin'
    });
    FlourioSyncRetryJob.task.start();
    logger.info('[FlourioSyncRetryJob] Scheduled (hourly at :15)');
  }

  static stop(): void {
    if (FlourioSyncRetryJob.task) {
      FlourioSyncRetryJob.task.stop();
      FlourioSyncRetryJob.task.destroy();
      FlourioSyncRetryJob.task = null;
      logger.info('[FlourioSyncRetryJob] Stopped');
    }
  }
}

export default FlourioSyncRetryJob;
