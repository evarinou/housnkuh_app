/**
 * @file Contact model for the housnkuh marketplace application
 * @description Contact form submissions model with status tracking and admin management
 * Handles customer inquiries and support requests
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for Contact document
 * @description Defines structure for contact form submissions with read/resolved status tracking
 */
export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact schema for customer inquiries and support requests
 * @description Manages contact form submissions with status tracking for admin workflow
 */
const ContactSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isResolved: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * Database indexes for query optimization
 * @description Performance-optimized indexes for contact queries
 */
ContactSchema.index({ isRead: 1, createdAt: -1 });
ContactSchema.index({ isResolved: 1, createdAt: -1 });
ContactSchema.index({ email: 1 });

/**
 * Contact model export
 * @description Exports the Contact model with inquiry management capabilities
 */
export default mongoose.model<IContact>('Contact', ContactSchema);