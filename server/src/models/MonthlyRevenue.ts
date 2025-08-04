/**
 * @file Monthly Revenue model for the housnkuh marketplace application
 * @description Revenue tracking and analytics model with detailed per-Mietfach breakdown
 * Supports both actual revenue calculation and projections
 */

import mongoose, { Schema } from 'mongoose';
import { IMonthlyRevenue } from '../types/modelTypes';

/**
 * Mietfach revenue schema for detailed revenue breakdown
 * @description Tracks revenue per individual Mietfach including contract counts
 */
const MietfachRevenueSchema = new Schema({
  mietfachId: {
    type: Schema.Types.ObjectId,
    ref: 'Mietfach',
    required: true
  },
  mietfachNummer: {
    type: String,
    required: true
  },
  einnahmen: {
    type: Number,
    required: true,
    min: 0
  },
  anzahlVertraege: {
    type: Number,
    required: true,
    min: 0
  },
  anzahlProbemonatVertraege: {
    type: Number,
    required: true,
    min: 0
  }
});

/**
 * Monthly revenue schema for comprehensive revenue tracking
 * @description Aggregates monthly revenue data with detailed breakdowns per Mietfach
 */
const MonthlyRevenueSchema = new Schema({
  monat: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  gesamteinnahmen: {
    type: Number,
    required: true,
    min: 0
  },
  anzahlAktiveVertraege: {
    type: Number,
    required: true,
    min: 0
  },
  anzahlProbemonatVertraege: {
    type: Number,
    required: true,
    min: 0
  },
  einnahmenProMietfach: [MietfachRevenueSchema],
  erstelltAm: {
    type: Date,
    default: Date.now
  },
  aktualisiertAm: {
    type: Date,
    default: Date.now
  },
  isProjection: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

/**
 * Pre-save middleware to update aktualisiertAm timestamp
 * @description Automatically updates the modification timestamp on save
 */
MonthlyRevenueSchema.pre('save', function(next) {
  this.aktualisiertAm = new Date();
  next();
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for revenue queries
 */
MonthlyRevenueSchema.index({ monat: 1 });
MonthlyRevenueSchema.index({ erstelltAm: 1 });

/**
 * MonthlyRevenue model export
 * @description Exports the MonthlyRevenue model with detailed revenue tracking capabilities
 */
export default mongoose.model<IMonthlyRevenue>('MonthlyRevenue', MonthlyRevenueSchema);