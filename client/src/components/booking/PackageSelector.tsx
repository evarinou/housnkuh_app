/**
 * @file PackageSelector.tsx
 * @purpose Package selection component with quantity controls for rental spaces and visibility options
 * @created 2025-01-15
 * @modified 2025-08-05
 * @complexity High - Complex product selection logic, multiple categories, quantity management
 */

import React from 'react';

/**
 * Package option configuration for rental packages
 * @interface PackageOption
 * @param {string} id - Unique identifier for the package
 * @param {string} name - Display name of the package
 * @param {number} price - Monthly rental price in euros
 * @param {string} description - Brief description of the package
 * @param {string} image - Image URL for the package (currently unused)
 * @param {string} detail - Detailed description with additional features
 * @param {'standard' | 'cooled' | 'premium' | 'visibility'} category - Package category for organization
 * @param {string} [priceDisplay] - Optional custom price display format (e.g., "Auf Anfrage")
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
 * Props for PackageSelector component
 * @interface PackageSelectorProps
 * @param {PackageOption[]} packageOptions - Available packages to display and select from
 * @param {Record<string, number>} packageCounts - Current quantity selected for each package by ID
 * @param {function} onTogglePackage - Handler for increment/decrement package quantities
 */
interface PackageSelectorProps {
  packageOptions: PackageOption[];
  packageCounts: Record<string, number>;
  onTogglePackage: (packageId: string, isIncrementing: boolean) => void;
}

/**
 * PackageSelector component for choosing rental spaces and visibility options
 * 
 * Features:
 * - Multi-category package organization (Standard, Cooled, Premium, Visibility)
 * - Quantity controls with increment/decrement buttons
 * - Visual selection state with color coding
 * - Category-based grouping with icons and titles
 * - Responsive grid layout for package cards
 * - Real-time quantity display and pricing
 * 
 * Business Logic:
 * - Four package categories: Standard Regale, Kühl- & Gefrierflächen, Verkaufstische, Sichtbarkeit
 * - Separate steps for rental spaces (Step 2) and visibility (Step 3)
 * - Custom price display support for special pricing (e.g., "Auf Anfrage")
 * - Quantity-based selection with visual feedback
 * 
 * Categories:
 * - standard: 📦 Standard Regale - Basic shelf spaces
 * - cooled: ❄️ Kühl- & Gefrierflächen - Refrigerated spaces
 * - premium: ⭐ Verkaufstische - Premium sales tables
 * - visibility: 👁️ Sichtbarkeit - Visibility/promotion options
 * 
 * @param {PackageSelectorProps} props - Component configuration and handlers
 * @returns {JSX.Element} Package selection interface with categories and quantity controls
 */
const PackageSelector: React.FC<PackageSelectorProps> = ({
  packageOptions,
  packageCounts,
  onTogglePackage,
}) => {
  /** Category display names for different package types */
  const categoryTitles = {
    standard: 'Standard Regale',
    cooled: 'Kühl- & Gefrierflächen',
    premium: 'Verkaufstische',
    visibility: 'Sichtbarkeit'
  };

  /** Category icons for visual identification */
  const categoryIcons = {
    standard: '📦',
    cooled: '❄️',
    premium: '⭐',
    visibility: '👁️'
  };


  /**
   * Renders individual package selection card with quantity controls
   * @param {PackageOption} pkg - Package data to render
   * @returns {JSX.Element} Package card with selection controls
   */
  const renderPackageCard = (pkg: PackageOption) => (
    <div
      key={pkg.id}
      className={`border-2 rounded-lg p-4 transition-all duration-200 ${
        (packageCounts[pkg.id] || 0) > 0
          ? 'border-[#e17564] bg-[#e17564]/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-lg font-medium text-[#09122c]">{pkg.name}</h4>
        <span className="text-[#e17564] font-bold">
          {pkg.priceDisplay || `${pkg.price}€/Monat`}
        </span>
      </div>
      <p className="text-gray-600 mb-2">{pkg.description}</p>
      <p className="text-sm text-gray-500 italic">{pkg.detail}</p>
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center">
          {(packageCounts[pkg.id] || 0) > 0 && (
            <div className="flex items-center bg-[#e17564]/10 text-[#e17564] px-3 py-1 rounded-full font-medium">
              <span>Anzahl: {packageCounts[pkg.id] || 0}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {(packageCounts[pkg.id] || 0) > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onTogglePackage(pkg.id, false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
            >
              <span className="text-gray-700 font-bold">-</span>
            </button>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onTogglePackage(pkg.id, true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#e17564] text-white hover:bg-[#e17564]/90"
          >
            <span className="font-bold">+</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Step 2: Verkaufsfläche wählen */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">2</span>
          Verkaufsflächen auswählen
        </h3>
        
        {/* Package Categories */}
        {['standard', 'cooled', 'premium'].map((category) => {
          const categoryPackages = packageOptions.filter(pkg => pkg.category === category);
          
          return (
            <div key={category} className="mb-6">
              <h4 className="text-lg font-medium mb-3 flex items-center text-[#09122c]">
                <span className="mr-2 text-xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryPackages.map(renderPackageCard)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 3: Sichtbarkeit */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-[#e17564] text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-2">3</span>
          Sichtbarkeit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packageOptions.filter(pkg => pkg.category === 'visibility').map(renderPackageCard)}
        </div>
      </div>
    </>
  );
};

export default PackageSelector;