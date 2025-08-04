// client/src/services/priceCalculationService.ts

import { Zusatzleistungen } from '../types/common';

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  count?: number;
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
  isWeekly?: boolean;
}

export interface PriceCalculationInput {
  packageOptions: PackageOption[];
  addonOptions?: AddonOption[];
  zusatzleistungen?: Zusatzleistungen;
  rentalDuration: number; // in months
  provisionRate: number; // 4% or 7%
  discount?: number; // as decimal (0.1 = 10%)
}

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

export interface PriceCalculationConfig {
  mietfachPrices: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  zusatzleistungen?: {
    lagerservice?: boolean;
    versandservice?: boolean;
  };
  discount?: number;
  provisionType: 'basic' | 'premium';
  duration?: number; // Monate
}

export interface DetailedPriceBreakdown {
  mietfach: {
    items: Array<{ name: string; price: number }>;
    total: number;
  };
  zusatzleistungen: {
    lagerservice: { active: boolean; price: number };
    versandservice: { active: boolean; price: number };
    total: number;
  };
  subtotal: number;
  discount: {
    percentage: number;
    amount: number;
  };
  total: number;
  monthly: number;
}

// Zusatzleistungen pricing constants (matching backend)
export const ZUSATZLEISTUNGEN_PRICING = {
  lagerservice: 20, // €20/month
  versandservice: 5  // €5/month
};

export class PriceCalculationService {
  /**
   * Calculate discount rate based on rental duration
   */
  static calculateDiscountRate(rentalDuration: number): number {
    if (rentalDuration >= 12) return 0.1; // 10% discount
    if (rentalDuration >= 6) return 0.05; // 5% discount
    return 0;
  }

  /**
   * Validate that Zusatzleistungen are only available with Premium model (7%)
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
   * Calculate package costs from package options
   */
  static calculatePackageCosts(packageOptions: PackageOption[]): number {
    return packageOptions.reduce((total, option) => {
      const count = option.count || 1;
      return total + (option.price * count);
    }, 0);
  }

  /**
   * Calculate addon costs from addon options
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
   * Calculate Zusatzleistungen costs
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
   * Calculate detailed price breakdown with structured output
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
   * Format price for display
   */
  static formatPrice(price: number): string {
    return `${price.toFixed(2)}€`;
  }

  /**
   * Format price change (e.g. +20€)
   */
  static formatPriceChange(price: number): string {
    return price > 0 ? `+${this.formatPrice(price)}` : this.formatPrice(price);
  }

  /**
   * Helper method to format price breakdown
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
   * Convert PackageBuilder data to calculation input
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