/**
 * @file FAQ model for the housnkuh marketplace application
 * @description Frequently Asked Questions model with categorization and search functionality
 * Supports keyword-based search and ordering within categories
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for FAQ document
 * @description Defines structure for FAQ entries with categorization and keyword support
 */
export interface IFAQ extends Document {
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FAQ schema for frequently asked questions
 * @description Manages FAQ entries with categories, keywords, and ordering
 */
const FAQSchema: Schema = new Schema({
  category: {
    type: String,
    required: [true, 'Kategorie ist erforderlich'],
    enum: ['Allgemein', 'Registrierung', 'Buchungen', 'Zahlungen', 'Produkte', 'Support'],
    default: 'Allgemein'
  },
  question: {
    type: String,
    required: [true, 'Frage ist erforderlich'],
    trim: true,
    maxLength: [500, 'Frage darf maximal 500 Zeichen lang sein']
  },
  answer: {
    type: String,
    required: [true, 'Antwort ist erforderlich'],
    trim: true,
    maxLength: [5000, 'Antwort darf maximal 5000 Zeichen lang sein']
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for FAQ queries
 */
FAQSchema.index({ category: 1, order: 1 });
FAQSchema.index({ keywords: 1 });
FAQSchema.index({ isActive: 1 });

/**
 * FAQ model export
 * @description Exports the FAQ model with categorization and keyword search support
 */
export default mongoose.model<IFAQ>('FAQ', FAQSchema);