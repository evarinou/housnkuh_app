/**
 * @file Price Calculation Service for the housnkuh marketplace application
 * @description Comprehensive pricing calculation service for packages, addons, and Zusatzleistungen
 * Handles complex pricing calculations including discounts, provisions, and validation
 */

import { 
  MIETFACH_BASE_PRICES, 
  ZUSATZLEISTUNGEN_PRICING,
  MietfachTyp 
} from '../types/zusatzleistungenTypes';

/**
 * Package option interface for rental calculations
 */
export interface PackageOption {
  id: string;
  name: string;
  price: number;
  count?: number;
}

/**
 * Addon option interface for additional services
 */
export interface AddonOption {
  id: string;
  name: string;
  price: number;
  isWeekly?: boolean;
}

/**
 * Zusatzleistungen configuration interface
 */
export interface Zusatzleistungen {
  lagerservice: boolean;
  versandservice: boolean;
}

/**
 * Optional Zusatzleistungen configuration interface
 */
export interface ZusatzleistungenOptions {
  lagerservice?: boolean;
  versandservice?: boolean;
}

/**
 * Input interface for price calculation
 */
export interface PriceCalculationInput {
  packageOptions: PackageOption[];
  addonOptions?: AddonOption[];
  zusatzleistungen?: Zusatzleistungen;
  rentalDuration: number; // in months
  provisionRate: number; // 4% or 7%
  discount?: number; // as decimal (0.1 = 10%)
}

/**
 * Comprehensive price breakdown interface
 */
export interface PriceBreakdown {
  packageCosts: number;
  addonCosts: number;
  zusatzleistungenCosts: number;
  subtotal: number;
  discount: number;
  discountAmount: number;
  monthlyTotal: number;
  totalForDuration: number;
  provision: {
    rate: number;
    monthlyAmount: number;
    totalAmount: number;
  };
}

/**
 * Price Calculation Service for comprehensive pricing calculations
 * @description Handles all pricing calculations including packages, addons, discounts, and provisions
 */
export class PriceCalculationService {
  /**
   * Calculates discount rate based on rental duration
   * @description Determines automatic discount based on rental duration tiers
   * @param rentalDuration - Duration of rental in months
   * @returns number - Discount rate as decimal (0.1 = 10%)
   * @complexity O(1) - Simple conditional logic
   * @security Static method with input validation
   */
  static calculateDiscountRate(rentalDuration: number): number {
    if (rentalDuration >= 12) return 0.1; // 10% discount
    if (rentalDuration >= 6) return 0.05; // 5% discount
    return 0;
  }

  /**
   * Validates that Zusatzleistungen are only available with Premium model (7%)
   * @description Ensures Zusatzleistungen are only used with Premium provision rate
   * @param zusatzleistungen - Zusatzleistungen configuration to validate
   * @param provisionRate - Provision rate to validate against (4% or 7%)
   * @returns boolean - True if valid, false if invalid
   * @complexity O(1) - Simple boolean validation
   * @security Business rule validation for service availability
   */
  static validateZusatzleistungen(zusatzleistungen: Zusatzleistungen, provisionRate: number): boolean {
    const hasZusatzleistungen = zusatzleistungen.lagerservice || zusatzleistungen.versandservice;
    return !hasZusatzleistungen || provisionRate === 7;
  }

  /**
   * Calculates package costs from package options
   * @description Sums up all package options considering quantity
   * @param packageOptions - Array of package options to calculate
   * @returns number - Total package costs
   * @complexity O(n) where n is number of package options
   * @security Static method with safe arithmetic operations
   */
  static calculatePackageCosts(packageOptions: PackageOption[]): number {
    return packageOptions.reduce((total, option) => {
      const count = option.count || 1;
      return total + (option.price * count);
    }, 0);
  }

  /**
   * Calculates addon costs from addon options
   * @description Sums up addon costs with weekly to monthly conversion
   * @param addonOptions - Array of addon options to calculate
   * @returns number - Total addon costs
   * @complexity O(n) where n is number of addon options
   * @security Static method with weekly/monthly conversion logic
   */
  static calculateAddonCosts(addonOptions: AddonOption[]): number {
    return addonOptions.reduce((total, addon) => {
      if (addon.isWeekly) {
        return total + (addon.price * 4); // Convert weekly to monthly
      }
      return total + addon.price;
    }, 0);
  }

  /**
   * Calculates Zusatzleistungen costs
   * @description Calculates costs for additional services with Premium validation
   * @param zusatzleistungen - Zusatzleistungen configuration
   * @param provisionRate - Provision rate for validation (must be 7%)
   * @returns number - Total Zusatzleistungen costs
   * @complexity O(1) - Simple conditional addition
   * @security Validates Premium model requirement
   */
  static calculateZusatzleistungenCosts(zusatzleistungen: Zusatzleistungen, provisionRate: number): number {
    // Only allow Zusatzleistungen with Premium model (7%)
    if (provisionRate !== 7) return 0;

    let costs = 0;
    if (zusatzleistungen.lagerservice) {
      costs += ZUSATZLEISTUNGEN_PRICING.lagerservice;
    }
    if (zusatzleistungen.versandservice) {
      costs += ZUSATZLEISTUNGEN_PRICING.versandservice;
    }
    return costs;
  }

