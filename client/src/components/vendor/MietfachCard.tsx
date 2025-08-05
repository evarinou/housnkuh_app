/**
 * @file MietfachCard.tsx
 * @purpose Performance-optimized Mietfach display card with trial pricing and category-based styling
 * @created 2025-01-15
 * @modified 2025-08-05
 */

import React, { useCallback, useMemo } from 'react';
import { Package, Snowflake, Ruler, Star, Info } from 'lucide-react';

/**
 * Interface for Mietfach data structure
 * @interface MietfachData
 * @property {string} id - Unique Mietfach identifier
 * @property {string} nummer - Display number for the Mietfach
 * @property {string} kategorie - Mietfach category type
 * @property {string} [groesse] - Optional size information
 * @property {string} [kuehlungsart] - Optional cooling type for refrigerated units
 * @property {number} preis - Monthly rental price
 * @property {boolean} verfuegbar - Availability status
 * @property {string} [beschreibung] - Optional description text
 * @property {string[]} [features] - Optional array of feature tags
 */
interface MietfachData {
  id: string;
  nummer: string;
  kategorie: 'regal' | 'regal-b' | 'kuehlregal' | 'gefrierregal' | 'verkaufstisch' | 'sonstiges' | 'schaufenster';
  groesse?: string;
  kuehlungsart?: string;
  preis: number;
  verfuegbar: boolean;
  beschreibung?: string;
  features?: string[];
}

/**
 * Props interface for the MietfachCard component
 * @interface MietfachCardProps
 * @property {MietfachData} mietfach - Complete Mietfach data for display
 * @property {boolean} isInTrial - Whether user is currently in trial period
 * @property {boolean} hasTrialBooking - Whether user already has a trial booking
 * @property {function} onBookClick - Callback function when booking button is clicked
 */
interface MietfachCardProps {
  mietfach: MietfachData;
  isInTrial: boolean;
  hasTrialBooking: boolean;
  onBookClick: (mietfach: MietfachData) => void;
}

/**
 * MietfachCard component providing optimized display of Mietfach rental options
 * 
 * @component
 * @param {MietfachCardProps} props - Component props containing Mietfach data and trial state
 * @returns {JSX.Element} Comprehensive Mietfach card with pricing and booking functionality
 * 
 * @description
 * Performance-optimized card component for displaying Mietfach rental options with
 * category-based styling, trial pricing integration, and booking functionality.
 * Uses React.memo for re-render prevention and extensive memoization for performance.
 * 
 * @features
 * - Category-based color coding and styling
 * - Trial period special pricing display
 * - Feature truncation with overflow indication
 * - Availability-based interaction states
 * - Performance optimization with React.memo and useMemo
 * - Responsive design with hover effects
 * - German localized content
 * 
 * @category_types
 * - regal/regal-b: Blue styling for standard shelving
 * - kuehlregal: Cyan styling for refrigerated storage
 * - gefrierregal: Indigo styling for frozen storage  
 * - verkaufstisch: Green styling for sales tables
 * - schaufenster: Purple styling for display windows
 * - sonstiges: Gray styling for miscellaneous types
 * 
 * @trial_integration
 * - Special trial badge for eligible users
 * - Free first month pricing display
 * - Trial benefit information tooltip
 * - Conditional styling based on trial status
 * 
 * @performance_optimizations
 * - React.memo wrapper prevents unnecessary re-renders
 * - useMemo for computed values (trial badge visibility, styling)
 * - useCallback for event handlers and helper functions
 * - Memoized category color and display name calculations
 * 
 * @pricing_display
 * - Regular pricing for standard users
 * - Trial pricing with crossed-out regular price
 * - Free month highlight with green styling
 * - Clear monthly cost indication
 * 
 * @accessibility
 * - Disabled state handling for unavailable units
 * - Clear visual hierarchy and contrast
 * - Descriptive button text based on availability
 * - Proper focus states for interactive elements
 * 
 * @complexity O(1) - Fixed rendering complexity with memoized calculations
 */
