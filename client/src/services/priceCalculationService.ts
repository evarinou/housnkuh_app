/**
 * @file priceCalculationService.ts
 * @purpose Advanced price calculation service for rental packages, addons, and commission calculations with discount and validation logic
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import { Zusatzleistungen } from '../types/common';

/**
 * Package option for price calculation
 * @interface PackageOption
 */
export interface PackageOption {
  /** Unique identifier for the package */
  id: string;
  /** Display name of the package */
  name: string;
  /** Monthly price per unit */
  price: number;
  /** Number of units (optional, defaults to 1) */
  count?: number;
}

/**
 * Addon option for additional services
 * @interface AddonOption
 */
export interface AddonOption {
  /** Unique identifier for the addon */
  id: string;
  /** Display name of the addon */
  name: string;
  /** Price per period */
  price: number;
  /** Whether pricing is weekly (converts to monthly) */
  isWeekly?: boolean;
}

/**
 * Input parameters for price calculation
 * @interface PriceCalculationInput
 */
export interface PriceCalculationInput {
  /** Required package options to calculate */
  packageOptions: PackageOption[];
  /** Optional addon services */
  addonOptions?: AddonOption[];
  /** Optional premium services (only with 7% commission) */
  zusatzleistungen?: Zusatzleistungen;
  /** Rental duration in months (1-24) */
  rentalDuration: number;
  /** Commission rate: 4% (Basic) or 7% (Premium) */
  provisionRate: number;
  /** Optional discount as decimal (0.1 = 10%) */
  discount?: number;
}

/**
 * Detailed breakdown of calculated pricing
 * @interface PriceBreakdown
 */
export interface PriceBreakdown {
  /** Total cost of all packages */
  packageCosts: number;
  /** Total cost of all addons */
  addonCosts: number;
  /** Total cost of premium services */
  zusatzleistungenCosts: number;
  /** Sum before discount */
  subtotal: number;
  /** Discount percentage applied */
  discount: number;
  /** Actual discount amount in euros */
  discountAmount: number;
  /** Final monthly total after discount */
  monthlyTotal: number;
  /** Total cost for entire rental duration */
  totalForDuration: number;
  /** Commission calculation details */
  provision: {
    /** Commission rate (4 or 7) */
    rate: number;
    /** Monthly commission amount */
    monthlyAmount: number;
    /** Total commission for duration */
    totalAmount: number;
  };
}

/**
 * Configuration for detailed price calculation
 * @interface PriceCalculationConfig
 */
export interface PriceCalculationConfig {
  /** Array of selected storage compartment prices */
  mietfachPrices: Array<{
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Monthly price */
    price: number;
  }>;
  /** Optional premium services configuration */
  zusatzleistungen?: {
    /** Storage service (€20/month) */
    lagerservice?: boolean;
    /** Shipping service (€5/month) */
    versandservice?: boolean;
  };
  /** Optional discount as decimal */
  discount?: number;
  /** Commission model type */
  provisionType: 'basic' | 'premium';
  /** Optional rental duration in months */
  duration?: number;
}

/**
 * Structured detailed price breakdown with itemized costs
 * @interface DetailedPriceBreakdown
 */
export interface DetailedPriceBreakdown {
  /** Storage compartment breakdown */
  mietfach: {
    /** Individual compartment items */
    items: Array<{ name: string; price: number }>;
    /** Total compartment costs */
    total: number;
  };
  /** Premium services breakdown */
  zusatzleistungen: {
    /** Storage service details */
    lagerservice: { active: boolean; price: number };
    /** Shipping service details */
    versandservice: { active: boolean; price: number };
    /** Total premium services cost */
    total: number;
  };
  /** Subtotal before discount */
  subtotal: number;
  /** Discount information */
  discount: {
    /** Discount percentage */
    percentage: number;
    /** Discount amount in euros */
    amount: number;
  };
  /** Final total after discount */
  total: number;
  /** Monthly payment amount */
  monthly: number;
}

/**
 * Premium services pricing constants (synchronized with backend)
 * @constant
 */
export const ZUSATZLEISTUNGEN_PRICING = {
  /** Storage service monthly cost */
  lagerservice: 20, // €20/month
  /** Shipping service monthly cost */
  versandservice: 5  // €5/month
};

/**
 * Advanced price calculation service for rental marketplace
 * 
 * Handles complex pricing logic including:
 * - Package and addon calculations
 * - Duration-based discounts
 * - Commission calculations (4% Basic, 7% Premium)
 * - Premium service validation and pricing
 * - Multi-format price breakdown generation
 * 
 * @class PriceCalculationService
 * @complexity High - Financial calculations with validation
 */
