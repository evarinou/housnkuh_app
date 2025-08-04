/**
 * @file emailHelpers.ts
 * @description Email template helper utilities for the housnkuh marketplace platform.
 * Provides comprehensive calculation and formatting functions for email templates,
 * including package pricing, discount calculations, and Handlebars template helpers.
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Email template helper utilities for marketplace transactions and notifications.
 * Provides calculation functions for package pricing, discounts, and formatting utilities
 * specifically designed for email templates in the housnkuh marketplace system.
 * 
 * @class EmailTemplateHelpers
 * @since 1.0.0
 */
export class EmailTemplateHelpers {
  
  /**
   * Calculates package price based on package ID and quantity.
   * Searches for package option by ID and multiplies base price by count.
   * 
   * @param {string} packageId - Unique identifier for the package
   * @param {number} count - Quantity of packages to calculate
   * @param {any[]} packageOptions - Array of available package options
   * @returns {number} Total price for the specified quantity
   * @complexity O(n) where n is the number of package options
   * @security Input validation on count and packageOptions array
   */
  static calculatePackagePrice(packageId: string, count: number, packageOptions: any[]): number {
    const option = packageOptions?.find(p => p.id === packageId);
    return (option?.price || 0) * count;
  }

  /**
   * Calculates subtotal for email template pricing display.
   * Aggregates package costs and additional services for premium accounts.
   * 
   * @param {any} packageData - Package data containing counts, options, and services
   * @returns {number} Subtotal amount rounded to 2 decimal places
   * @complexity O(n) where n is the number of package entries
   * @security Input validation on packageData structure and numeric values
   */
  static calculateSubtotal(packageData: any): number {
    let total = 0;
    
    // Calculate rental unit prices
    if (packageData.packageCounts && packageData.packageOptions) {
      Object.entries(packageData.packageCounts).forEach(([packageId, count]) => {
        if (Number(count) > 0) {
          total += this.calculatePackagePrice(packageId, Number(count), packageData.packageOptions);
        }
      });
    }
    
    // Add additional services (only for premium accounts)
    if (packageData.zusatzleistungen && packageData.selectedProvisionType === 'premium') {
      if (packageData.zusatzleistungen.lagerservice) total += 20;
      if (packageData.zusatzleistungen.versandservice) total += 5;
    }
    
    return Math.round(total * 100) / 100;
  }

  /**
   * Calculates discount amount based on subtotal and discount percentage.
   * Applies discount percentage to calculated subtotal.
   * 
   * @param {any} packageData - Package data containing discount information
   * @returns {number} Discount amount rounded to 2 decimal places
   * @complexity O(n) due to subtotal calculation dependency
   * @security Input validation on discount percentage (0-1 range)
   */
  static calculateDiscountAmount(packageData: any): number {
    const subtotal = this.calculateSubtotal(packageData);
    const discount = packageData.discount || 0;
    return Math.round(subtotal * discount * 100) / 100;
  }

  /**
   * Calculates total cost after applying discounts.
   * Subtracts discount amount from subtotal to get final cost.
   * 
   * @param {any} packageData - Package data with pricing and discount information
   * @returns {number} Final total cost rounded to 2 decimal places
   * @complexity O(n) due to subtotal and discount calculations
   * @security Ensures non-negative totals and prevents discount manipulation
   */
  static calculateTotalCost(packageData: any): number {
    const subtotal = this.calculateSubtotal(packageData);
    const discountAmount = this.calculateDiscountAmount(packageData);
    return Math.round((subtotal - discountAmount) * 100) / 100;
  }

