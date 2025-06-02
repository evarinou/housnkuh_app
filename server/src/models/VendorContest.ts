// server/src/models/VendorContest.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IVendorContest extends Document {
  name: string;
  email: string;
  phone?: string;
  guessedVendors: string[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

export default mongoose.model<IVendorContest>('VendorContest', VendorContestSchema);