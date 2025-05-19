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