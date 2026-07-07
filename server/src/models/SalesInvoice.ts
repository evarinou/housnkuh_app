/**
 * @file SalesInvoice.ts
 * @purpose Verkaufsrechnung im Namen eines Vendors (F2a, Gutschriftsverfahren).
 *          Getrennt vom housnkuh-eigenen Invoice-Modell (housnkuh→Vendor).
 * @created 2026-07-07
 *
 * Aussteller ist der Vendor, Empfänger sind Endkunden. Aus dem VendorSale-Ledger
 * aggregiert. Steuerdaten des Vendors werden zum Ausstellungszeitpunkt EINGEFROREN
 * (vendorTaxSnapshot) — eine spätere Profiländerung darf ausgestellte Belege nicht
 * verändern. Nummernkreis pro Vendor fortlaufend (§14 UStG).
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesInvoiceItem {
  vendorSale: mongoose.Types.ObjectId; // Herkunft im Ledger (Rückverfolgbarkeit)
  productId?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  netAmount: number;
  grossAmount: number;
  saleDate: Date;
}

export interface ISalesInvoiceTaxLine {
  rate: number; // USt-Satz in %
  net: number;
  tax: number;
}

export interface ISalesInvoice extends Document {
  vendor: mongoose.Types.ObjectId;
  invoiceNumber: string; // pro Vendor fortlaufend, z. B. VK-2026-00001
  issueDate: Date;
  salePeriod: { from: Date; to: Date };

  items: ISalesInvoiceItem[];

  // Eingefrorene Steuerdaten des Vendors zum Ausstellungszeitpunkt
  vendorTaxSnapshot: {
    steuerstatus: 'kleinunternehmer' | 'regelbesteuert';
    steuernummer?: string;
    ustIdNr?: string;
  };

  netTotal: number;
  taxTotal: number; // 0 bei Kleinunternehmer
  grossTotal: number;
  taxBreakdown: ISalesInvoiceTaxLine[]; // je USt-Satz (leer bei Kleinunternehmer)
  currency: string;

  status: 'created' | 'sent' | 'cancelled';
  pdfPath?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SalesInvoiceItemSchema = new Schema<ISalesInvoiceItem>({
  vendorSale: { type: Schema.Types.ObjectId, ref: 'VendorSale', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  grossAmount: { type: Number, required: true },
  saleDate: { type: Date, required: true }
}, { _id: false });

const SalesInvoiceSchema = new Schema<ISalesInvoice>({
  vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true },
  issueDate: { type: Date, required: true },
  salePeriod: {
    from: { type: Date, required: true },
    to: { type: Date, required: true }
  },
  items: { type: [SalesInvoiceItemSchema], required: true },
  vendorTaxSnapshot: {
    steuerstatus: { type: String, enum: ['kleinunternehmer', 'regelbesteuert'], required: true },
    steuernummer: { type: String },
    ustIdNr: { type: String }
  },
  netTotal: { type: Number, required: true },
  taxTotal: { type: Number, required: true },
  grossTotal: { type: Number, required: true },
  taxBreakdown: [{
    rate: { type: Number, required: true },
    net: { type: Number, required: true },
    tax: { type: Number, required: true },
    _id: false
  }],
  currency: { type: String, default: 'EUR' },
  status: { type: String, enum: ['created', 'sent', 'cancelled'], default: 'created', required: true },
  pdfPath: { type: String }
}, { timestamps: true });

// Nummernkreis ist pro Vendor eindeutig (nicht global).
SalesInvoiceSchema.index({ vendor: 1, invoiceNumber: 1 }, { unique: true });
SalesInvoiceSchema.index({ vendor: 1, status: 1, issueDate: -1 });

export const SalesInvoice = mongoose.model<ISalesInvoice>('SalesInvoice', SalesInvoiceSchema);
export default SalesInvoice;
