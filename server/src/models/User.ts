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

// Kontakt Schema
const KontaktSchema = new Schema({
  name: { type: String, required: true },
  newslettertype: String,
  mailNewsletter: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['aktiv', 'inaktiv'],
    default: 'aktiv'
  },
  usrID: String
});

// User Schema
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  kontakt: {
    type: KontaktSchema,
    required: true
  },
  adressen: [AdresseSchema]
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);