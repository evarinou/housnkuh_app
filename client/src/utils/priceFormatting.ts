/**
 * @file priceFormatting.ts
 * @purpose Price formatting utilities for German locale with various display formats for UI components
 * @created 2025-01-15
 * @modified 2025-08-05
 */

/**
 * Price formatting utility class for consistent price display across the application
 * 
 * @description Provides various price formatting methods for German locale,
 * including currency formatting, ranges, discounts, and provisions.
 * All methods use German formatting conventions (€ symbol, comma decimal separator).
 * 
 * @class PriceFormatter
 */
export class PriceFormatter {
  /**
   * Format amount as German currency with full Intl formatting
   * 
   * @description Uses Intl.NumberFormat for proper German currency formatting
   * with Euro symbol and German number formatting (1.234,56 €).
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string (e.g., "1.234,56 €")
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format amount as short price string for UI display
   * 
   * @description Simple formatting with 2 decimal places and € suffix.
   * Used for compact UI elements where space is limited.
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Short formatted price (e.g., "25.50€")
   */
  static formatShort(amount: number): string {
    return `${amount.toFixed(2)}€`;
  }

  /**
   * Format price change with explicit positive/negative indicator
   * 
   * @description Shows price differences with + or - prefix.
   * Used for displaying price adjustments and changes.
   * 
   * @param {number} amount - Price change amount
   * @returns {string} Formatted price change (e.g., "+5.00€", "-10.50€")
   */
  static formatChange(amount: number): string {
    const formatted = this.formatShort(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  /**
   * Format amount with monthly suffix for subscription pricing
   * 
   * @description Adds "/Monat" suffix to price for recurring billing display.
   * Used in subscription and rental pricing contexts.
   * 
   * @param {number} amount - Monthly amount to format
   * @returns {string} Formatted monthly price (e.g., "25.50€/Monat")
   */
  static formatMonthly(amount: number): string {
    return `${this.formatShort(amount)}/Monat`;
  }

  /**
   * Format price range for min-max display
   * 
   * @description Shows price range with dash separator, or single price if min equals max.
   * Used for displaying price ranges in package options and pricing tiers.
   * 
   * @param {number} min - Minimum price
   * @param {number} max - Maximum price
   * @returns {string} Formatted price range (e.g., "10.00€ - 50.00€" or "25.00€")
   */
  static formatRange(min: number, max: number): string {
    if (min === max) {
      return this.formatShort(min);
    }
    return `${this.formatShort(min)} - ${this.formatShort(max)}`;
  }

  /**
   * Format commission/provision amount with rate display
   * 
   * @description Shows commission amount with percentage rate in parentheses.
   * Used for displaying commission calculations in admin and vendor views.
   * 
   * @param {number} amount - Commission amount
   * @param {number} rate - Commission rate percentage
   * @returns {string} Formatted provision (e.g., "15.00€ (4%)")
   */
  static formatProvision(amount: number, rate: number): string {
    return `${this.formatShort(amount)} (${rate}%)`;
  }

  /**
   * Format discount amount with percentage display
   * 
   * @description Shows discount amount with percentage and "Rabatt" label.
   * Used for displaying discount information in pricing breakdowns.
   * 
   * @param {number} amount - Discount amount
   * @param {number} percentage - Discount percentage
   * @returns {string} Formatted discount (e.g., "5.00€ (10% Rabatt)")
   */
  static formatDiscount(amount: number, percentage: number): string {
    return `${this.formatShort(amount)} (${percentage.toFixed(0)}% Rabatt)`;
  }

  /**
   * Format large amounts with thousands separator
   * 
   * @description Uses German Intl formatting for amounts ≥1000 with thousands separators.
   * Falls back to formatShort for smaller amounts.
   * 
   * @param {number} amount - Amount to format
   * @returns {string} Formatted large amount (e.g., "1.234,56€" or "25.50€")
   */
  static formatLarge(amount: number): string {
    if (amount >= 1000) {
      return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount) + '€';
    }
    return this.formatShort(amount);
  }
}

/**
 * Default export of PriceFormatter class
 * @default PriceFormatter
 */
export default PriceFormatter;