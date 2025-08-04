// client/src/components/common/PriceBreakdownDisplay.tsx
import React from 'react';
import { PriceBreakdown, PriceCalculationService } from '../../services/priceCalculationService';

interface PriceBreakdownProps {
  breakdown: PriceBreakdown;
  showDetails?: boolean;
  className?: string;
  zusatzleistungen?: {
    lagerservice: boolean;
    versandservice: boolean;
  };
}

export const PriceBreakdownDisplay: React.FC<PriceBreakdownProps> = ({
  breakdown,
  showDetails = true,
  className = '',
  zusatzleistungen
}) => {
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)}€`;
  };

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