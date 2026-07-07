/**
 * @file salesInvoiceService.ts
 * @purpose Erzeugt Vendor-Verkaufsrechnungen (F2a) aus dem VendorSale-Ledger.
 * @created 2026-07-07
 *
 * Kern-Garantie „jeder Verkauf genau einmal" über **claim-first**: die noch nicht
 * abgerechneten Ledger-Zeilen werden per atomarem updateMany({salesInvoice:null})
 * für eine neue Rechnung reserviert, BEVOR die Rechnung gebaut wird. Ein Verkauf
 * kann so nur ein einziges Mal beansprucht werden (auch bei parallelen Läufen);
 * schlägt der Aufbau fehl, wird der Claim zurückgerollt.
 */

import mongoose from 'mongoose';
import { VendorSale } from '../models/VendorSale';
import { SalesInvoice, ISalesInvoiceItem, ISalesInvoiceTaxLine } from '../models/SalesInvoice';
import { Product } from '../models/Product';
import User from '../models/User';
import Counter from '../models/Counter';
import logger from '../utils/logger';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class SalesInvoiceService {
  /**
   * Erzeugt für einen Vendor eine Verkaufsrechnung aus allen noch nicht
   * abgerechneten Ledger-Zeilen. Gibt null zurück, wenn nichts abzurechnen ist.
   */
  static async generateForVendor(
    vendorId: mongoose.Types.ObjectId | string
  ): Promise<mongoose.Document | null> {
    const invoiceId = new mongoose.Types.ObjectId();
    const now = new Date();

    // 1. Claim: noch nicht abgerechnete Zeilen atomar für DIESE Rechnung reservieren.
    const claim = await VendorSale.updateMany(
      { vendorId, salesInvoice: null },
      { $set: { salesInvoice: invoiceId, salesInvoicedAt: now } }
    );
    if (!claim.modifiedCount) return null; // nichts abzurechnen

    try {
      const sales = await VendorSale.find({ salesInvoice: invoiceId }).lean();

      // Produktnamen für die Positionsbeschreibung
      const productIds = sales.map(s => s.productId).filter(Boolean);
      const products = await Product.find({ _id: { $in: productIds } })
        .select('_id name').lean();
      const nameById = new Map<string, string>(
        products.map((p: any) => [String(p._id), p.name])
      );

      // Eingefrorener Steuer-Snapshot des Vendors
      const vendor: any = await User.findById(vendorId)
        .select('vendorProfile.steuerstatus vendorProfile.steuernummer vendorProfile.ustIdNr')
        .lean();
      const steuerstatus: 'kleinunternehmer' | 'regelbesteuert' =
        vendor?.vendorProfile?.steuerstatus || 'kleinunternehmer';
      const vendorTaxSnapshot = {
        steuerstatus,
        steuernummer: vendor?.vendorProfile?.steuernummer,
        ustIdNr: vendor?.vendorProfile?.ustIdNr
      };

      // Positionen
      const items: ISalesInvoiceItem[] = sales.map((s: any) => ({
        vendorSale: s._id,
        productId: s.productId,
        description: (s.productId && nameById.get(String(s.productId))) || s.flourioArticleId,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        taxRate: s.taxRate,
        netAmount: s.netAmount,
        grossAmount: s.grossAmount,
        saleDate: s.saleDate
      }));

      // Summen + USt je Steuerstatus
      const netTotal = round2(items.reduce((sum, i) => sum + i.netAmount, 0));
      let taxBreakdown: ISalesInvoiceTaxLine[] = [];
      let taxTotal = 0;
      let grossTotal: number;

      if (steuerstatus === 'regelbesteuert') {
        const byRate = new Map<number, number>();
        for (const i of items) {
          byRate.set(i.taxRate, (byRate.get(i.taxRate) || 0) + i.netAmount);
        }
        taxBreakdown = Array.from(byRate.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([rate, net]) => {
            const netR = round2(net);
            const tax = round2(netR * rate / 100);
            return { rate, net: netR, tax };
          });
        taxTotal = round2(taxBreakdown.reduce((sum, t) => sum + t.tax, 0));
        grossTotal = round2(netTotal + taxTotal);
      } else {
        // Kleinunternehmer §19: keine USt ausweisen
        taxTotal = 0;
        grossTotal = netTotal;
      }

      // Abrechnungszeitraum = Spanne der enthaltenen Verkäufe
      const times = sales.map((s: any) => new Date(s.saleDate).getTime());
      const salePeriod = { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) };

      // Pro Vendor fortlaufender Nummernkreis
      const seq = await Counter.getNext(`salesinvoice:${vendorId}`);
      const invoiceNumber = `VK-${now.getFullYear()}-${String(seq).padStart(5, '0')}`;

      const invoice = await SalesInvoice.create({
        _id: invoiceId,
        vendor: vendorId,
        invoiceNumber,
        issueDate: now,
        salePeriod,
        items,
        vendorTaxSnapshot,
        netTotal,
        taxTotal,
        grossTotal,
        taxBreakdown,
        currency: (sales[0] as any)?.currency || 'EUR'
      });

      return invoice;
    } catch (err) {
      // Rollback: Claim lösen, damit die Verkäufe im nächsten Lauf erneut drankommen.
      await VendorSale.updateMany(
        { salesInvoice: invoiceId },
        { $set: { salesInvoice: null, salesInvoicedAt: null } }
      );
      throw err;
    }
  }

  /**
   * Erzeugt Verkaufsrechnungen für alle Vendors mit offenen Verkäufen.
   * Fehler werden pro Vendor isoliert (ein Vendor blockiert nicht die anderen).
   */
  static async generateAll(): Promise<{ created: number; vendors: number; errors: number }> {
    const vendorIds = await VendorSale.distinct('vendorId', { salesInvoice: null });
    let created = 0;
    let errors = 0;
    for (const vendorId of vendorIds) {
      try {
        const invoice = await SalesInvoiceService.generateForVendor(vendorId);
        if (invoice) created++;
      } catch (err: any) {
        errors++;
        logger.error('[SalesInvoiceService] Rechnung fehlgeschlagen', {
          vendorId: String(vendorId),
          error: err.message
        });
      }
    }
    return { created, vendors: vendorIds.length, errors };
  }
}

export default SalesInvoiceService;
