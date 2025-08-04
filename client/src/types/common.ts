/**
 * @file Common type definitions for the housnkuh marketplace application
 * @description Shared types used across multiple domains in the application.
 * Provides centralized type definitions for common business concepts.
 */

/**
 * Additional services (Zusatzleistungen) configuration - Base interface
 * @description Core interface for additional services that vendors can opt into.
 * This is the base interface used by UI components and price calculations.
 * 
 * @interface Zusatzleistungen
 * @property {boolean} lagerservice - Storage service activation flag
 * @property {boolean} versandservice - Shipping service activation flag
 */
export interface Zusatzleistungen {
  lagerservice: boolean;
  versandservice: boolean;
}

/**
 * Extended additional services configuration for contracts and tracking
 * @description Extended interface that includes additional fields for contract
 * management and service tracking. Used by contract systems and booking tracking.
 * 
 * @interface ZusatzleistungenExtended
 * @extends Zusatzleistungen
 * @property {string} [lagerservice_bestätigt] - Optional storage service confirmation
 * @property {boolean} versandservice_aktiv - Shipping service active status
 */
export interface ZusatzleistungenExtended extends Zusatzleistungen {
  lagerservice_bestätigt?: string;
  versandservice_aktiv: boolean;
}

/**
 * Cost structure for additional services
 * @description Pricing information for Zusatzleistungen.
 * Provides monthly cost breakdown for storage and shipping services.
 * 
 * @interface ZusatzleistungenKosten
 * @property {number} lagerservice_monatlich - Monthly cost for storage service
 * @property {number} versandservice_monatlich - Monthly cost for shipping service
 */
export interface ZusatzleistungenKosten {
  lagerservice_monatlich: number;
  versandservice_monatlich: number;
}

/**
 * Filter options for additional services management
 * @description Provides filtering capabilities for Zusatzleistungen in admin interfaces.
 * 
 * @interface ZusatzleistungenFilter
 * @property {string} [service_type] - Optional service type filter
 * @property {string} [status] - Optional status filter
 * @property {string} [search] - Optional search query
 */
export interface ZusatzleistungenFilter {
  service_type?: 'lager' | 'versand' | '';
  status?: 'active' | 'inactive' | 'pending' | '';
  search?: string;
}