export class PriceCalculationService {
  /**
   * Calculate discount rate based on rental duration
   * 
   * @description Applies tiered discount system:
   * - 12+ months: 10% discount
   * - 6+ months: 5% discount  
   * - <6 months: No discount
   * 
   * @param {number} rentalDuration - Duration in months
   * @returns {number} Discount rate as decimal (0.1 = 10%)
   */
  static calculateDiscountRate(rentalDuration: number): number {
    if (rentalDuration >= 12) return 0.1; // 10% discount
    if (rentalDuration >= 6) return 0.05; // 5% discount
    return 0;
  }

  /**
   * Validate that premium services are only available with Premium model (7%)
   * 
   * @description Business rule enforcement: Premium services (Lagerservice, Versandservice)
   * can only be selected with the Premium commission model (7%).
   * 
   * @param {any} zusatzleistungen - Premium services configuration
   * @param {'basic' | 'premium' | number} provisionType - Commission model or rate
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  static validateZusatzleistungen(
    zusatzleistungen: any,
    provisionType: 'basic' | 'premium' | number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const hasZusatzleistungen = zusatzleistungen && 
      (zusatzleistungen.lagerservice || zusatzleistungen.versandservice);
    
    // Handle both string and number provision types
    const isPremium = provisionType === 'premium' || provisionType === 7;
    
    if (hasZusatzleistungen && !isPremium) {
      errors.push('Zusatzleistungen sind nur mit dem Premium-Provisionsmodell (7%) verfügbar');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate total costs for all selected packages
   * 
   * @description Sums up package costs considering quantity multipliers.
   * Handles optional count field (defaults to 1 if not specified).
   * 
   * @param {PackageOption[]} packageOptions - Array of selected packages
   * @returns {number} Total package costs in euros
   */
  static calculatePackageCosts(packageOptions: PackageOption[]): number {
    return packageOptions.reduce((total, option) => {
      const count = option.count || 1;
      return total + (option.price * count);
    }, 0);
  }

  /**
   * Calculate total costs for all selected addon services
   * 
   * @description Sums addon costs with weekly-to-monthly conversion.
   * Weekly addons are multiplied by 4 to get monthly equivalent.
   * 
   * @param {AddonOption[]} addonOptions - Array of selected addons
   * @returns {number} Total addon costs in euros (monthly)
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
   * Calculate premium services costs with business rule validation
   * 
   * @description Calculates costs for Lagerservice (€20/month) and Versandservice (€5/month).
   * Only available with Premium commission model (7%). Returns 0 for Basic model (4%).
   * 
   * @param {Zusatzleistungen} zusatzleistungen - Premium services configuration
   * @param {number} provisionRate - Commission rate (4 or 7)
   * @returns {number} Total premium services costs in euros
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
   * Main price calculation method with comprehensive validation and breakdown
   * 
   * @description Core pricing engine that:
   * - Validates all input parameters
   * - Calculates package, addon, and premium service costs
   * - Applies duration-based or custom discounts
   * - Computes commission amounts
   * - Returns detailed price breakdown
   * 
   * @param {PriceCalculationInput} input - Complete pricing input parameters
   * @returns {PriceBreakdown} Detailed breakdown of all costs and calculations
   * @throws {Error} When validation fails or invalid parameters provided
   * @complexity High - Central business logic with multiple validation rules
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
    const discount = input.discount !== undefined ? input.discount : this.calculateDiscountRate(input.rentalDuration);
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
   * Calculate detailed price breakdown with structured itemized output
   * 
   * @description Alternative calculation method that produces structured breakdown
   * with separate itemization for compartments and premium services.
   * Used for detailed display and reporting purposes.
   * 
   * @param {PriceCalculationConfig} config - Configuration with itemized prices
   * @returns {DetailedPriceBreakdown} Structured breakdown with itemized costs
   */
  static calculateDetailedPrice(config: PriceCalculationConfig): DetailedPriceBreakdown {
    // Mietfach-Preise berechnen
    const mietfachTotal = config.mietfachPrices.reduce((sum, item) => sum + item.price, 0);
    
    // Zusatzleistungen berechnen (nur bei Premium)
    let zusatzleistungenTotal = 0;
    const zusatzleistungenBreakdown = {
      lagerservice: { active: false, price: 0 },
      versandservice: { active: false, price: 0 },
      total: 0
    };

    if (config.zusatzleistungen && config.provisionType === 'premium') {
      if (config.zusatzleistungen.lagerservice) {
        zusatzleistungenBreakdown.lagerservice = {
          active: true,
          price: ZUSATZLEISTUNGEN_PRICING.lagerservice
        };
        zusatzleistungenTotal += ZUSATZLEISTUNGEN_PRICING.lagerservice;
      }
      
      if (config.zusatzleistungen.versandservice) {
        zusatzleistungenBreakdown.versandservice = {
          active: true,
          price: ZUSATZLEISTUNGEN_PRICING.versandservice
        };
        zusatzleistungenTotal += ZUSATZLEISTUNGEN_PRICING.versandservice;
      }
    }
    
    zusatzleistungenBreakdown.total = zusatzleistungenTotal;

    // Zwischensumme
    const subtotal = mietfachTotal + zusatzleistungenTotal;
    
    // Rabatt berechnen
    const discountPercentage = config.discount || 0;
    const discountAmount = subtotal * discountPercentage;
    
    // Gesamtsumme
    const total = subtotal - discountAmount;

    return {
      mietfach: {
        items: config.mietfachPrices.map(item => ({
          name: item.name,
          price: item.price
        })),
        total: mietfachTotal
      },
      zusatzleistungen: zusatzleistungenBreakdown,
      subtotal,
      discount: {
        percentage: discountPercentage,
        amount: discountAmount
      },
      total,
      monthly: total
    };
  }


