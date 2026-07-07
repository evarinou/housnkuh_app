/**
 * @file Invoice.ts
 * @purpose Mongoose schema and model for invoice management
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// Invoice Item subdocument schema
const InvoiceItemSchema = new Schema({
  description: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    default: 1,
    min: 0.01 
  },
  unitPrice: { 
    type: Number, 
    required: true, 
    min: 0.01 
  },
  type: {
    type: String,
    required: true,
    enum: ['mietfach', 'zusatzleistung', 'sonstiges', 'provision']
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    required: false,
    default: null
  },
  period: {
    from: {
      type: Date,
      required: false
    },
    to: {
      type: Date,
      required: false
    }
  }
}, { _id: true });

// Virtual field for totalPrice calculation
InvoiceItemSchema.virtual('totalPrice').get(function() {
  return Math.round((this.quantity * this.unitPrice) * 100) / 100; // Round to 2 decimal places
});

// Ensure virtual fields are serialized
InvoiceItemSchema.set('toJSON', { virtuals: true });
InvoiceItemSchema.set('toObject', { virtuals: true });

// Main Invoice schema
const InvoiceSchema = new Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^RE-\d{4}-\d{2}-\d{5}$/ // Format: RE-YYYY-MM-00001
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100
    }
  },
  items: {
    type: [InvoiceItemSchema],
    required: true,
    validate: {
      validator: function(items: any[]) {
        return items && items.length > 0;
      },
      message: 'At least one invoice item is required'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
    // Removed max limit - this stores the tax AMOUNT in euros, not the rate
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 14); // 14 days from creation
      return date;
    }
  },
  paidDate: {
    type: Date,
    default: null
  },
  // Email notification tracking
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'retrying'],
    default: 'pending'
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  emailAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lastEmailAttempt: {
    type: Date,
    default: null
  },
  emailJobId: {
    type: String,
    default: null
  },
  // Admin fields for audit trail and cancellation
  notes: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  }
}, { timestamps: true });;

// Indexes for efficient querying
InvoiceSchema.index({ vendor: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ 'period.year': 1, 'period.month': 1 });
InvoiceSchema.index({ vendor: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });
// BUG-INV-DUP: genau EINE Monatsrechnung je Vendor+Periode — macht die
// find-then-insert-Duplikatsprüfung im Service atomar (E11000 beim Race).
// Bewusst ohne Storno-Ausnahme: Re-Ausstellung nach Storno wäre ein eigener Flow.
InvoiceSchema.index({ vendor: 1, 'period.year': 1, 'period.month': 1 }, { unique: true });

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('tax')) {
    // Calculate subtotal from items using virtual totalPrice
    this.subtotal = this.items.reduce((sum: number, item: any) => {
      const itemTotalPrice = Math.round((item.quantity * item.unitPrice) * 100) / 100;
      return sum + itemTotalPrice;
    }, 0);
    
    // tax ist ein absoluter USt-BETRAG (nicht ein Satz) — konsistent mit
    // invoiceCalculationService, dem Client und calculateMonthlyCharges.
    this.totalAmount = Math.round((this.subtotal + this.tax) * 100) / 100;
  }
  next();
});

// Define interfaces for static and instance methods
interface IInvoiceDocument extends Document {
  invoiceNumber: string;
  vendor: mongoose.Types.ObjectId;
  period: {
    month: number;
    year: number;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    type: 'mietfach' | 'zusatzleistung' | 'sonstiges' | 'provision';
    referenceId?: mongoose.Types.ObjectId;
    period?: {
      from?: Date;
      to?: Date;
    };
  }>;
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  // Email notification tracking
  emailStatus: 'pending' | 'sent' | 'failed' | 'retrying';
  emailSentAt?: Date;
  emailAttempts: number;
  lastEmailAttempt?: Date;
  emailJobId?: string;
  // Admin fields for audit trail and cancellation
  notes?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markAsPaid(): Promise<IInvoiceDocument>;
  isOverdue(): boolean;
}

interface IInvoiceModel extends Model<IInvoiceDocument> {
  generateInvoiceNumber(year: number, month: number): Promise<string>;
}

// Static method to generate next invoice number for a given month/year
InvoiceSchema.statics.generateInvoiceNumber = async function(year: number, month: number): Promise<string> {
  const monthStr = month.toString().padStart(2, '0');
  const prefix = `RE-${year}-${monthStr}-`;
  
  // Find the highest invoice number for this month
  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ invoiceNumber: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumberStr = lastInvoice.invoiceNumber.split('-').pop();
    nextNumber = parseInt(lastNumberStr || '0') + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
};

// Instance method to mark as paid
InvoiceSchema.methods.markAsPaid = function(): Promise<IInvoiceDocument> {
  this.status = 'paid';
  this.paidDate = new Date();
  return this.save();
};

// Instance method to check if overdue
InvoiceSchema.methods.isOverdue = function(): boolean {
  return this.status === 'sent' && new Date() > this.dueDate;
};

const Invoice = mongoose.model<IInvoiceDocument, IInvoiceModel>('Invoice', InvoiceSchema);

export default Invoice;