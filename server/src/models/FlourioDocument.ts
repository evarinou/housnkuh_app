/**
 * @file FlourioDocument.ts
 * @purpose MongoDB model for documents pulled from Flourio (invoices, orders, deliveries, quotes)
 * @created 2026-03-31
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IFlourioDocumentItem {
  flourioArticleId: string;       // flour.io item.ref (article._id)
  productId?: mongoose.Types.ObjectId;
  title?: string;
  quantity: number;               // flour.io item.amount
  unitPrice: number;              // flour.io item.price (gemäß taxType)
  taxRate: number;
  discount?: number;
  netTotal: number;               // flour.io item.totalExVat
  grossTotal: number;             // flour.io item.totalIncVat
  cancelled?: boolean;
}

export interface IFlourioDocument extends MongoDocument {
  flourioId: string;              // flour.io doc._id
  type: string;                   // echter Vertrag: 'R', 'Belegabbruch', … (kein Enum)
  number: string;
  date: Date;
  flourioBusinessPartnerId?: string; // flour.io doc.businesspartner (= Endkunde)
  vendorId?: mongoose.Types.ObjectId;
  items: IFlourioDocumentItem[];
  netTotal: number;               // flour.io totalExVat
  grossTotal: number;             // flour.io totalIncVat
  currency: string;
  status?: string;
  paymentStatus?: string;
  isVoided: boolean;              // storniert (flour.io isVoided/isVoid)
  credit: boolean;                // Gutschrift
  notes?: string;
  lastPulledAt: Date;
  flourioCreatedAt: Date;
  flourioUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlourioDocumentItemSchema = new Schema({
  flourioArticleId: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  title: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  discount: { type: Number },
  netTotal: { type: Number, required: true },
  grossTotal: { type: Number, required: true },
  cancelled: { type: Boolean, default: false }
}, { _id: false });

const FlourioDocumentSchema = new Schema({
  flourioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Echter flour.io-Vertrag (2026-07-08): 'R', 'Belegabbruch', … — bewusst kein Enum
  type: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Endkunde; kann bei anonymen Kassenbons fehlen
  flourioBusinessPartnerId: {
    type: String,
    index: true
  },
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  items: [FlourioDocumentItemSchema],
  netTotal: { type: Number, required: true },
  grossTotal: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  status: { type: String },
  paymentStatus: { type: String },
  isVoided: { type: Boolean, default: false },
  credit: { type: Boolean, default: false },
  notes: { type: String },
  lastPulledAt: { type: Date, required: true },
  flourioCreatedAt: { type: Date, required: true },
  flourioUpdatedAt: { type: Date, required: true }
}, {
  timestamps: true
});

FlourioDocumentSchema.index({ vendorId: 1, type: 1 });
FlourioDocumentSchema.index({ date: -1 });
FlourioDocumentSchema.index({ type: 1, status: 1 });

export const FlourioDocument = mongoose.model<IFlourioDocument>('FlourioDocument', FlourioDocumentSchema);
