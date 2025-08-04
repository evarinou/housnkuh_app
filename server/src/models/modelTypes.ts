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
  newslettertype?: string;
  mailNewsletter: boolean;
  status: 'aktiv' | 'inaktiv';
  usrID?: string;
}

export interface IService {
  mietfach: string; // ObjectId als String
  mietbeginn: Date;
  mietende?: Date;
  monatspreis: number;
}

// Document-Interfaces für Mongoose
export interface IUser extends Document {
  username: string;
  password: string;
  kontakt: IKontakt;
  adressen: IAdresse[];
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
  verfuegbar: boolean;
  aktuellerVertrag?: string;
  zugewiesenAn?: string;
  standort?: string;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IVertrag extends Document {
  user: string; // ObjectId als String
  datum: Date;
  services: IService[];
  status: string;
  scheduledStartDate: Date;
  availabilityImpact?: {
    from: Date;
    to: Date;
  };
  totalMonthlyPrice?: number;
  discount?: number;
  istProbemonatBuchung: boolean;
  zahlungspflichtigAb?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMonthlyRevenue extends Document {
  monat: Date;
  gesamteinnahmen: number;
  anzahlAktiveVertraege: number;
  anzahlProbemonatVertraege: number;
  einnahmenProMietfach: IMietfachRevenue[];
  isProjection?: boolean;
  aktualisiertAm?: Date;
}

export interface IMietfachRevenue {
  mietfachId: any; // ObjectId
  mietfachNummer: string;
  einnahmen: number;
  anzahlVertraege: number;
  anzahlProbemonatVertraege: number;
}