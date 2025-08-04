/**
 * @file Mietfach (Rental Unit) model for the housnkuh marketplace application
 * @description Comprehensive rental unit model with availability checking, caching, and location features
 * Mietfach represents rentable spaces/units that vendors can book for their products
 */

import mongoose, { Schema } from 'mongoose';
import { IMietfach, MietfachTyp } from '../types/modelTypes';
import { queryCache } from '../utils/queryCache';

/**
 * Mietfach schema for rental units
 * @description Defines structure for rental units with availability tracking and features
 */
const MietfachSchema = new Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  typ: {
    type: String,
    required: true,
    enum: Object.values(MietfachTyp)
  },
  beschreibung: {
    type: String,
    trim: true
  },
  groesse: {
    flaeche: {
      type: Number,
      default: 1
    },
    einheit: {
      type: String,
      default: 'm²'
    }
  },
  verfuegbar: {
    type: Boolean,
    default: true
  },
  aktuellerVertrag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vertrag'
  },
  zugewiesenAn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  standort: {
    type: String,
    trim: true
  },
  features: {
    type: [String],
    default: []
  },
  // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Manual creation tracking
  creationSource: {
    type: String,
    enum: ['manual', 'import', 'seed'],
    default: 'manual'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

/**
 * Instance method to check if Mietfach is available for a specific period
 * @description Checks for overlapping contracts to determine availability
 * @param startDate - Start date of the period to check
 * @param endDate - Optional end date of the period (if not provided, checks single point in time)
 * @returns Promise<boolean> - True if available, false if occupied
 * @complexity O(log n) - Database query with indexed fields
 */
MietfachSchema.methods.isAvailableForPeriod = async function(startDate: Date, endDate?: Date): Promise<boolean> {
  const Vertrag = mongoose.model('Vertrag');
  
  let overlappingContracts;
  
  if (!endDate) {
    // When checking for a single point in time, find contracts that contain this date
    overlappingContracts = await Vertrag.find({
      'services.mietfach': this._id,
      status: { $in: ['active', 'scheduled', 'pending'] },
      'availabilityImpact.from': { $lte: startDate },
      'availabilityImpact.to': { $gt: startDate }
    });
  } else {
    // When checking for a period, find any overlapping contracts
    overlappingContracts = await Vertrag.find({
      'services.mietfach': this._id,
      status: { $in: ['active', 'scheduled', 'pending'] },
      $or: [
        {
          // Contract starts before our end date and ends after our start date
          'availabilityImpact.from': { $lt: endDate },
          'availabilityImpact.to': { $gt: startDate }
        }
      ]
    });
  }
  
  return overlappingContracts.length === 0;
};

/**
 * Static method to find all available Mietfächer for a period with caching optimization
 * @description Finds all available rental units for a given period using optimized queries and caching
 * @param startDate - Start date of the period to check
 * @param endDate - Optional end date of the period
 * @returns Promise<IMietfach[]> - Array of available Mietfächer
 * @complexity O(n log n) - Optimized with indexes and caching
 */
MietfachSchema.statics.findAvailableForPeriod = async function(startDate: Date, endDate?: Date) {
  // Create cache key
  const cacheKey = {
    startDate: startDate.toISOString(),
    endDate: endDate?.toISOString() || null
  };
  
  // Try cache first
  const cached = await queryCache.get('mietfach:availability', cacheKey);
  if (cached) {
    return cached;
  }
  
  const Vertrag = mongoose.model('Vertrag');
  
  // Build query for overlapping contracts
  let dateQuery;
  if (!endDate) {
    // Single point in time
    dateQuery = {
      'availabilityImpact.from': { $lte: startDate },
      'availabilityImpact.to': { $gt: startDate }
    };
  } else {
    // Time period overlap
    dateQuery = {
      'availabilityImpact.from': { $lt: endDate },
      'availabilityImpact.to': { $gt: startDate }
    };
  }
  
  // Find all Mietfächer with overlapping contracts in one query
  const occupiedMietfaecherIds = await Vertrag.distinct('services.mietfach', {
    status: { $in: ['active', 'scheduled', 'pending'] },
    ...dateQuery
  });
  
  // Find available Mietfächer using $nin for efficiency
  const result = await this.find({
    verfuegbar: true,
    _id: { $nin: occupiedMietfaecherIds }
  });
  
  // Cache result for 5 minutes
  await queryCache.set('mietfach:availability', cacheKey, result, 300);
  
  return result;
};

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for common query patterns
 */
MietfachSchema.index({ verfuegbar: 1 });
MietfachSchema.index({ typ: 1, verfuegbar: 1 });
// Compound index optimized for availability queries
MietfachSchema.index({ verfuegbar: 1, _id: 1 });
// Index for standort-based queries
MietfachSchema.index({ standort: 1, verfuegbar: 1 });

/**
 * Mietfach model export
 * @description Exports the Mietfach model with availability checking and caching features
 */
export default mongoose.model<IMietfach>('Mietfach', MietfachSchema);