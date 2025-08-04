/**
 * @file User model for the housnkuh marketplace application
 * @description Comprehensive user model supporting vendors, administrators, and regular users
 * with trial periods, booking management, and vendor profile features
 */

import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types/modelTypes';

/**
 * Address schema for user addresses
 * @description Defines structure for different types of addresses (billing, shipping, main)
 */
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

/**
 * Contact information schema 
 * @description Extended contact schema with newsletter management and status tracking
 */
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

/**
 * Business details schema for extended business information
 * @description Contains business-specific information like certifications, production methods, and business type
 */
const BusinessDetailsSchema = new Schema({
  founded: { type: Date },
  certifications: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], // Tag-Referenzen für Zertifizierungen
  productionMethods: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], // Tag-Referenzen für Produktionsmethoden
  farmSize: { type: String },
  businessType: {
    type: String,
    enum: ['farm', 'cooperative', 'processing', 'retail'],
    default: 'farm'
  }
});

/**
 * Location schema for enhanced location data
 * @description Geographical information including coordinates, delivery radius, and service areas
 */
const LocationSchema = new Schema({
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere'
  },
  address: { type: String },
  deliveryRadius: { type: Number }, // in km
  deliveryAreas: [{ type: String }] // PLZ oder Ortsnamen
});

/**
 * Operational information schema for business operations
 * @description Contains operational details like seasonal information and peak periods
 */
const OperationalInfoSchema = new Schema({
  seasonal: { type: Boolean, default: false },
  yearRoundOperation: { type: Boolean, default: true },
  peakSeason: {
    start: { type: Date },
    end: { type: Date }
  }
});

/**
 * Vendor profile schema for direct marketer data
 * @description Comprehensive vendor profile including business information, hours, tags, and visibility settings
 */
const VendorProfileSchema = new Schema({
  unternehmen: { type: String },
  beschreibung: { type: String },
  profilBild: { type: String },
  bannerBild: { type: String },
  oeffnungszeiten: {
    montag: { type: String },
    dienstag: { type: String },
    mittwoch: { type: String },
    donnerstag: { type: String },
    freitag: { type: String },
    samstag: { type: String },
    sonntag: { type: String }
  },
  
  // Tag-basiertes System
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], // Haupt-Tags für Produktkategorien
  products: [{ type: Schema.Types.ObjectId, ref: 'Product' }], // Referenz zu Produkten
  
  // Erweiterte Geschäftsinformationen
  businessDetails: BusinessDetailsSchema,
  location: LocationSchema,
  operationalInfo: OperationalInfoSchema,
  
  slogan: { type: String },
  website: { type: String },
  socialMedia: {
    facebook: { type: String },
    instagram: { type: String }
  },
  verifyStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified'],
    default: 'unverified'
  },
  
  // Sichtbarkeit und Features
  isPubliclyVisible: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  
  // Provisionssatz für Vendor-Modell
  provisionssatz: {
    type: Number,
    enum: [4, 7], // 4% Basic, 7% Premium
    default: 4,
    required: function(this: any) { return this.isVendor; }
  },
  modelltyp: {
    type: String,
    enum: ['Basic', 'Premium'],
    default: function(this: any) { return this.provisionssatz === 7 ? 'Premium' : 'Basic'; },
    required: function(this: any) { return this.isVendor; }
  }
});

/**
 * User booking schema with detailed status tracking
 * @description Tracks user booking requests with lifecycle timestamps and status management
 */
const UserBookingSchema = new Schema({
  packageData: { type: Schema.Types.Mixed, required: true },
  comments: { type: String, trim: true, maxlength: 500 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed'],
    default: 'pending',
    required: true
  },
  // Booking lifecycle timestamps
  requestedAt: { type: Date, default: Date.now, required: true },
  confirmedAt: { type: Date },
  scheduledStartDate: { type: Date },
  actualStartDate: { type: Date },
  // References to assigned resources
  mietfachId: { type: Schema.Types.ObjectId, ref: 'Mietfach' },
  contractId: { type: Schema.Types.ObjectId, ref: 'Vertrag' },
  createdAt: { type: Date, default: Date.now }
});

/**
 * Main user schema adapted for vendor support
 * @description Comprehensive user model supporting multiple user types with trial periods,
 * booking management, and vendor-specific features
 */
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
  vendorProfile: VendorProfileSchema, // Vendor-spezifische Profildaten
  
  // Trial Period & Pre-Registration System (M001)
  registrationDate: {
    type: Date,
    default: Date.now
  },
  registrationStatus: {
    type: String,
    enum: ['preregistered', 'trial_active', 'trial_expired', 'active', 'cancelled'],
    default: function(this: any) {
      // Vendors starten als "preregistered", normale Users als "active"
      return this.isVendor ? 'preregistered' : 'active';
    }
  },
  trialStartDate: {
    type: Date,
    default: null
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  isPubliclyVisible: {
    type: Boolean,
    default: false // Vendors sind standardmäßig nicht öffentlich sichtbar
  },
  
  // Enhanced trial automation fields (M015)
  trialAutomation: {
    emailsAutomated: {
      type: Boolean,
      default: true
    },
    remindersSent: {
      sevenDayReminder: { type: Boolean, default: false },
      threeDayReminder: { type: Boolean, default: false },
      oneDayReminder: { type: Boolean, default: false },
      expirationNotification: { type: Boolean, default: false }
    },
    lastReminderSent: {
      type: Date,
      default: null
    },
    trialConversionDate: {
      type: Date,
      default: null
    },
    automationNotes: {
      type: String,
      default: ''
    }
  },
  
  pendingBooking: UserBookingSchema, // Erweiterte Eigenschaft für Buchungsverwaltung mit Status-Tracking
  
  // Top-level email field for index compatibility
  email: {
    type: String,
    required: false,
    sparse: true
    // unique: true - temporarily removed to fix duplicate key error
  }
}, { timestamps: true });

/**
 * User model export
 * @description Exports the User model with comprehensive vendor and trial support
 */
export default mongoose.model<IUser>('User', UserSchema);