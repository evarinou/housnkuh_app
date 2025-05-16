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
  newsletterConfirmed?: boolean;        // Neues Feld für Bestätigung
  confirmationToken?: string | null;    // Token für E-Mail-Bestätigung
  tokenExpires?: Date | null;           // Ablaufzeit des Tokens
  status: 'aktiv' | 'inaktiv' | 'pending';
  usrID?: string;
}

export interface IService {
  mietfach: string; // ObjectId als String
  mietbeginn: Date;
  mietende?: Date;
  monatspreis: number;
}

// server/src/types/modelTypes.ts - Ergänzung für Admin-Flag
export interface IUser extends Document {
  username?: string;
  password?: string;
  isFullAccount: boolean;
  isAdmin?: boolean; // Flag für Administratorrechte
  kontakt: IKontakt;
  adressen: IAdresse[];
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
  createdAt: Date;
  updatedAt: Date;
}