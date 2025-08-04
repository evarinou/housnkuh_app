/**
 * @file Contract (Vertrag) model for the housnkuh marketplace application
 * @description Comprehensive contract model supporting trial periods, additional services (Zusatzleistungen),
 * and flexible scheduling with cache invalidation
 */

import mongoose, { Schema } from 'mongoose';
import { CacheInvalidator } from '../utils/queryCache';
import { IVertrag } from '../types/modelTypes';

/**
 * Pricing constants for additional services (Zusatzleistungen)
 * @description Fixed pricing for storage and shipping services
 */
export const ZUSATZLEISTUNGEN_PREISE = {
  lagerservice: 20.00,    // Storage service - €20/month
  versandservice: 5.00    // Shipping service - €5/month
};

/**
 * Service schema for contract services
 * @description Defines individual services within a contract (e.g., Mietfach rental)
 */
const ServiceSchema = new Schema({
  mietfach: { type: Schema.Types.ObjectId, ref: 'Mietfach', required: true },
  mietbeginn: { type: Date, required: true },
  mietende: { type: Date },
  monatspreis: { type: Number, required: true }
});

/**
 * Main contract schema
 * @description Comprehensive contract model with trial periods, additional services, and scheduling support
 */
const VertragSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  datum: { type: Date, default: Date.now },
  services: [ServiceSchema],
  packageConfiguration: { type: Schema.Types.Mixed },
  totalMonthlyPrice: { type: Number, required: true, default: 0 },
  contractDuration: { type: Number, required: true, default: 1 }, // in Monaten
  discount: { type: Number, default: 0 }, // Rabatt als Dezimalwert (0.1 = 10%)
  provisionssatz: { type: Number, enum: [4, 7], required: true }, // Provision für Verkäufe
  status: {
    type: String,
    enum: ['active', 'pending', 'cancelled', 'expired', 'scheduled'],
    default: 'pending',
    required: true
  },
  // Scheduling fields for flexible start dates
  scheduledStartDate: { type: Date, required: true },
  actualStartDate: { type: Date },
  availabilityImpact: {
    from: { type: Date },
    to: { type: Date }
  },
  // Trial period fields
  istProbemonatBuchung: {
    type: Boolean,
    default: false,
    required: true
  },
  probemonatUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function(this: any) { return this.istProbemonatBuchung; }
  },
  zahlungspflichtigAb: {
    type: Date,
    required: true
  },
  gekuendigtInProbemonat: {
    type: Boolean,
    default: false
  },
  probemonatKuendigungsdatum: {
    type: Date,
    required: function(this: any) { return this.gekuendigtInProbemonat; }
  },
  // Zusatzleistungen for premium services
  zusatzleistungen: {
    lagerservice: {
      type: Boolean,
      default: false
    },
    versandservice: {
      type: Boolean,
      default: false
    },
    lagerservice_bestätigt: {
      type: Date,
      default: null
    },
    versandservice_aktiv: {
      type: Boolean,
      default: false
    }
  },
  // Zusatzleistungen pricing
  zusatzleistungen_kosten: {
    lagerservice_monatlich: {
      type: Number,
      default: 20
    },
    versandservice_monatlich: {
      type: Number,
      default: 5
    }
  }
}, { timestamps: true });

/**
 * Virtual field for total contract price including additional services
 * @description Calculates total price including base services and Zusatzleistungen
 * @returns {number} Total contract price with discounts and additional services
 * @complexity O(1) - Simple price calculation
 */
VertragSchema.virtual('gesamtpreis').get(function(this: any) {
  let basePrice = this.totalMonthlyPrice * this.contractDuration;
  
  // Add zusatzleistungen monthly fees using values from contract
  if (this.zusatzleistungen?.lagerservice) {
    const lagerKosten = this.zusatzleistungen_kosten?.lagerservice_monatlich || ZUSATZLEISTUNGEN_PREISE.lagerservice;
    basePrice += lagerKosten * this.contractDuration;
  }
  if (this.zusatzleistungen?.versandservice) {
    const versandKosten = this.zusatzleistungen_kosten?.versandservice_monatlich || ZUSATZLEISTUNGEN_PREISE.versandservice;
    basePrice += versandKosten * this.contractDuration;
  }
  
  // Apply existing discount logic
  if (this.discount > 0) {
    return basePrice * (1 - this.discount);
  }
  return basePrice;
});
/**
 * Validation method for additional services (Zusatzleistungen)
 * @description Validates that additional services are only booked with a Mietfach
 * @throws {Error} If additional services are booked without a Mietfach
 * @complexity O(1) - Simple validation check
 */
