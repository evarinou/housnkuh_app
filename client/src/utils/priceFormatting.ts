// client/src/utils/priceFormatting.ts
export class PriceFormatter {
  /**
   * Deutsche Währungsformatierung
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
   * Kurze Preisanzeige für UI
   */
  static formatShort(amount: number): string {
    return `${amount.toFixed(2)}€`;
  }

  /**
   * Preisänderung mit + oder - Vorzeichen
   */
  static formatChange(amount: number): string {
    const formatted = this.formatShort(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  /**
   * Monatliche Preisanzeige
   */
  static formatMonthly(amount: number): string {
    return `${this.formatShort(amount)}/Monat`;
  }

  /**
   * Preisrange für Min-Max Anzeige
   */
  static formatRange(min: number, max: number): string {
    if (min === max) {
      return this.formatShort(min);
    }
    return `${this.formatShort(min)} - ${this.formatShort(max)}`;
  }

  /**
   * Provision calculation display
   */
  static formatProvision(amount: number, rate: number): string {
    return `${this.formatShort(amount)} (${rate}%)`;
  }

  /**
   * Discount display
   */
  static formatDiscount(amount: number, percentage: number): string {
    return `${this.formatShort(amount)} (${percentage.toFixed(0)}% Rabatt)`;
  }

  /**
   * Format large amounts with thousands separator
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

export default PriceFormatter;