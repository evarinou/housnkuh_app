/**
 * @file VendorSale.ts
 * @purpose Abrechenbarer Verkaufs-Ledger: je Belegposition (aus FlourioDocument)
 *          ein normalisierter, dem Vendor zugeordneter Verkaufsdatensatz mit zwei
 *          unabhängigen Abrechnungs-Zuständen (Verkaufsrechnung F2a / Provision F2c).
 * @created 2026-07-06
 *
 * Fundament für die Vendor-Abrechnung (siehe FEATURES.md F2a/F2c/F3). Bewusst als
 * EIGENE Collection statt Flags auf FlourioDocument: FlourioDocument wird vom
 * 15-Min-Sync geupsertet und darf keinen geschäftskritischen Abrechnungs-Zustand
 * tragen. Idempotenz über den Unique-Index (flourioDocument, lineIndex).
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IVendorSale extends Document {
  vendorId: mongoose.Types.ObjectId;

  // Herkunft (Rückverfolgbarkeit zum flour.io-Beleg)
  flourioDocument: mongoose.Types.ObjectId; // lokale FlourioDocument._id
  flourioDocumentFlourioId: string;
  lineIndex: number; // Position innerhalb des Belegs (0-basiert)

  // Artikel/Produkt
  productId?: mongoose.Types.ObjectId;
  flourioArticleId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;

  // Beträge. ✅ 2026-07-08 gegen die Live-API verifiziert: flour.io liefert
  // Netto und Brutto GETRENNT (item.totalExVat/totalIncVat) — keine Annahme
  // mehr nötig, beide Werte kommen exakt aus dem Beleg.
  netAmount: number;   // Netto-Zeilenbetrag (Basis für Provision F2c, netto)
  grossAmount: number; // Brutto-Zeilenbetrag (aus totalIncVat)

  saleDate: Date;
  currency: string;

  // Abrechnungs-Zustand 1 — Verkaufsrechnung (F2a, Gutschriftsverfahren)
  salesInvoice?: mongoose.Types.ObjectId | null;
  salesInvoicedAt?: Date | null;

  // Abrechnungs-Zustand 2 — Provision im Monatslauf (F2c), unabhängig von Zustand 1.
  // provisionInvoice = die housnkuh-Monatsrechnung, in deren Provisionsposition dieser
  // Verkauf eingerechnet wurde (eindeutiger Claim-Marker, symmetrisch zu salesInvoice).
  provisionInvoice?: mongoose.Types.ObjectId | null;
  provisionPeriod?: string | null; // 'YYYY-MM' des Provisionslaufs (Label/Reporting)
  provisionSettledAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const VendorSaleSchema = new Schema<IVendorSale>({
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  flourioDocument: { type: Schema.Types.ObjectId, ref: 'FlourioDocument', required: true },
  flourioDocumentFlourioId: { type: String, required: true },
  lineIndex: { type: Number, required: true },

  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  flourioArticleId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  discount: { type: Number, default: 0 },

  netAmount: { type: Number, required: true },
  grossAmount: { type: Number, required: true },

  saleDate: { type: Date, required: true },
  currency: { type: String, default: 'EUR' },

  salesInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  salesInvoicedAt: { type: Date, default: null },

  provisionInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  provisionPeriod: { type: String, default: null },
  provisionSettledAt: { type: Date, default: null }
}, { timestamps: true });

// Idempotenz: jede Belegposition genau einmal im Ledger.
VendorSaleSchema.index({ flourioDocument: 1, lineIndex: 1 }, { unique: true });
// F2a: noch nicht in eine Verkaufsrechnung übernommene Positionen je Vendor.
VendorSaleSchema.index({ vendorId: 1, salesInvoice: 1, saleDate: 1 });
// F2c: noch nicht provisionierte Zeilen je Vendor.
VendorSaleSchema.index({ vendorId: 1, provisionInvoice: 1, saleDate: 1 });

export const VendorSale = mongoose.model<IVendorSale>('VendorSale', VendorSaleSchema);
export default VendorSale;