VertragSchema.methods.validateZusatzleistungen = function(this: any) {
                            // Zusatzleistungen require a Mietfach (at least one service)
                            if ((this.zusatzleistungen?.lagerservice || this.zusatzleistungen?.versandservice) 
                                && (!this.services || this.services.length === 0)) {
                              throw new Error('Zusatzleistungen können nur mit einem gebuchten Mietfach gebucht werden');
                            }
                            
                            // Note: Premium model validation would be added here when provisionssatz is implemented
                            // For now, we allow zusatzleistungen for all contracts
                          };
/**
 * Pre-save middleware to calculate availability impact and validate additional services
 * @description Calculates contract duration and availability impact, validates Zusatzleistungen
 * @complexity O(1) - Date calculations and validation
 */
VertragSchema.pre('save', function(next) {
  try {
    // Validate zusatzleistungen
    (this as any).validateZusatzleistungen();
  } catch (error) {
    return next(error as Error);
  }
  
  if (this.scheduledStartDate && this.contractDuration) {
    // Calculate the end date
    const endDate = new Date(this.scheduledStartDate);
    
    if (this.istProbemonatBuchung) {
      // For trial bookings: contract duration + 1 month trial period
      // Total duration = trial month + paid months
      endDate.setMonth(endDate.getMonth() + this.contractDuration + 1);
    } else {
      // For regular contracts: just the contract duration
      endDate.setMonth(endDate.getMonth() + this.contractDuration);
    }
    
    // Set availability impact
    this.availabilityImpact = {
      from: this.scheduledStartDate,
      to: endDate
    };
  }
  next();
});

/**
 * Post-save middleware to invalidate cache when contract is modified
 * @description Triggers cache invalidation for contract-related queries
 */
VertragSchema.post('save', async function() {
  await CacheInvalidator.onContractChange();
});

/**
 * Post-delete middleware to invalidate cache when contract is deleted
 * @description Triggers cache invalidation for contract-related queries
 */
VertragSchema.post('deleteOne', async function() {
  await CacheInvalidator.onContractChange();
});

/**
 * Post-update middleware to invalidate cache when contract is updated
 * @description Triggers cache invalidation for contract-related queries
 */
VertragSchema.post('findOneAndUpdate', async function() {
  await CacheInvalidator.onContractChange();
});

/**
 * Post-delete middleware to invalidate cache when contract is deleted via findOneAndDelete
 * @description Triggers cache invalidation for contract-related queries
 */
VertragSchema.post('findOneAndDelete', async function() {
  await CacheInvalidator.onContractChange();
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for common query patterns
 */

// Index for efficient date-based queries
VertragSchema.index({ 'availabilityImpact.from': 1, 'availabilityImpact.to': 1 });
VertragSchema.index({ user: 1, status: 1 });
VertragSchema.index({ scheduledStartDate: 1 });

// Indexes for trial and revenue queries
VertragSchema.index({ istProbemonatBuchung: 1 });
VertragSchema.index({ zahlungspflichtigAb: 1 });
VertragSchema.index({ istProbemonatBuchung: 1, zahlungspflichtigAb: 1 });

// Critical compound index for availability queries - optimized for the distinct() operation
VertragSchema.index({ 
  'services.mietfach': 1, 
  status: 1, 
  'availabilityImpact.from': 1, 
  'availabilityImpact.to': 1 
});

// Separate index for status filtering in availability queries
VertragSchema.index({ status: 1, 'services.mietfach': 1 });

/**
 * Contract model export
 * @description Exports the comprehensive contract model with trial and additional services support
 */
export default mongoose.model<IVertrag>('Vertrag', VertragSchema);