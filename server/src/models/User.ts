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

// Kontakt Schema - erweitern
const KontaktSchema = new Schema({
  name: { type: String, required: true },
  newslettertype: String,
  mailNewsletter: { type: Boolean, default: false },
  newsletterConfirmed: { type: Boolean, default: false }, // Neues Feld für Bestätigung
  confirmationToken: { type: String, default: null },     // Token für E-Mail-Bestätigung
  tokenExpires: { type: Date, default: null },           // Ablaufzeit des Tokens
  status: {
    type: String,
    enum: ['aktiv', 'inaktiv', 'pending'],               // 'pending' für unbestätigte Newsletter
    default: 'aktiv'
  },
  usrID: String
});

// User Schema anpassen - für Newsletter-Nutzer
const UserSchema = new Schema({
  username: {
    type: String,
    required: function(this: any) {
      // Username ist nur erforderlich, wenn es ein vollständiger Account ist
      return this.isFullAccount === true;
    },
    unique: true,
    sparse: true,  // Erlaubt null/undefined für username bei Newsletter-only Nutzern
    trim: true
  },
    isFullAccount: {
    type: Boolean,
    default: false  // Standardmäßig ist es nur ein Newsletter-Abonnent
  },
  password: {
    type: String,
    required: function(this: any) {
      // Passwort ist nur erforderlich, wenn es ein vollständiger Account ist
      return this.isFullAccount === true;
    }
  },
    isAdmin: {
    type: Boolean,
    default: false
  },

  kontakt: {
    type: KontaktSchema,
    required: true
  },
  adressen: [AdresseSchema]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);