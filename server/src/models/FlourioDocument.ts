/**
 * @file FlourioDocument.ts
 * @purpose MongoDB model for documents pulled from Flourio (invoices, orders, deliveries, quotes)
 * @created 2026-03-31
 */

import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IFlourioDocumentItem {
  flourioArticleId: string;
  productId?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
  total: number;
}

export interface IFlourioDocument extends MongoDocument {
  flourioId: string;
  type: 'invoice' | 'order' | 'delivery' | 'quote';
  number: string;
  date: Date;
  dueDate?: Date;
  flourioBusinessPartnerId: string;
  vendorId?: mongoose.Types.ObjectId;
  items: IFlourioDocumentItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
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
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  discount: { type: Number },
  total: { type: Number, required: true }
}, { _id: false });

const FlourioDocumentSchema = new Schema({
  flourioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['invoice', 'order', 'delivery', 'quote']
  },
  number: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  dueDate: { type: Date },
  flourioBusinessPartnerId: {
    type: String,
    required: true,
    index: true
  },
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  items: [FlourioDocumentItemSchema],
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, required: true },
  total: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'paid', 'cancelled']
  },
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
