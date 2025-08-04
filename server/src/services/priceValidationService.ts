/**
 * @file Price Validation Service for backend price calculations
 * @description Service for authoritative price calculations and validation against frontend
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/priceValidationService.ts
import { ZUSATZLEISTUNGEN_PRICING } from '../types/zusatzleistungenTypes';

/**
 * @interface BackendPriceCalculation
 * @description Result object for backend price calculations
 */
export interface BackendPriceCalculation {
  /** @description Total price for Mietfach services */
  mietfachTotal: number;
  /** @description Total price for Zusatzleistungen */
  zusatzleistungenTotal: number;
  /** @description Subtotal before discount */
  subtotal: number;
  /** @description Applied discount amount */
  discountAmount: number;
  /** @description Final total price */
  total: number;
}

/**
 * @class PriceValidationService
 * @description Service for authoritative price calculations and validation against frontend
 * @security Provides backend price authority to prevent manipulation
 * @complexity Medium - Price calculation with validation and audit logging
 */
export class PriceValidationService {
  /**
   * @description Calculate prices on backend (authoritative)
   * @param {number[]} mietfachPrices - Array of Mietfach prices
   * @param {object} [zusatzleistungen] - Optional additional services
   * @param {boolean} [zusatzleistungen.lagerservice] - Whether storage service is included
   * @param {boolean} [zusatzleistungen.versandservice] - Whether shipping service is included
   * @param {number} discount - Discount percentage (0-1)
   * @param {'basic' | 'premium'} provisionType - Provision type determining service availability
   * @security Authoritative price calculation preventing frontend manipulation
   * @complexity Medium - Multi-component price calculation with service restrictions
   * @returns {BackendPriceCalculation} Detailed price calculation breakdown
   */
  static calculateBackendPrice(
    mietfachPrices: number[],
    zusatzleistungen?: {
      lagerservice?: boolean;
      versandservice?: boolean;
    },
    discount: number = 0,
    provisionType: 'basic' | 'premium' = 'basic'
  ): BackendPriceCalculation {
    
    const mietfachTotal = mietfachPrices.reduce((sum, price) => sum + price, 0);
    
    let zusatzleistungenTotal = 0;
    if (zusatzleistungen && provisionType === 'premium') {
      if (zusatzleistungen.lagerservice) {
        zusatzleistungenTotal += ZUSATZLEISTUNGEN_PRICING.lagerservice;
      }
      if (zusatzleistungen.versandservice) {
        zusatzleistungenTotal += ZUSATZLEISTUNGEN_PRICING.versandservice;
      }
    }
    
    const subtotal = mietfachTotal + zusatzleistungenTotal;
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;
    
    return {
      mietfachTotal,
      zusatzleistungenTotal,
      subtotal,
      discountAmount,
      total: Math.round(total * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * @description Validate frontend price calculation against backend
   * @param {number} frontendTotal - Total price calculated by frontend
   * @param {BackendPriceCalculation} backendCalculation - Backend calculation to validate against
   * @param {number} tolerance - Acceptable difference tolerance
   * @security Prevents price manipulation by validating against backend calculation
   * @complexity Low - Simple price comparison with tolerance
   * @returns {object} Validation result with difference if invalid
   */
  static validateFrontendCalculation(
    frontendTotal: number,
    backendCalculation: BackendPriceCalculation,
    tolerance: number = 0.01
  ): { valid: boolean; difference?: number } {
    const difference = Math.abs(frontendTotal - backendCalculation.total);
    
    return {
      valid: difference <= tolerance,
      difference: difference > tolerance ? difference : undefined
    };
  }

  /**
   * @description Generate audit log for price calculations
   * @param {BackendPriceCalculation} calculation - Price calculation to log
   * @param {object} context - Context information for the calculation
   * @param {string} [context.userId] - User ID associated with calculation
   * @param {string} [context.contractId] - Contract ID associated with calculation
   * @param {'booking' | 'assignment' | 'update'} context.source - Source of the calculation
   * @security Maintains audit trail of all price calculations
   * @complexity Low - Simple audit logging
   */
  static logPriceCalculation(
    calculation: BackendPriceCalculation,
    context: {
      userId?: string;
      contractId?: string;
      source: 'booking' | 'assignment' | 'update';
    }
  ): void {
    console.log(`[PRICE_AUDIT] ${new Date().toISOString()}`, {
      ...context,
      calculation,
      timestamp: Date.now()
    });
  }

  /**
   * @description Validate price consistency across system
   * @param {object} input - Price calculation input parameters
   * @param {number[]} input.mietfachPrices - Array of Mietfach prices
   * @param {object} [input.zusatzleistungen] - Optional additional services
   * @param {boolean} [input.zusatzleistungen.lagerservice] - Storage service flag
   * @param {boolean} [input.zusatzleistungen.versandservice] - Shipping service flag
   * @param {number} [input.discount] - Discount percentage
   * @param {'basic' | 'premium'} [input.provisionType] - Provision type
   * @param {number} frontendTotal - Frontend calculated total
   * @security Comprehensive validation preventing price manipulation
   * @complexity High - Multi-step validation with error collection
   * @returns {object} Validation result with errors and calculations
   */
  static validatePriceConsistency(
    input: {
      mietfachPrices: number[];
      zusatzleistungen?: {
        lagerservice?: boolean;
        versandservice?: boolean;
      };
      discount?: number;
      provisionType?: 'basic' | 'premium';
    },
    frontendTotal: number
  ): {
    valid: boolean;
    backendCalculation: BackendPriceCalculation;
    difference?: number;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate input
    if (!input.mietfachPrices || input.mietfachPrices.length === 0) {
      errors.push('Mietfach prices are required');
    }
    
    if (input.discount && (input.discount < 0 || input.discount > 1)) {
      errors.push('Discount must be between 0 and 1');
    }

    // Validate Zusatzleistungen
    const hasZusatzleistungen = input.zusatzleistungen && 
      (input.zusatzleistungen.lagerservice || input.zusatzleistungen.versandservice);
    
    if (hasZusatzleistungen && input.provisionType !== 'premium') {
      errors.push('Zusatzleistungen are only available with Premium model (7%)');
    }

    // Calculate backend price
    const backendCalculation = this.calculateBackendPrice(
      input.mietfachPrices,
      input.zusatzleistungen,
      input.discount || 0,
      input.provisionType || 'basic'
    );

    // Validate against frontend
    const validation = this.validateFrontendCalculation(frontendTotal, backendCalculation);
    
    if (!validation.valid) {
      errors.push(`Price mismatch: Frontend ${frontendTotal}€, Backend ${backendCalculation.total}€`);
    }

    return {
      valid: errors.length === 0 && validation.valid,
      backendCalculation,
      difference: validation.difference,
      errors
    };
  }

  /**
   * @description Format price calculation for audit logs
   * @param {BackendPriceCalculation} calculation - Price calculation to format
   * @security Formats calculation details for audit trail
   * @complexity Low - Simple string formatting
   * @returns {string} Formatted calculation string
   */
  static formatCalculationForAudit(calculation: BackendPriceCalculation): string {
    return [
      `Mietfach: ${calculation.mietfachTotal}€`,
      `Zusatzleistungen: ${calculation.zusatzleistungenTotal}€`,
      `Subtotal: ${calculation.subtotal}€`,
      `Discount: ${calculation.discountAmount}€`,
      `Total: ${calculation.total}€`
    ].join(', ');
  }
}

export default PriceValidationService;