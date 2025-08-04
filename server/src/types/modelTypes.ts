// server/src/types/modelTypes.ts - Erweiterte User-Types
import mongoose, { Document } from 'mongoose';

// Basis-Interface für Subdokumente
export interface IAdresse {
  adresstyp: 'Rechnungsadresse' | 'Lieferadresse' | 'Hauptadresse';
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  telefon?: string;
  email?: string;
  anrede?: string;
  name1: string;
  name2?: string;
}

export interface IKontakt {
  name: string;
  newslettertype?: 'customer' | 'vendor' | string;
  mailNewsletter: boolean;
  newsletterConfirmed?: boolean;
  confirmationToken?: string | null;
  tokenExpires?: Date | null;
  status: 'aktiv' | 'inaktiv' | 'pending';
  usrID?: string;
  email: string; // E-Mail ist jetzt erforderlich
  telefon?: string;
}

// Business Details Interface für erweiterte Geschäftsinformationen
export interface IBusinessDetails {
  founded?: Date;
  certifications?: string[]; // Tag IDs für Zertifizierungen
  productionMethods?: string[]; // Tag IDs für Produktionsmethoden
  farmSize?: string;
  businessType?: 'farm' | 'cooperative' | 'processing' | 'retail';
}

// Location Interface für verbesserte Standortdaten
export interface ILocation {
  coordinates?: [number, number]; // [longitude, latitude]
  address?: string;
  deliveryRadius?: number; // in km
  deliveryAreas?: string[]; // PLZ oder Ortsnamen
}

// Operational Info Interface für Betriebsinformationen
export interface IOperationalInfo {
  seasonal?: boolean;
  yearRoundOperation?: boolean;
  peakSeason?: {
    start?: Date;
    end?: Date;
  };
}

// Vendor Profile Interface für erweiterte Direktvermarkter-Daten
export interface IVendorProfile {
  unternehmen?: string;
  beschreibung?: string;
  profilBild?: string;
  bannerBild?: string;
  oeffnungszeiten?: {
    montag?: string;
    dienstag?: string;
    mittwoch?: string;
    donnerstag?: string;
    freitag?: string;
    samstag?: string;
    sonntag?: string;
  };
  
  // Tag-basiertes System
  tags?: string[]; // Tag IDs für Produktkategorien
  products?: string[]; // Product IDs
  
  // Erweiterte Geschäftsinformationen
  businessDetails?: IBusinessDetails;
  location?: ILocation;
  operationalInfo?: IOperationalInfo;
  
  slogan?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
  verifyStatus?: 'unverified' | 'pending' | 'verified';
  
  // Sichtbarkeit und Features
  isPubliclyVisible?: boolean;
  featured?: boolean;
  
  // Provisionssatz für Vendor-Modell
  provisionssatz?: number; // 4% Basic, 7% Premium
  modelltyp?: 'Basic' | 'Premium';
}

// Booking Status Enum für detailliertes Status-Tracking
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

// Booking Dates Interface für Zeitstempel
export interface IBookingDates {
  requestedAt: Date;
  confirmedAt?: Date;
  scheduledStartDate?: Date;
  actualStartDate?: Date;
}

// Package Data Interface für die Buchungsdaten
export interface IPackageData {
  packageType?: string;
  duration?: number;
  selectedItems?: any[];
  totalPrice?: number;
  [key: string]: any;
}

// Erweiterte User Booking Interface
export interface IUserBooking extends IBookingDates {
  packageData: IPackageData;
  status: BookingStatus;
  mietfachId?: string; // ObjectId als String
  contractId?: string; // ObjectId als String
  comments?: string;
  createdAt: Date;
  // M005 Extensions
  assignedMietfachId?: string; // ObjectId als String for admin assignment
  priceAdjustments?: { [mietfachId: string]: number }; // Price adjustments per Mietfach
}

export interface IService {
  mietfach: string; // ObjectId als String
  mietbeginn: Date;
  mietende?: Date;
  monatspreis: number;
}

// Trial automation tracking interface
export interface ITrialAutomation {
  emailsAutomated: boolean;
  remindersSent: {
    sevenDayReminder: boolean;
    threeDayReminder: boolean;
    oneDayReminder: boolean;
    expirationNotification: boolean;
  };
  lastReminderSent?: Date;
  trialConversionDate?: Date;
  automationNotes: string;
}

// Erweiterte User-Interface für vollständige Direktvermarkter-Accounts
export interface IUser extends Document {
  username?: string;
  password?: string;
  email?: string; // Top-level email field for index compatibility
  isFullAccount: boolean;
  isAdmin?: boolean;
  isVendor?: boolean; // Neu: Flag für Direktvermarkter
  kontakt: IKontakt;
  adressen: IAdresse[];
  vendorProfile?: IVendorProfile; // Vendor-spezifische Profildaten
  