  /**
   * Main price calculation method
   * @description Performs comprehensive price calculation with validation and breakdown
   * @param input - Price calculation input with all parameters
   * @returns PriceBreakdown - Detailed breakdown of all pricing components
   * @complexity O(n) where n is total number of options
   * @security Comprehensive input validation and business rule enforcement
   */
  static calculatePrice(input: PriceCalculationInput): PriceBreakdown {
    // Validate input
    if (!input.packageOptions || input.packageOptions.length === 0) {
      throw new Error('At least one package option is required');
    }

    if (input.rentalDuration < 1 || input.rentalDuration > 24) {
      throw new Error('Rental duration must be between 1 and 24 months');
    }

    if (![4, 7].includes(input.provisionRate)) {
      throw new Error('Provision rate must be either 4% (Basic) or 7% (Premium)');
    }

    // Validate Zusatzleistungen
    if (input.zusatzleistungen && !this.validateZusatzleistungen(input.zusatzleistungen, input.provisionRate)) {
      throw new Error('Zusatzleistungen are only available with Premium model (7%)');
    }

    // Calculate individual cost components
    const packageCosts = this.calculatePackageCosts(input.packageOptions);
    const addonCosts = input.addonOptions ? this.calculateAddonCosts(input.addonOptions) : 0;
    const zusatzleistungenCosts = input.zusatzleistungen 
      ? this.calculateZusatzleistungenCosts(input.zusatzleistungen, input.provisionRate) 
      : 0;

    // Calculate subtotal and discount
    const subtotal = packageCosts + addonCosts + zusatzleistungenCosts;
    const discount = input.discount || this.calculateDiscountRate(input.rentalDuration);
    const discountAmount = subtotal * discount;
    const monthlyTotal = subtotal - discountAmount;
    const totalForDuration = monthlyTotal * input.rentalDuration;

    // Calculate provision
    const monthlyProvisionAmount = monthlyTotal * (input.provisionRate / 100);
    const totalProvisionAmount = monthlyProvisionAmount * input.rentalDuration;

    return {
      packageCosts,
      addonCosts,
      zusatzleistungenCosts,
      subtotal,
      discount: discount * 100, // Convert to percentage
      discountAmount,
      monthlyTotal,
      totalForDuration,
      provision: {
        rate: input.provisionRate,
        monthlyAmount: monthlyProvisionAmount,
        totalAmount: totalProvisionAmount
      }
    };
  }

  /**
   * Normalizes ZusatzleistungenOptions to Zusatzleistungen
   * @description Converts optional Zusatzleistungen to required format with defaults
   * @param zusatzleistungen - Optional Zusatzleistungen configuration
   * @returns Zusatzleistungen - Normalized configuration with boolean values
   * @complexity O(1) - Simple object transformation
   * @security Static method with safe default values
   */
  static normalizeZusatzleistungen(zusatzleistungen?: ZusatzleistungenOptions): Zusatzleistungen {
    return {
      lagerservice: zusatzleistungen?.lagerservice || false,
      versandservice: zusatzleistungen?.versandservice || false
    };
  }

  /**
   * Calculates price for a specific Mietfach type with Zusatzleistungen
   * @description Alternative method for direct Mietfach-based calculations
   * @param mietfachTyp - Type of Mietfach to calculate pricing for
   * @param rentalDuration - Duration of rental in months
   * @param provisionRate - Provision rate (4% or 7%)
   * @param zusatzleistungen - Optional Zusatzleistungen configuration
   * @returns PriceBreakdown - Complete price breakdown for the Mietfach
   * @complexity O(1) - Direct calculation with base price lookup
   * @security Validates Mietfach type and delegates to main calculation
   */
  static calculateMietfachPrice(
    mietfachTyp: MietfachTyp,
    rentalDuration: number,
    provisionRate: number,
    zusatzleistungen?: ZusatzleistungenOptions
  ): PriceBreakdown {
    const basePrice = MIETFACH_BASE_PRICES[mietfachTyp];
    if (!basePrice) {
      throw new Error(`Invalid Mietfach type: ${mietfachTyp}`);
    }

    const packageOptions: PackageOption[] = [{
      id: `mietfach-${mietfachTyp}`,
      name: `Mietfach ${mietfachTyp}`,
      price: basePrice,
      count: 1
    }];

    return this.calculatePrice({
      packageOptions,
      zusatzleistungen: this.normalizeZusatzleistungen(zusatzleistungen),
      rentalDuration,
      provisionRate
    });
  }

  /**
   * Helper method to format price breakdown for API responses
   * @description Formats price breakdown with proper decimal precision for API
   * @param breakdown - Price breakdown to format
   * @returns any - Formatted price breakdown with proper decimal places
   * @complexity O(1) - Simple formatting operations
   * @security Static method with safe number formatting
   */
  static formatPriceBreakdown(breakdown: PriceBreakdown): any {
    return {
      packageCosts: Number(breakdown.packageCosts.toFixed(2)),
      addonCosts: Number(breakdown.addonCosts.toFixed(2)),
      zusatzleistungenCosts: Number(breakdown.zusatzleistungenCosts.toFixed(2)),
      subtotal: Number(breakdown.subtotal.toFixed(2)),
      discount: Number(breakdown.discount.toFixed(1)),
      discountAmount: Number(breakdown.discountAmount.toFixed(2)),
      monthlyTotal: Number(breakdown.monthlyTotal.toFixed(2)),
      totalForDuration: Number(breakdown.totalForDuration.toFixed(2)),
      provision: {
        rate: breakdown.provision.rate,
        monthlyAmount: Number(breakdown.provision.monthlyAmount.toFixed(2)),
        totalAmount: Number(breakdown.provision.totalAmount.toFixed(2))
      }
    };
  }
}

export default PriceCalculationService;