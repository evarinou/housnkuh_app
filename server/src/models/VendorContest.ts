/**
 * @file Vendor Contest model for the housnkuh marketplace application
 * @description Model for managing vendor guessing contest entries where users guess vendor names
 * for promotional/engagement purposes
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for VendorContest document
 * @description Defines structure for vendor contest entries with participant information
 */
export interface IVendorContest extends Document {
  name: string;
  email: string;
  phone?: string;
  guessedVendors: string[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vendor contest schema for promotional contests
 * @description Stores contest entries where users guess vendor names for engagement campaigns
 */
const VendorContestSchema: Schema = new Schema(
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
    guessedVendors: [{
      type: String,
      trim: true
    }],
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * VendorContest model export
 * @description Exports the VendorContest model for promotional contest management
 */
export default mongoose.model<IVendorContest>('VendorContest', VendorContestSchema);