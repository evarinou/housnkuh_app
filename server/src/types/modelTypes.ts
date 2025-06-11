// server/src/types/modelTypes.ts - Erweiterte User-Types
import { Document } from 'mongoose';

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
}

export interface IService {
  mietfach: string; // ObjectId als String
  mietbeginn: Date;
  mietende?: Date;
  monatspreis: number;
}

// Erweiterte User-Interface für vollständige Direktvermarkter-Accounts
export interface IUser extends Document {
  username?: string;
  password?: string;
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
  
  // Buchungsspezifische Felder
  pendingBooking?: {
    packageData: any; // Package-Konfiguration
    createdAt: Date;
    status: 'pending' | 'completed' | 'cancelled';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IMietfach extends Document {
  bezeichnung: string;
  typ: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IVertrag extends Document {
  user: string; // ObjectId als String
  datum: Date;
  services: IService[];
  packageConfiguration?: any; // Gespeicherte Package-Konfiguration
  totalMonthlyPrice: number;
  contractDuration: number; // in Monaten
  discount: number; // Rabatt als Dezimalwert (0.1 = 10%)
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}