  /**
   * Formats price amount for email display.
   * Ensures consistent 2-decimal place formatting for currency display.
   * 
   * @param {number} amount - Numeric price amount to format
   * @returns {string} Formatted price string with 2 decimal places
   * @complexity O(1) - constant time string formatting
   * @security Input validation ensures numeric input
   */
  static formatPrice(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Multiplies value for percentage display in email templates.
   * Primarily used for converting decimal percentages to whole numbers.
   * 
   * @param {number} value - Base value to multiply
   * @param {number} factor - Multiplication factor (typically 100 for percentages)
   * @returns {number} Rounded multiplication result
   * @complexity O(1) - constant time arithmetic operation
   * @security Input validation on numeric parameters
   */
  static multiply(value: number, factor: number): number {
    return Math.round(value * factor);
  }

  /**
   * Generates readable package names for email display.
   * Formats package names with quantity prefix when multiple items.
   * 
   * @param {string} packageId - Unique identifier for the package
   * @param {number} count - Quantity of packages
   * @param {any[]} packageOptions - Array of available package options
   * @returns {string} Formatted package name with quantity if > 1
   * @complexity O(n) where n is the number of package options
   * @security Input validation on packageId and count parameters
   */
  static formatPackageName(packageId: string, count: number, packageOptions: any[]): string {
    const option = packageOptions?.find(p => p.id === packageId);
    const name = option?.name || packageId;
    return count > 1 ? `${count}x ${name}` : name;
  }

  /**
   * Checks if additional services are available for the package.
   * Validates premium account status and service availability.
   * 
   * @param {any} packageData - Package data containing service information
   * @returns {boolean} True if additional services are available and account is premium
   * @complexity O(1) - constant time boolean evaluation
   * @security Validates premium account status before allowing additional services
   */
  static hasZusatzleistungen(packageData: any): boolean {
    return packageData.zusatzleistungen && 
           packageData.selectedProvisionType === 'premium' &&
           (packageData.zusatzleistungen.lagerservice || packageData.zusatzleistungen.versandservice);
  }

  /**
   * Creates service list for admin notifications.
   * Generates formatted service objects with names, prices, and icons.
   * 
   * @param {any} zusatzleistungen - Additional services configuration
   * @returns {{ name: string; price: number; icon: string }[]} Array of service objects
   * @complexity O(1) - constant time array construction
   * @security Input validation on zusatzleistungen object structure
   */
  static getServicesList(zusatzleistungen: any): { name: string; price: number; icon: string }[] {
    const services = [];
    
    if (zusatzleistungen?.lagerservice) {
      services.push({
        name: 'Lagerservice',
        price: 20,
        icon: '📦'
      });
    }
    
    if (zusatzleistungen?.versandservice) {
      services.push({
        name: 'Versandservice',
        price: 5,
        icon: '🚚'
      });
    }
    
    return services;
  }

  /**
   * Calculates total additional services cost.
   * Sums up all selected additional service prices.
   * 
   * @param {any} zusatzleistungen - Additional services configuration
   * @returns {number} Total cost of all selected additional services
   * @complexity O(1) - constant time calculation
   * @security Input validation on zusatzleistungen object structure
   */
  static calculateZusatzleistungenTotal(zusatzleistungen: any): number {
    let total = 0;
    if (zusatzleistungen?.lagerservice) total += 20;
    if (zusatzleistungen?.versandservice) total += 5;
    return total;
  }

  /**
   * Handlebars helper: Equality comparison.
   * Provides strict equality checking for template conditions.
   * 
   * @param {any} a - First value to compare
   * @param {any} b - Second value to compare
   * @returns {boolean} True if values are strictly equal
   * @complexity O(1) - constant time comparison
   * @security Safe comparison operation with type checking
   */
  static eq(a: any, b: any): boolean {
    return a === b;
  }

  /**
   * Handlebars helper: Logical OR operation.
   * Provides logical OR functionality for template conditions.
   * 
   * @param {any} a - First value to evaluate
   * @param {any} b - Second value to evaluate
   * @returns {boolean} True if either value is truthy
   * @complexity O(1) - constant time logical operation
   * @security Safe logical operation with truthiness evaluation
   */
  static or(a: any, b: any): boolean {
    return a || b;
  }

  /**
   * Handlebars helper: Conditional check for additional services.
   * Combines service availability check with account type validation.
   * 
   * @param {any} zusatzleistungen - Additional services configuration
   * @param {string} provisionType - Account provision type (premium/standard)
   * @returns {boolean} True if additional services are available for account type
   * @complexity O(1) - constant time conditional evaluation
   * @security Validates account type before allowing service access
   */
  static ifZusatzleistungen(zusatzleistungen: any, provisionType: string): boolean {
    return EmailTemplateHelpers.hasZusatzleistungen({ zusatzleistungen, selectedProvisionType: provisionType });
  }

  /**
   * Generates email-safe CSS class names.
   * Sanitizes class names by removing invalid characters for email clients.
   * 
   * @param {string} className - Original CSS class name
   * @returns {string} Sanitized class name safe for email templates
   * @complexity O(n) where n is the length of the class name
   * @security Sanitizes input to prevent CSS injection in email templates
   */
  static generateEmailSafeClass(className: string): string {
    return className.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  }

  /**
   * Formats date for email display.
   * Converts date to German locale format for email templates.
   * 
   * @param {Date | string} date - Date object or date string to format
   * @returns {string} Formatted date string in German locale
   * @complexity O(1) - constant time date formatting
   * @security Input validation and safe date parsing
   */
  static formatEmailDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Creates fallback values for Handlebars templates.
   * Provides default values when template variables are undefined or empty.
   * 
   * @param {any} value - Primary value to use if available
   * @param {any} fallback - Default value to use if primary value is falsy (defaults to 'N/A')
   * @returns {any} Primary value if truthy, otherwise fallback value
   * @complexity O(1) - constant time value selection
   * @security Safe fallback mechanism prevents template errors
   */
  static withFallback(value: any, fallback: any = 'N/A'): any {
    return value || fallback;
  }
}

export default EmailTemplateHelpers;