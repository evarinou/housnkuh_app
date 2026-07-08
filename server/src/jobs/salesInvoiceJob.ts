/**
 * @file salesInvoiceJob.ts
 * @purpose Cron-Job (alle 5 min): erzeugt Vendor-Verkaufsrechnungen (F2a) aus dem
 *          VendorSale-Ledger und generiert die zugehörigen PDFs.
 * @created 2026-07-07
 *
 * Überlappungssicher (Audit OP9): ein In-Process-Lock (`running`) verhindert, dass
 * sich zwei Läufe überschneiden, falls ein Lauf länger als das 5-Min-Intervall
 * braucht. Die „genau einmal"-Garantie liegt zusätzlich strukturell im
 * claim-first des SalesInvoiceService (der Lock ist Effizienz, nicht Korrektheit).
 */

import * as cron from 'node-cron';
import { SalesInvoiceService } from '../services/salesInvoiceService';
import { SalesInvoicePdfService } from '../services/pdf/salesInvoicePdfService';
import logger from '../utils/logger';

export class SalesInvoiceJob {
  private static task: cron.ScheduledTask | null = null;
  private static running = false;

  /** Läuft gerade ein Durchlauf? (für Graceful Shutdown, AUDIT OP10) */
  static isBusy(): boolean {
    return SalesInvoiceJob.running;
  }

  static schedule = '*/5 * * * *';

  /**
   * Ein Abrechnungslauf: Rechnungen erzeugen, dann fehlende PDFs nachziehen.
   */
  static async run(): Promise<void> {
    if (SalesInvoiceJob.running) {
      logger.warn('[SalesInvoiceJob] Vorheriger Lauf läuft noch — übersprungen');
      return;
    }
    SalesInvoiceJob.running = true;
    logger.info('[SalesInvoiceJob] Starte Verkaufsrechnungs-Lauf...');
    try {
      const billing = await SalesInvoiceService.generateAll();
      logger.info('[SalesInvoiceJob] Rechnungen erzeugt', {
        created: billing.created, vendors: billing.vendors, errors: billing.errors
      });

      // PDFs für neue (und ggf. aus Vorläufen offene) Rechnungen erzeugen.
      const pdfs = await SalesInvoicePdfService.generatePending();
      if (pdfs.generated || pdfs.failed) {
        logger.info('[SalesInvoiceJob] PDFs erzeugt', pdfs);
      }
    } catch (error: any) {
      logger.error('[SalesInvoiceJob] Lauf fehlgeschlagen', { error: error.message });
    } finally {
      SalesInvoiceJob.running = false;
    }
  }

  static init(): void {
    if (SalesInvoiceJob.task) {
      logger.warn('[SalesInvoiceJob] Already scheduled');
      return;
    }
    SalesInvoiceJob.task = cron.schedule(SalesInvoiceJob.schedule, () => SalesInvoiceJob.run(), {
      timezone: 'Europe/Berlin'
    });
    SalesInvoiceJob.task.start();
    logger.info('[SalesInvoiceJob] Scheduled (every 5 minutes)');
  }

  static stop(): void {
    if (SalesInvoiceJob.task) {
      SalesInvoiceJob.task.stop();
      SalesInvoiceJob.task.destroy();
      SalesInvoiceJob.task = null;
      logger.info('[SalesInvoiceJob] Stopped');
    }
  }
}

export default SalesInvoiceJob;