  /**
   * Format price value for user display
   * 
   * @description Formats numeric price to string with euro symbol and 2 decimal places.
   * 
   * @param {number} price - Price value to format
   * @returns {string} Formatted price string (e.g., "25.50€")
   */
  static formatPrice(price: number): string {
    return `${price.toFixed(2)}€`;
  }

  /**
   * Format price change with positive/negative indicator
   * 
   * @description Formats price changes with explicit + sign for positive values.
   * Used for showing price differences and adjustments.
   * 
   * @param {number} price - Price change value
   * @returns {string} Formatted price change (e.g., "+20.00€", "-5.50€")
   */
  static formatPriceChange(price: number): string {
    return price > 0 ? `+${this.formatPrice(price)}` : this.formatPrice(price);
  }

  /**
   * Format price breakdown with rounded decimal precision
   * 
   * @description Formats all numeric values in breakdown to appropriate decimal places.
   * Ensures consistent precision for financial display (2 decimals for prices, 1 for percentages).
   * 
   * @param {PriceBreakdown} breakdown - Raw price breakdown to format
   * @returns {any} Formatted breakdown with consistent precision
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

  /**
   * Convert PackageBuilder UI data to standardized calculation input
   * 
   * @description Transforms UI state from package builder into structured input
   * for price calculation. Handles data mapping, filtering, and validation.
   * Excludes "auf Anfrage" (on request) items from calculations.
   * 
   * @param {Record<string, number>} packageCounts - Package ID to quantity mapping
   * @param {string[]} selectedAddons - Array of selected addon IDs
   * @param {any[]} packageOptions - Available package option definitions
   * @param {any[]} addonOptions - Available addon option definitions
   * @param {Zusatzleistungen} zusatzleistungen - Premium services configuration
   * @param {number} rentalDuration - Rental duration in months
   * @param {number} provisionRate - Commission rate (4 or 7)
   * @returns {PriceCalculationInput} Standardized input for price calculation
   * @throws {Error} When addon option not found
   * @complexity Medium - Data transformation with validation
   */
  static fromPackageBuilderData(
    packageCounts: Record<string, number>,
    selectedAddons: string[],
    packageOptions: any[],
    addonOptions: any[],
    zusatzleistungen: Zusatzleistungen,
    rentalDuration: number,
    provisionRate: number
  ): PriceCalculationInput {
    // Convert package counts to package options
    const packages: PackageOption[] = [];
    Object.entries(packageCounts).forEach(([packageId, count]) => {
      if (count > 0) {
        const option = packageOptions.find(p => p.id === packageId);
        if (option && option.priceDisplay !== 'auf Anfrage') { // Skip "auf Anfrage" items
          packages.push({
            id: packageId,
            name: option.name,
            price: option.price,
            count: count
          });
        }
      }
    });

    // Convert selected addons to addon options
    const addons: AddonOption[] = selectedAddons.map(addonId => {
      const option = addonOptions.find(a => a.id === addonId);
      if (!option) throw new Error(`Addon option not found: ${addonId}`);
      return {
        id: addonId,
        name: option.name,
        price: option.price,
        isWeekly: option.isWeekly || false
      };
    });

    return {
      packageOptions: packages,
      addonOptions: addons,
      zusatzleistungen,
      rentalDuration,
      provisionRate
    };
  }
}

export default PriceCalculationService;