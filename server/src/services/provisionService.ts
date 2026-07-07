/**
 * @file provisionService.ts
 * @purpose Claim-first-Provisionsermittlung für den Monatslauf (F2c).
 * @created 2026-07-07
 *
 * Symmetrisch zu F2a: reserviert die noch nicht provisionierten VendorSale-Zeilen
 * atomar für die (vorab allozierte) Monatsrechnung, BEVOR diese gebaut wird. Jeder
 * Verkauf wird so in genau einem Provisionslauf gezählt. Schlägt die
 * Rechnungserstellung fehl, löst `releaseClaim` die Reservierung wieder.
 * Bemessung: Netto-Umsatz (VendorSale.netAmount) × Provisionssatz.
 */

import mongoose from 'mongoose';
import { VendorSale } from '../models/VendorSale';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class ProvisionService {
  /**
   * Reserviert alle offenen Verkäufe eines Vendors für die gegebene Rechnung und
   * liefert die Netto-Bemessungsgrundlage.
   */
  static async claimForInvoice(
    vendorId: mongoose.Types.ObjectId | string,
    invoiceId: mongoose.Types.ObjectId,
    period: string
  ): Promise<{ base: number; count: number }> {
    const now = new Date();
    const claim = await VendorSale.updateMany(
      { vendorId, provisionInvoice: null },
      { $set: { provisionInvoice: invoiceId, provisionPeriod: period, provisionSettledAt: now } }
    );
    if (!claim.modifiedCount) return { base: 0, count: 0 };

    const claimed = await VendorSale.find({ provisionInvoice: invoiceId }).select('netAmount').lean();
    const base = round2(claimed.reduce((sum: number, r: any) => sum + r.netAmount, 0));
    return { base, count: claimed.length };
  }

  /** Löst die Reservierung wieder (Rollback, wenn die Rechnung nicht zustande kommt). */
  static async releaseClaim(invoiceId: mongoose.Types.ObjectId): Promise<void> {
    await VendorSale.updateMany(
      { provisionInvoice: invoiceId },
      { $set: { provisionInvoice: null, provisionPeriod: null, provisionSettledAt: null } }
    );
  }
}

export default ProvisionService;
