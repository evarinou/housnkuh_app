// server/src/models/FAQ.ts
import mongoose, { Document, Schema } from 'mongoose';

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

// Indexes for better performance
FAQSchema.index({ category: 1, order: 1 });
FAQSchema.index({ keywords: 1 });
FAQSchema.index({ isActive: 1 });

export default mongoose.model<IFAQ>('FAQ', FAQSchema);