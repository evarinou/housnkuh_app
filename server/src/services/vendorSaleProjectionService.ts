/**
 * @file vendorSaleProjectionService.ts
 * @purpose Projiziert flour.io-Verkaufsbelege (FlourioDocument) in den abrechenbaren
 *          VendorSale-Ledger — je Belegposition eine vendor-zugeordnete Zeile.
 * @created 2026-07-06
 *
 * Insert-only & idempotent: bestehende Ledger-Zeilen (inkl. ihrer Abrechnungs-
 * Zustände) werden NIE überschrieben ($setOnInsert + Unique-Index). Ein erneuter
 * Lauf über denselben Beleg ist damit folgenlos. Fundament für F2a/F2c/F3.
 */

import { FlourioDocument, IFlourioDocumentItem } from '../models/FlourioDocument';
import { Product } from '../models/Product';
import { VendorSale } from '../models/VendorSale';
import logger from '../utils/logger';

// Welche flour.io-Belegtypen sind echte Endkunden-Verkäufe?
// ✅ 2026-07-08 gegen die Live-API verifiziert: Kassenbon/Rechnung = 'R';
// 'Belegabbruch' sind abgebrochene Belege. Stornos laufen über isVoided.
const BILLABLE_DOCUMENT_TYPES = ['R'];

export interface ProjectionResult {
  documents: number;      // betrachtete Belege
  processedLines: number; // betrachtete Positionen
  created: number;        // neu in den Ledger geschrieben
  skippedNoVendor: number;// Positionen ohne auflösbaren Vendor (unzugeordnet!)
  durationMs: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class VendorSaleProjectionService {
  /**
   * Projiziert Verkaufsbelege in den VendorSale-Ledger.
   * @param options.since Nur Belege mit updatedAt >= since (Inkrement; ohne =
   *        Vollprojektion/Backfill). Dank Idempotenz ist Überschneidung harmlos.
   */
  static async project(options?: { since?: Date }): Promise<ProjectionResult> {
    const start = Date.now();
    const query: Record<string, unknown> = {
      type: { $in: BILLABLE_DOCUMENT_TYPES },
      // Stornierte Belege und Gutschriften sind keine abrechenbaren Verkäufe
      isVoided: { $ne: true },
      credit: { $ne: true }
    };
    if (options?.since) query.updatedAt = { $gte: options.since };

    const docs = await FlourioDocument.find(query)
      .select('flourioId date currency items')
      .lean();

    // Vendor-Auflösung auf Zeilenebene: item.productId → Product.vendorId
    const productIds = Array.from(new Set(
      docs.flatMap(d => (d.items || [])
        .map((i: IFlourioDocumentItem) => i.productId)
        .filter(Boolean)
        .map((id: any) => String(id)))
    ));
    const products = await Product.find({ _id: { $in: productIds } })
      .select('_id vendorId')
      .lean();
    const productToVendor = new Map<string, any>(
      products.map((p: any) => [String(p._id), p.vendorId])
    );

    let processedLines = 0;
    let skippedNoVendor = 0;
    const ops: any[] = [];

    for (const doc of docs) {
      (doc.items || []).forEach((item: IFlourioDocumentItem, lineIndex: number) => {
        processedLines++;
        // Stornierte Einzelpositionen überspringen
        if (item.cancelled) { return; }
        const vendorId = item.productId
          ? productToVendor.get(String(item.productId))
          : undefined;
        if (!vendorId) { skippedNoVendor++; return; }

        // Keine Netto/Brutto-Annahme mehr nötig: flour.io liefert beide Werte
        // getrennt (item.totalExVat/totalIncVat → netTotal/grossTotal).
        const netAmount = item.netTotal;
        const grossAmount = item.grossTotal ?? round2(netAmount * (1 + (item.taxRate || 0) / 100));

        ops.push({
          updateOne: {
            filter: { flourioDocument: doc._id, lineIndex },
            update: {
              $setOnInsert: {
                vendorId,
                flourioDocument: doc._id,
                flourioDocumentFlourioId: doc.flourioId,
                lineIndex,
                productId: item.productId,
                flourioArticleId: item.flourioArticleId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                discount: item.discount || 0,
                netAmount,
                grossAmount,
                saleDate: doc.date,
                currency: doc.currency || 'EUR'
              }
            },
            upsert: true
          }
        });
      });
    }

    let created = 0;
    if (ops.length > 0) {
      try {
        const res = await VendorSale.bulkWrite(ops, { ordered: false });
        created = res.upsertedCount || 0;
      } catch (err: any) {
        // Duplicate-Key (11000) ist bei paralleler Projektion erwartbar und
        // harmlos (Zeile existiert bereits). Alles andere weiterreichen.
        if (err?.code !== 11000 && !(err?.writeErrors?.every((e: any) => e.code === 11000))) {
          throw err;
        }
        created = err?.result?.nUpserted ?? err?.result?.result?.nUpserted ?? 0;
      }
    }

    if (skippedNoVendor > 0) {
      logger.warn('[VendorSaleProjection] Positionen ohne auflösbaren Vendor übersprungen', {
        skippedNoVendor
      });
    }

    return {
      documents: docs.length,
      processedLines,
      created,
      skippedNoVendor,
      durationMs: Date.now() - start
    };
  }
}

export default VendorSaleProjectionService;
