/**
 * @file PriceSummary.tsx
 * @purpose Price calculation and summary component for booking flow with rental duration selection and cost breakdown
 * @created 2025-01-15
 * @modified 2025-08-05
 * @complexity High - Complex pricing calculations, discounts, provision types, and package combinations
 */

import React from 'react';
import { Zusatzleistungen } from '../../types';

/**
 * Provision type configuration for commission models
 * @interface ProvisionType
 * @param {string} id - Unique identifier for the provision type
 * @param {string} name - Display name of the provision model
 * @param {number} rate - Commission rate as percentage (0-100)
 * @param {string} description - Detailed description of the provision model
 * @param {string[]} benefits - List of benefits included in this provision model
 */
interface ProvisionType {
  id: string;
  name: string;
  rate: number;
  description: string;
  benefits: string[];
}

/**
 * Package option configuration for rental packages
 * @interface PackageOption
 * @param {string} id - Unique identifier for the package
 * @param {string} name - Display name of the package
 * @param {number} price - Monthly rental price in euros
 * @param {string} description - Brief description of the package
 * @param {string} image - Image URL for the package
 * @param {string} detail - Detailed description of package features
 * @param {'standard' | 'cooled' | 'premium' | 'visibility'} category - Package category type
 * @param {string} [priceDisplay] - Optional custom price display format
 */
interface PackageOption {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  detail: string;
  category: 'standard' | 'cooled' | 'premium' | 'visibility';
  priceDisplay?: string;
}

/**
 * Total cost breakdown structure
 * @interface TotalCost
 * @param {number} monthly - Monthly recurring costs in euros
 * @param {number} oneTime - One-time setup costs in euros
 * @param {number} provision - Provision rate as percentage
 */
interface TotalCost {
  monthly: number;
  oneTime: number;
  provision: number;
}

/**
 * Props for PriceSummary component
 * @interface PriceSummaryProps
 * @param {ProvisionType[]} provisionTypes - Available provision/commission models
 * @param {PackageOption[]} packageOptions - Available rental packages
 * @param {string} selectedProvisionType - Currently selected provision type ID
 * @param {Record<string, number>} packageCounts - Count of selected packages by ID
 * @param {number} rentalDuration - Selected rental duration in months (3, 6, or 12)
 * @param {TotalCost} totalCost - Calculated total costs breakdown
 * @param {Zusatzleistungen} zusatzleistungen - Additional services selection
 * @param {number} discountRate - Applied discount rate (0-1, e.g., 0.1 for 10%)
 * @param {function} onRentalDurationChange - Callback for rental duration changes
 */
interface PriceSummaryProps {
  provisionTypes: ProvisionType[];
  packageOptions: PackageOption[];
  selectedProvisionType: string;
  packageCounts: Record<string, number>;
  rentalDuration: number;
  totalCost: TotalCost;
  zusatzleistungen: Zusatzleistungen;
  discountRate: number;
  onRentalDurationChange: (duration: number) => void;
}

/**
 * PriceSummary component displays rental duration selection and comprehensive cost breakdown
 * 
 * Features:
 * - Rental duration selection (3, 6, 12 months) with discount indicators
 * - Real-time cost calculations including discounts
 * - Package selection summary with individual pricing
 * - Provision model display with commission rates
 * - Additional services (Zusatzleistungen) breakdown
 * - Visibility packages (Schaufenster) counting
 * 
 * Business Logic:
 * - 6 months: 5% discount
 * - 12 months: 10% discount
 * - Premium provision includes additional services
 * - Complex package counting and categorization
 * 
 * @param {PriceSummaryProps} props - Component configuration and data
 * @returns {JSX.Element} Price summary component with duration selection and cost breakdown
 */
