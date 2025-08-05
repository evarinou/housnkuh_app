/**
 * @file PriceBreakdownDisplay.tsx
 * @purpose Component for displaying detailed price breakdowns for rental packages and additional services
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React from 'react';
import { PriceBreakdown, PriceCalculationService } from '../../services/priceCalculationService';

/**
 * Additional services configuration for price breakdown display
 * @interface ZusatzleistungenConfig
 */
interface ZusatzleistungenConfig {
  /** Whether storage service (Lagerservice) is included */
  lagerservice: boolean;
  /** Whether shipping service (Versandservice) is included */
  versandservice: boolean;
}

/**
 * Props interface for PriceBreakdownDisplay component
 * @interface PriceBreakdownProps
 */
interface PriceBreakdownProps {
  /** Price breakdown data containing all cost components */
  breakdown: PriceBreakdown;
  /** Whether to show detailed breakdown sections (defaults to true) */
  showDetails?: boolean;
  /** Additional CSS classes to apply to the root element */
  className?: string;
  /** Configuration for additional services to display */
  zusatzleistungen?: ZusatzleistungenConfig;
}

/**
 * Price breakdown display component that shows detailed cost structure for rental packages.
 * 
 * Features:
 * - Hierarchical cost breakdown (packages, addons, services)
 * - German currency formatting (€)
 * - Collapsible details view
 * - Visual indicators for different service types
 * - Discount calculation and display
 * - Monthly total with prominent styling
 * - Tailwind CSS styling with semantic colors
 * 
 * Sections Displayed:
 * - Mietfächer: Base package costs and addon costs
 * - Zusatzleistungen: Additional services (storage, shipping)
 * - Zwischensumme: Subtotal before discounts
 * - Rabatt: Discount amount and percentage
 * - Gesamt: Final monthly total
 * 
 * @component
 * @param {PriceBreakdownProps} props - Component props
 * @returns {JSX.Element} Rendered price breakdown display
 */
export const PriceBreakdownDisplay: React.FC<PriceBreakdownProps> = ({
  breakdown,
  showDetails = true,
  className = '',
  zusatzleistungen
}) => {
  /**
   * Formats a price number to German currency format with Euro symbol
   * @param {number} price - Price value to format
   * @returns {string} Formatted price string (e.g., "25.50€")
   */
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)}€`;
  };

  /**
   * Formats a price change with appropriate sign prefix for positive values
   * @param {number} price - Price change value to format
   * @returns {string} Formatted price change string (e.g., "+5.00€" or "-2.50€")
   */
  const formatPriceChange = (price: number): string => {
    return price > 0 ? `+${formatPrice(price)}` : formatPrice(price);
  };

  return (
    <div className={`price-breakdown bg-gray-50 p-4 rounded-lg ${className}`}>
      {showDetails && (
        <>
          {/* Package/Mietfach-Preise */}
          <div className="package-section mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Mietfächer</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Grundpreis Mietfächer</span>
                <span>{formatPrice(breakdown.packageCosts)}</span>
              </div>
              {breakdown.addonCosts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Zusatzoptionen</span>
                  <span>{formatPrice(breakdown.addonCosts)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-medium mt-2 pt-2 border-t border-gray-200">
              <span>Basis Gesamt:</span>
              <span>{formatPrice(breakdown.packageCosts + breakdown.addonCosts)}</span>
            </div>
          </div>

          {/* Zusatzleistungen */}
          {breakdown.zusatzleistungenCosts > 0 && (
            <div className="zusatzleistungen-section mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">Zusatzleistungen</h4>
              <div className="space-y-1">
                {zusatzleistungen?.lagerservice && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-green-600 flex items-center">
                      <span className="mr-2">📦</span>
                      Lagerservice (20€/Monat)
                    </span>
                    <span className="text-green-600">
                      {formatPriceChange(20)}
                    </span>
                  </div>
                )}
                {zusatzleistungen?.versandservice && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-blue-600 flex items-center">
                      <span className="mr-2">🚚</span>
                      Versandservice (5€/Monat)
                    </span>
                    <span className="text-blue-600">
                      {formatPriceChange(5)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-medium mt-2 pt-2 border-t border-gray-200">
                <span>Zusatzleistungen Gesamt:</span>
                <span>{formatPrice(breakdown.zusatzleistungenCosts)}</span>
              </div>
            </div>
          )}

          {/* Zwischensumme */}
          <div className="flex justify-between font-medium py-2 border-t border-gray-300">
            <span>Zwischensumme:</span>
            <span>{formatPrice(breakdown.subtotal)}</span>
          </div>

          {/* Rabatt */}
          {breakdown.discountAmount > 0 && (
            <div className="flex justify-between text-red-600 text-sm">
              <span>Rabatt ({breakdown.discount.toFixed(0)}%):</span>
              <span>-{formatPrice(breakdown.discountAmount)}</span>
            </div>
          )}
        </>
      )}

      {/* Gesamtsumme */}
      <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-gray-400">
        <span>Gesamt:</span>
        <span className="text-green-600">
          {formatPrice(breakdown.monthlyTotal)}/Monat
        </span>
      </div>
    </div>
  );
};

export default PriceBreakdownDisplay;