const MietfachCard: React.FC<MietfachCardProps> = React.memo(({ 
  mietfach, 
  isInTrial, 
  hasTrialBooking, 
  onBookClick 
}) => {
  // Memoize derived values
  const showTrialBadge = useMemo(() => 
    isInTrial && !hasTrialBooking && mietfach.verfuegbar, 
    [isInTrial, hasTrialBooking, mietfach.verfuegbar]
  );

  const getCategoryColor = useCallback((kategorie: string) => {
    switch (kategorie) {
      case 'regal':
      case 'regal-b':
        return 'bg-blue-100 text-blue-800';
      case 'kuehlregal':
        return 'bg-cyan-100 text-cyan-800';
      case 'gefrierregal':
        return 'bg-indigo-100 text-indigo-800';
      case 'verkaufstisch':
        return 'bg-green-100 text-green-800';
      case 'schaufenster':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getCategoryDisplayName = useCallback((kategorie: string) => {
    switch (kategorie) {
      case 'regal':
        return 'Regal';
      case 'regal-b':
        return 'Regal B';
      case 'kuehlregal':
        return 'Kühlregal';
      case 'gefrierregal':
        return 'Gefrierregal';
      case 'verkaufstisch':
        return 'Verkaufstisch';
      case 'schaufenster':
        return 'Schaufenster';
      default:
        return 'Sonstiges';
    }
  }, []);

  // Memoize click handler
  const handleBookClick = useCallback(() => {
    onBookClick(mietfach);
  }, [onBookClick, mietfach]);

  // Memoize category styling
  const categoryColorClass = useMemo(() => 
    getCategoryColor(mietfach.kategorie), 
    [getCategoryColor, mietfach.kategorie]
  );

  const categoryDisplayName = useMemo(() => 
    getCategoryDisplayName(mietfach.kategorie), 
    [getCategoryDisplayName, mietfach.kategorie]
  );

  return (
    <div className={`relative bg-white rounded-lg shadow-md overflow-hidden border transition-all duration-200 hover:shadow-lg ${
      showTrialBadge ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
    } ${!mietfach.verfuegbar ? 'opacity-75' : ''}`}>
      
      {/* Trial Badge Corner */}
      {showTrialBadge && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
            <Star className="w-3 h-3 inline mr-1" />
            1. Monat kostenlos!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Mietfach {mietfach.nummer}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColorClass}`}>
            {categoryDisplayName}
          </span>
        </div>

        {mietfach.beschreibung && (
          <p className="text-sm text-gray-600">{mietfach.beschreibung}</p>
        )}
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {/* Size and Cooling */}
        <div className="flex flex-wrap gap-4">
          {mietfach.groesse && (
            <div className="flex items-center text-sm text-gray-600">
              <Ruler className="w-4 h-4 mr-2" />
              <span>{mietfach.groesse}</span>
            </div>
          )}
          {mietfach.kuehlungsart && (
            <div className="flex items-center text-sm text-gray-600">
              <Snowflake className="w-4 h-4 mr-2" />
              <span>{mietfach.kuehlungsart}</span>
            </div>
          )}
        </div>

        {/* Features */}
        {mietfach.features && mietfach.features.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Ausstattung:</div>
            <div className="flex flex-wrap gap-1">
              {mietfach.features.slice(0, 3).map((feature, index) => (
                <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {feature}
                </span>
              ))}
              {mietfach.features.length > 3 && (
                <span className="text-xs text-gray-500">+{mietfach.features.length - 3} weitere</span>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="pt-2">
          {showTrialBadge ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 line-through">€{mietfach.preis}/Monat</span>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Regulärer Preis</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-800">€0</div>
                    <div className="text-xs text-green-600">erster Monat</div>
                  </div>
                  <Star className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="text-xs text-gray-600 text-center">
                danach €{mietfach.preis}/Monat
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">€{mietfach.preis}</div>
              <div className="text-sm text-gray-600">/Monat</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 pt-0">
        <button 
          onClick={handleBookClick}
          disabled={!mietfach.verfuegbar}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            mietfach.verfuegbar
              ? showTrialBadge
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {mietfach.verfuegbar 
            ? showTrialBadge 
              ? 'Kostenlos buchen' 
              : 'Jetzt buchen'
            : 'Bereits gebucht'
          }
        </button>

        {/* Trial Info Tooltip */}
        {showTrialBadge && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <Info className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <strong>Probemonat-Vorteil:</strong> Als Probemonat-Nutzer ist Ihre erste Buchung 
                einen Monat lang kostenlos. Sie können jederzeit ohne Frist kündigen.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MietfachCard;