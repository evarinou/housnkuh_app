/**
 * @file Package Tracking model for the housnkuh marketplace application
 * @description Tracks packages for storage and shipping services (Zusatzleistungen)
 * Manages package lifecycle from arrival to delivery with status transitions
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface for PackageTracking document
 * @description Defines structure for package tracking with status transitions and timestamps
 */
export interface IPackageTracking extends Document {
  vertrag_id: mongoose.Types.ObjectId;
  package_typ: 'lagerservice' | 'versandservice';
  status: 'erwartet' | 'angekommen' | 'eingelagert' | 'versandt' | 'zugestellt';
  ankunft_datum?: Date;
  einlagerung_datum?: Date;
  versand_datum?: Date;
  zustellung_datum?: Date;
  bestätigt_von?: mongoose.Types.ObjectId;
  notizen?: string;
  tracking_nummer?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Package tracking schema for Zusatzleistungen
 * @description Tracks package status for storage and shipping services with automatic timestamp management
 */
const PackageTrackingSchema = new Schema({
  vertrag_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vertrag', 
    required: true 
  },
  package_typ: { 
    type: String, 
    enum: ['lagerservice', 'versandservice'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['erwartet', 'angekommen', 'eingelagert', 'versandt', 'zugestellt'],
    default: 'erwartet',
    required: true
  },
  ankunft_datum: { 
    type: Date 
  },
  einlagerung_datum: { 
    type: Date 
  },
  versand_datum: { 
    type: Date 
  },
  zustellung_datum: { 
    type: Date 
  },
  bestätigt_von: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  notizen: { 
    type: String, 
    maxlength: 500 
  },
  tracking_nummer: { 
    type: String 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/**
 * Pre-save middleware for status transitions and timestamp management
 * @description Automatically sets timestamps when package status changes
 * @complexity O(1) - Simple status checking and timestamp setting
 */
PackageTrackingSchema.pre('save', function(next) {
  // Validate status transitions and ensure dates are set correctly
  if (this.status === 'angekommen' && !this.ankunft_datum) {
    this.ankunft_datum = new Date();
  }
  if (this.status === 'eingelagert' && !this.einlagerung_datum) {
    this.einlagerung_datum = new Date();
  }
  if (this.status === 'versandt' && !this.versand_datum) {
    this.versand_datum = new Date();
  }
  if (this.status === 'zugestellt' && !this.zustellung_datum) {
    this.zustellung_datum = new Date();
  }
  next();
});

/**
 * Post-save hook for status change notifications
 * @description Logs status changes and prepares for future email notifications
 * @complexity O(1) - Simple logging operation
 */
PackageTrackingSchema.post('save', function(doc) {
  // TODO: Trigger email notifications based on status changes
  console.log(`Package tracking updated: ${doc.vertrag_id} - ${doc.status}`);
});

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for package tracking queries
 */
PackageTrackingSchema.index({ vertrag_id: 1 });
PackageTrackingSchema.index({ status: 1 });
PackageTrackingSchema.index({ package_typ: 1, status: 1 });
PackageTrackingSchema.index({ created_at: -1 });

/**
 * PackageTracking model export
 * @description Exports the PackageTracking model with status transition management
 */
export default mongoose.model<IPackageTracking>('PackageTracking', PackageTrackingSchema);