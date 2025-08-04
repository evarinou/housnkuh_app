/**
 * @file Core type definitions for the housnkuh marketplace application
 * @description Central type definition file that aggregates and exports types used throughout
 * the client application. Provides foundational interfaces for booking, pricing, and 
 * additional services (Zusatzleistungen) functionality.
 */

/**
 * Re-export common types used across the application
 * @description Provides a centralized import point for common types to maintain
 * clean import statements throughout the application.
 */
export * from './common';

/**
 * Re-export all booking-related types from the booking module
 * @description Provides a centralized import point for booking types to maintain
 * clean import statements throughout the application.
 */
export * from './booking';

import { Zusatzleistungen } from './common';

/**
 * Form data structure for booking submissions
 * @description Captures the essential information needed to create a new booking
 * in the marketplace system. Used primarily by booking forms and validation.
 * 
 * @interface BookingFormData
 * @property {string} [mietfachId] - Optional ID of the specific rental unit
 * @property {number} laufzeitMonate - Contract duration in months
 * @property {number} provisionssatz - Commission rate as percentage
 * @property {Zusatzleistungen} [zusatzleistungen] - Optional additional services
 */
export interface BookingFormData {
  mietfachId?: string;
  laufzeitMonate: number;
  provisionssatz: number;
  zusatzleistungen?: Zusatzleistungen;
}

/**
 * Detailed price calculation breakdown for bookings
 * @description Comprehensive pricing structure that includes base costs, additional services,
 * discounts, and commission calculations. Used for transparent pricing display and 
 * internal calculation verification.
 * 
 * @interface PriceCalculation
 * @property {number} grundpreis - Base rental price before additional services
 * @property {Object} zusatzleistungen - Additional services pricing breakdown
 * @property {number} zusatzleistungen.lagerservice - Monthly cost for storage service
 * @property {number} zusatzleistungen.versandservice - Monthly cost for shipping service
 * @property {number} monatlicheKosten - Total monthly costs including all services
 * @property {number} laufzeitMonate - Contract duration in months
 * @property {number} zwischensumme - Subtotal before discounts
 * @property {number} rabatt - Discount percentage applied
 * @property {number} rabattBetrag - Absolute discount amount
 * @property {number} gesamtpreis - Final total price after all calculations
 * @property {Object} [provision] - Optional commission structure
 * @property {number} [provision.satz] - Commission rate as percentage
 * @property {number} [provision.monatlich] - Monthly commission amount
 */
export interface PriceCalculation {
  grundpreis: number;
  zusatzleistungen: {
    lagerservice: number;
    versandservice: number;
  };
  monatlicheKosten: number;
  laufzeitMonate: number;
  zwischensumme: number;
  rabatt: number;
  rabattBetrag: number;
  gesamtpreis: number;
  provision?: {
    satz: number;
    monatlich: number;
  };
}

/**
 * API response structure for price calculation requests
 * @description Standardized response format for price calculation API calls.
 * Includes success status and detailed pricing information for client-side processing.
 * 
 * @interface PriceCalculationResponse
 * @property {boolean} success - Indicates if the price calculation was successful
 * @property {PriceCalculation} preisDetails - Detailed pricing breakdown
 */
export interface PriceCalculationResponse {
  success: boolean;
  preisDetails: PriceCalculation;
}