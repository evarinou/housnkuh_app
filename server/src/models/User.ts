import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types/modelTypes';

// Adresse Schema
const AdresseSchema = new Schema({
  adresstyp: {
    type: String,
    enum: ['Rechnungsadresse', 'Lieferadresse', 'Hauptadresse'],
    required: true
  },
  strasse: { type: String, required: true },
  hausnummer: { type: String, required: true },
  plz: { type: String, required: true },
  ort: { type: String, required: true },
  telefon: String,
  email: String,
  anrede: String,
  name1: { type: String, required: true },
  name2: String
});

// Kontakt Schema - erweitert
const KontaktSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, // E-Mail ist jetzt immer erforderlich
  telefon: String,
  newslettertype: String,
  mailNewsletter: { type: Boolean, default: false },
  newsletterConfirmed: { type: Boolean, default: false },
  confirmationToken: { type: String, default: null },
  tokenExpires: { type: Date, default: null },
  status: {
    type: String,
    enum: ['aktiv', 'inaktiv', 'pending'],
    default: 'aktiv'
  },
  usrID: String
});

// Pending Booking Schema für ausstehende Buchungen
const PendingBookingSchema = new Schema({
  packageData: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
});

// User Schema angepasst für Vendor-Support
const UserSchema = new Schema({
  username: {
    type: String,
    required: function(this: any) {
      return this.isFullAccount === true;
    },
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: function(this: any) {
      return this.isFullAccount === true;
    }
  },
  isFullAccount: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVendor: {
    type: Boolean,
    default: false
  },
  kontakt: {
    type: KontaktSchema,
    required: true
  },
  adressen: [AdresseSchema],
  pendingBooking: PendingBookingSchema // Neue Eigenschaft für ausstehende Buchungen
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);