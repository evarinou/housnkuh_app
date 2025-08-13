import { BookingStatus } from '../components/vendor/BookingStatusBadge';

import { ZusatzleistungenExtended } from './common';

export interface IMietfach {
  _id: string;
  bezeichnung: string;
  typ: 'regal' | 'regal-b' | 'kuehlregal' | 'gefrierregal' | 'verkaufstisch' | 'sonstiges' | 'schaufenster';
  beschreibung?: string;
  groesse?: {
    flaeche: number;
    einheit: string;
  };
  standort?: string;
  features?: string[];
}

export interface IPriceBreakdown {
  mietfachBase: number;
  zusatzleistungen: {
    lagerservice: number;
    versandservice: number;
  };
  discount: number;
  discountAmount: number;
  subtotal: number;
}

/**
 * @deprecated Use ZusatzleistungenExtended from common types instead
 * @description Alias for backward compatibility with existing booking code
 */
export type IZusatzleistungen = ZusatzleistungenExtended;

export interface IPackageData {
  packageType?: string;
  duration?: number;
  selectedItems?: any[];
  totalPrice?: number;
  name?: string;
  // API response format
  totalCost?: {
    monthly: number;
  };
  packages?: any;
  addons?: any[];
  services?: any[];
  priceBreakdown?: IPriceBreakdown;
  zusatzleistungen?: IZusatzleistungen;
  [key: string]: any;
}

export interface IBooking {
  id: string;
  _id?: string;
  packageData?: IPackageData;
  packageDetails?: IPackageData; // API uses packageDetails
  status: BookingStatus;
  mietfachId?: string;
  mietfach?: IMietfach | IMietfach[]; // Can be single or array
  contractId?: string;
  comments?: string;
  requestedAt: Date;
  confirmedAt?: Date;
  scheduledStartDate?: Date;
  actualStartDate?: Date;
  createdAt?: Date;
  assignedMietfachId?: string;
  priceAdjustments?: { [mietfachId: string]: number };
  // Trial period fields
  istProbemonatBuchung?: boolean;
  zahlungspflichtigAb?: Date;
}

export interface IDashboardMessage {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  dismissible: boolean;
  autoHide?: boolean;
  conditions?: {
    showWhen?: string;
    hideWhen?: string;
  };
}

export type { BookingStatus };