const PriceSummary: React.FC<PriceSummaryProps> = ({
  provisionTypes,
  packageOptions,
  selectedProvisionType,
  packageCounts,
  rentalDuration,
  totalCost,
  zusatzleistungen,
  discountRate,
  onRentalDurationChange,
}) => {
  return (
    <>
      {/* Step 3: Mietdauer wählen */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">3</span>
          Mietdauer wählen
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onRentalDurationChange(3)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  rentalDuration === 3
                    ? 'bg-[#09122c] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                3 Monate
              </button>
              <button
                onClick={() => onRentalDurationChange(6)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  rentalDuration === 6
                    ? 'bg-[#09122c] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                6 Monate
                <span className="ml-1 text-xs font-bold text-[#e17564]">-5%</span>
              </button>
              <button
                onClick={() => onRentalDurationChange(12)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  rentalDuration === 12
                    ? 'bg-[#09122c] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                12 Monate
                <span className="ml-1 text-xs font-bold text-[#e17564]">-10%</span>
              </button>
            </div>
            {discountRate > 0 && (
              <div className="bg-[#e17564]/10 text-[#e17564] px-3 py-1 rounded-full text-sm font-medium">
                {discountRate * 100}% Rabatt bei {rentalDuration} Monaten Laufzeit
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zusammenfassung und Total */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-xl font-semibold mb-4">Zusammenfassung</h3>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">Provisionsmodell:</span>
          <span className="font-medium">
            {provisionTypes.find(p => p.id === selectedProvisionType)?.name || 'Basismodell'}
            ({totalCost.provision}%)
          </span>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Ausgewählte Flächen:</span>
            <span className="font-medium">
              {Object.values(packageCounts).reduce((sum, count) => sum + count, 0) > 0
                ? `${Object.values(packageCounts).reduce((sum, count) => sum + count, 0)} Fläche(n)`
                : 'Keine ausgewählt'}
            </span>
          </div>
          {Object.values(packageCounts).reduce((sum, count) => sum + count, 0) > 0 && (
            <div className="text-sm text-gray-500 mt-1">
              {Object.entries(packageCounts).map(([id, count]) => {
                if (count <= 0) return null;
                const pkg = packageOptions.find(p => p.id === id);
                return pkg ? (
                  <div key={id} className="flex justify-between">
                    <span>{count}x {pkg.name}</span>
                    <span className="font-medium">
                      {pkg.priceDisplay ? pkg.priceDisplay : `${(pkg.price * count).toFixed(2)}€`}
                    </span>
                  </div>
                ) : null;
              }).filter(Boolean)}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">Sichtbarkeit:</span>
          <span className="font-medium">
            {Object.entries(packageCounts).filter(([id, count]) => {
              const pkg = packageOptions.find(p => p.id === id);
              return pkg?.category === 'visibility' && count > 0;
            }).reduce((sum, [, count]) => sum + count, 0) > 0
              ? `${Object.entries(packageCounts).filter(([id, count]) => {
                  const pkg = packageOptions.find(p => p.id === id);
                  return pkg?.category === 'visibility' && count > 0;
                }).reduce((sum, [, count]) => sum + count, 0)} Schaufenster`
              : 'Keine ausgewählt'}
          </span>
        </div>
        
        {selectedProvisionType === 'premium' && (zusatzleistungen.lagerservice || zusatzleistungen.versandservice) && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">Zusatzleistungen:</span>
              <span className="font-medium">Ausgewählt</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {zusatzleistungen.lagerservice && (
                <div className="flex justify-between">
                  <span>Lagerservice</span>
                  <span className="font-medium">+20€/Monat</span>
                </div>
              )}
              {zusatzleistungen.versandservice && (
                <div className="flex justify-between">
                  <span>Versandservice</span>
                  <span className="font-medium">+5€/Monat</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">Mietdauer:</span>
          <span className="font-medium">{rentalDuration} Monate</span>
        </div>
        
        {discountRate > 0 && (
          <div className="flex justify-between items-center mb-3 text-[#e17564]">
            <span>Rabatt:</span>
            <span className="font-medium">-{discountRate * 100}%</span>
          </div>
        )}
        
        <div className="border-t border-gray-300 my-4"></div>
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Monatliche Kosten:</span>
          <span>{totalCost.monthly.toFixed(2)}€</span>
        </div>
      </div>
    </>
  );
};

export default PriceSummary;