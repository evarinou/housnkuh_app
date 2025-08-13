/**
 * @file Contract and business domain type definitions for housnkuh marketplace
 * @description Comprehensive type definitions for contracts, users, rental units (Mietfächer), 
 * additional services (Zusatzleistungen), and package tracking functionality. These types
 * define the core business domain models used throughout the application.
 */

/**
 * User entity for contracts and marketplace interactions
 * @description Represents a user in the marketplace system with flexible role support.
 * Can represent both admin and vendor users with contact information.
 * 
 * @interface User
 * @property {string} _id - MongoDB document identifier
 * @property {string} [username] - Optional username for admin users
 * @property {Object} [kontakt] - Optional contact information
 * @property {string} kontakt.name - User's display name
 * @property {string} kontakt.email - User's email address
 * @property {boolean} [isAdmin] - Flag indicating admin privileges
 * @property {boolean} [isVendor] - Flag indicating vendor user type
 */
import { ZusatzleistungenExtended, ZusatzleistungenKosten, ZusatzleistungenFilter } from './common';

export interface User {
  _id: string;
  username?: string;
  kontakt?: {
    name: string;
    email: string;
  };
  isAdmin?: boolean;
  isVendor?: boolean;
}

/**
 * Rental unit (Mietfach) entity
 * @description Represents a physical rental unit in the marketplace.
 * Contains specifications, pricing, and location information.
 * 
 * @interface Mietfach
 * @property {string} _id - MongoDB document identifier
 * @property {string} bezeichnung - Unit designation/name
 * @property {string} typ - Type classification of the rental unit
 * @property {string} [beschreibung] - Optional description
 * @property {string} [standort] - Optional location information
 * @property {Object} [groesse] - Optional size specifications
 * @property {number} groesse.flaeche - Area/surface measurement
 * @property {string} groesse.einheit - Unit of measurement
 * @property {number} [preis] - Optional base price
 */
export interface Mietfach {
  _id: string;
  bezeichnung: string;
  typ: string;
  beschreibung?: string;
  standort?: string;
  groesse?: {
    flaeche: number;
    einheit: string;
  };
  preis?: number;
}

/**
 * Service component of a contract
 * @description Represents a specific service within a contract, linking a rental unit
 * to rental periods and pricing.
 * 
 * @interface Service
 * @property {Mietfach} mietfach - The rental unit being leased
 * @property {string} mietbeginn - Service start date (ISO string)
 * @property {string} [mietende] - Optional service end date (ISO string)
 * @property {number} monatspreis - Monthly price for this service
 */
export interface Service {
  mietfach: Mietfach;
  mietbeginn: string;
  mietende?: string;
  monatspreis: number;
}

/**
 * @deprecated Use ZusatzleistungenExtended from common types instead
 * @description Alias for backward compatibility with existing contract code
 */
export type Zusatzleistungen = ZusatzleistungenExtended;

// Re-export types for backward compatibility
export type { ZusatzleistungenKosten, ZusatzleistungenFilter };

/**
 * Contract entity - core business document
 * @description Represents a complete contract between a user and the marketplace.
 * Includes services, pricing, additional services, and lifecycle management.
 * 
 * @interface Contract
 * @property {string} _id - MongoDB document identifier
 * @property {User} user - Contract holder
 * @property {string} datum - Contract creation date (ISO string)
 * @property {Service[]} services - Array of services included in contract
 * @property {any} [packageConfiguration] - Optional package configuration data
 * @property {number} totalMonthlyPrice - Total monthly cost including all services
 * @property {number} contractDuration - Contract duration in months
 * @property {number} discount - Discount percentage applied
 * @property {string} status - Contract lifecycle status
 * @property {Zusatzleistungen} [zusatzleistungen] - Optional additional services
 * @property {ZusatzleistungenKosten} [zusatzleistungen_kosten] - Optional additional service costs
 * @property {string} scheduledStartDate - Scheduled contract start date
 * @property {string} [actualStartDate] - Actual contract start date
 * @property {Object} [availabilityImpact] - Optional availability impact period
 * @property {string} availabilityImpact.from - Impact start date
 * @property {string} availabilityImpact.to - Impact end date
 * @property {number} [gesamtpreis] - Optional total contract price
 * @property {string} createdAt - Document creation timestamp
 * @property {string} updatedAt - Document last update timestamp
 * @property {PackageTracking[]} [packages] - Optional package tracking records
 */
export interface Contract {
  _id: string;
  user: User;
  datum: string;
  services: Service[];
  packageConfiguration?: any;
  totalMonthlyPrice: number;
  contractDuration: number;
  discount: number;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'scheduled' | 'confirmed';
  zusatzleistungen?: Zusatzleistungen;
  zusatzleistungen_kosten?: ZusatzleistungenKosten;
  scheduledStartDate: string;
  actualStartDate?: string;
  availabilityImpact?: {
    from: string;
    to: string;
  };
  gesamtpreis?: number;
  createdAt: string;
  updatedAt: string;
  packages?: PackageTracking[];
}

/**
 * Package tracking entity for additional services
 * @description Tracks packages through their lifecycle for storage and shipping services.
 * Provides detailed status tracking and notification capabilities.
 * 
 * @interface PackageTracking
 * @property {string} _id - MongoDB document identifier
 * @property {string} vertrag_id - Associated contract identifier
 * @property {string} package_typ - Type of package service
 * @property {string} status - Current package status in lifecycle
 * @property {string} [ankunft_datum] - Optional arrival date
 * @property {string} [einlagerung_datum] - Optional storage date
 * @property {string} [versand_datum] - Optional shipping date
 * @property {string} [zustellung_datum] - Optional delivery date
 * @property {string} [bestätigt_von] - Optional confirmation person
 * @property {string} [notizen] - Optional notes
 * @property {string} [tracking_nummer] - Optional tracking number
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 * @property {Object} [contract] - Optional contract summary
 * @property {string} contract._id - Contract identifier
 * @property {User} contract.user - Contract holder
 * @property {number} contract.totalMonthlyPrice - Contract monthly price
 */
export interface PackageTracking {
  _id: string;
  vertrag_id: string;
  package_typ: 'lagerservice' | 'versandservice';
  status: 'erwartet' | 'angekommen' | 'eingelagert' | 'versandt' | 'zugestellt';
  ankunft_datum?: string;
  einlagerung_datum?: string;
  versand_datum?: string;
  zustellung_datum?: string;
  bestätigt_von?: string;
  notizen?: string;
  tracking_nummer?: string;
  created_at: string;
  updated_at: string;
  contract?: {
    _id: string;
    user: User;
    totalMonthlyPrice: number;
  };
}


/**
 * Package action for status updates
 * @description Defines actions that can be performed on packages during their lifecycle.
 * Used for package status management and workflow operations.
 * 
 * @interface PackageAction
 * @property {string} packageId - Target package identifier
 * @property {string} action - Action to perform on package
 * @property {string} [notes] - Optional action notes
 */
export interface PackageAction {
  packageId: string;
  action: 'confirm_arrival' | 'confirm_stored' | 'mark_shipped' | 'mark_delivered';
  notes?: string;
}

/**
 * Bulk action configuration for batch operations
 * @description Defines bulk operations that can be performed on multiple packages.
 * Used in admin interfaces for efficient batch processing.
 * 
 * @interface BulkAction
 * @property {string} id - Unique action identifier
 * @property {string} label - Display label for the action
 * @property {string} icon - Icon identifier for UI display
 * @property {boolean} confirmRequired - Flag indicating if confirmation is required
 */
export interface BulkAction {
  id: string;
  label: string;
  icon: string;
  confirmRequired: boolean;
}