  // Trial Period & Pre-Registration System (M001)
  registrationDate?: Date; // Datum der Erstregistrierung
  registrationStatus?: 'preregistered' | 'trial_active' | 'trial_expired' | 'active' | 'cancelled';
  trialStartDate?: Date; // Startdatum des Probemonats (= storeOpeningDate)
  trialEndDate?: Date; // Enddatum des Probemonats (= storeOpeningDate + 30 Tage)
  isPubliclyVisible?: boolean; // Manuelle Freischaltung für öffentliche Sichtbarkeit
  
  // Enhanced trial automation fields (M015)
  trialAutomation?: ITrialAutomation;
  
  // Provisionssatz für Vendor-Modell
  provisionssatz?: number; // 4% Basic, 7% Premium
  modelltyp?: 'Basic' | 'Premium';
  
  // Buchungsspezifische Felder
  pendingBooking?: IUserBooking;
  createdAt: Date;
  updatedAt: Date;
}

export enum MietfachTyp {
  SCHAUFENSTER = 'schaufenster',
  KUEHL = 'kuehl', 
  GEFRIER = 'gefrier',
  REGAL = 'regal',
  SONSTIGES = 'sonstiges'
}

export interface IMietfach extends Document {
  bezeichnung: string;
  typ: MietfachTyp;
  beschreibung?: string;
  groesse?: {
    flaeche: number;
    einheit: string;
  };
  verfuegbar?: boolean;
  aktuellerVertrag?: string; // ObjectId des aktuellen Vertrags
  zugewiesenAn?: string; // ObjectId des Direktvermarkters
  standort?: string;
  features?: string[];
  // Sprint S12_M11_Mietfaecher_Seeding_Cleanup - Manual creation tracking
  creationSource?: 'manual' | 'import' | 'seed';
  createdBy?: string; // ObjectId des Admin-Users
  createdAt: Date;
  updatedAt: Date;
  // Methods for availability checking
  isAvailableForPeriod(startDate: Date, endDate?: Date): Promise<boolean>;
}

// Mietfach Model Interface with static methods
export interface IMietfachModel extends mongoose.Model<IMietfach> {
  findAvailableForPeriod(startDate: Date, endDate?: Date): Promise<IMietfach[]>;
}

// Trial Fields Interface for IVertrag
export interface IVertragTrialFields {
  istProbemonatBuchung: boolean;
  probemonatUserId?: mongoose.Types.ObjectId;
  zahlungspflichtigAb: Date;
  gekuendigtInProbemonat: boolean;
  probemonatKuendigungsdatum?: Date;
}

export interface IVertrag extends Document, IVertragTrialFields {
  user: string; // ObjectId als String
  datum: Date;
  services: IService[];
  packageConfiguration?: any; // Gespeicherte Package-Konfiguration
  totalMonthlyPrice: number;
  contractDuration: number; // in Monaten
  discount: number; // Rabatt als Dezimalwert (0.1 = 10%)
  provisionssatz: number; // Provision für Verkäufe (4% oder 7%)
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'scheduled' | 'confirmed';
  // Zusatzleistungen for premium services
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
    lagerservice_bestätigt?: Date;
    versandservice_aktiv: boolean;
  };
  // Zusatzleistungen pricing
  zusatzleistungen_kosten?: {
    lagerservice_monatlich: number;
    versandservice_monatlich: number;
  };
  // Virtual field for total price calculation
  gesamtpreis?: number;
  // Method for validating zusatzleistungen
  validateZusatzleistungen?(): void;
  // Scheduling fields for flexible start dates
  scheduledStartDate: Date;
  actualStartDate?: Date;
  startDate?: Date; // Alternative field name
  endDate?: Date; // Contract end date
  availabilityImpact?: {
    from: Date;
    to: Date;
  };
  // Cancellation fields
  cancellationDate?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mietfach Revenue Interface for MonthlyRevenue subdocuments
export interface IMietfachRevenue {
  mietfachId: mongoose.Types.ObjectId;
  mietfachNummer: string;
  einnahmen: number;
  anzahlVertraege: number;
  anzahlProbemonatVertraege: number;
}

// Monthly Revenue Interface for revenue tracking
export interface IMonthlyRevenue extends Document {
  monat: Date;
  gesamteinnahmen: number;
  anzahlAktiveVertraege: number;
  anzahlProbemonatVertraege: number;
  einnahmenProMietfach: IMietfachRevenue[];
  erstelltAm: Date;
  aktualisiertAm: Date;
  isProjection?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Package Tracking Interface for Zusatzleistungen
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