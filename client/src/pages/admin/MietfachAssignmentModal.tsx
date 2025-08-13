/**
 * @file MietfachAssignmentModal.tsx
 * @purpose Modal for assigning Mietfächer to confirmed bookings with price adjustment and availability checking
 * @created 2024-11-15
 * @modified 2025-08-04
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Package, MapPin, Square, Calendar } from 'lucide-react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, addMonths } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Mietfach data structure
 * @interface Mietfach
 * @property {string} _id - Unique identifier
 * @property {string} bezeichnung - Display name/label
 * @property {string} typ - Type of Mietfach (kuehlregal, gefrierregal, etc.)
 * @property {string} [beschreibung] - Optional description
 * @property {Object} [groesse] - Optional size information
 * @property {number} groesse.flaeche - Area/size value
 * @property {string} groesse.einheit - Size unit (m², pieces, etc.)
 * @property {string} [standort] - Optional location information
 * @property {string[]} [features] - Optional list of features
 */
interface Mietfach {
  _id: string;
  bezeichnung: string;
  typ: string;
  beschreibung?: string;
  groesse?: {
    flaeche: number;
    einheit: string;
  };
  standort?: string;
  features?: string[];
}

/**
 * Mietfach assignment with price adjustment
 * @interface MietfachAssignment
 * @property {string} mietfachId - ID of assigned Mietfach
 * @property {number} adjustedPrice - Custom monthly price
 * @property {string} [priceChangeReason] - Optional reason for price change
 */
interface MietfachAssignment {
  mietfachId: string;
  adjustedPrice: number;
  priceChangeReason?: string;
}

/**
 * Mietfach with availability information
 * @interface MietfachWithAvailability
 * @extends Mietfach
 * @property {boolean} available - Whether available for selected period
 * @property {any[]} [conflicts] - Optional booking conflicts
 * @property {Date | null} [nextAvailable] - Next available date if currently unavailable
 */
interface MietfachWithAvailability extends Mietfach {
  available: boolean;
  conflicts?: any[];
  nextAvailable?: Date | null;
}

/**
 * Props for MietfachAssignmentModal component
 * @interface MietfachAssignmentModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Function to close modal
 * @property {Function} onConfirm - Function to confirm assignments with pricing and date
 * @property {Object} user - User with pending booking information
 */
interface MietfachAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignments: MietfachAssignment[], scheduledStartDate: Date, additionalData?: {
    zusatzleistungen?: any;
    totalPrice?: number;
  }) => void;
  user: {
    _id: string;
    kontakt: {
      name: string;
      email: string;
    };
    pendingBooking?: {
      packageData: any;
      comments?: string;
    };
  };
}

/**
 * Mietfach assignment modal component
 * @description Complex modal for assigning Mietfächer to confirmed bookings with availability checking,
 * price adjustment, date scheduling, and comprehensive booking details display
 * @param {MietfachAssignmentModalProps} props - Component props
 * @returns {React.FC} Mietfach assignment modal with booking confirmation workflow
 * @complexity Advanced booking workflow with availability checking, pricing, and schedule management
 */
const MietfachAssignmentModal: React.FC<MietfachAssignmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user
}) => {
  const [availableMietfaecher, setAvailableMietfaecher] = useState<Mietfach[]>([]);
  const [selectedMietfaecher, setSelectedMietfaecher] = useState<string[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [scheduledStartDate, setScheduledStartDate] = useState<Date>(new Date());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [filteredMietfaecher, setFilteredMietfaecher] = useState<MietfachWithAvailability[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      setSelectedMietfaecher([]);
      setPriceAdjustments({});
      setConfirming(false);
      setScheduledStartDate(new Date());
      fetchAvailableMietfaecher();
    }
  }, [isOpen]);

  /**
   * Determines required Mietfach types based on package selection
   * @description Maps package categories to Mietfach types using proper category mapping
   * @returns {string[]} Array of required Mietfach types or ['all'] if none specified
   * @complexity Business logic mapping package categories to physical Mietfach types
   */
  const getRequestedMietfachTypes = useCallback(() => {
    const types: Set<string> = new Set();
    const packageData = user.pendingBooking?.packageData;
    
    // Direct package ID to Mietfach types mapping
    const packageIdToTypesMap: Record<string, string[]> = {
      'block-a': ['regal'],
      'block-b': ['regal'],
      'block-cold': ['kuehl'],
      'block-frozen': ['gefrier'],
      'block-table': ['sonstiges', 'verkaufstisch'],
      'block-other': ['sonstiges'],
      'window-small': ['schaufenster'],
      'window-large': ['schaufenster']
    };
    
    console.log('🔍 Debug: packageData.packageCounts:', packageData?.packageCounts);
    console.log('🔍 Debug: packageData.packageOptions:', packageData?.packageOptions);
    
    // CRITICAL DEBUG: Full packageData structure
    console.log('🔍 CRITICAL DEBUG: Complete packageData structure:', JSON.stringify(packageData, null, 2));
    
    if (packageData?.packageCounts) {
      Object.entries(packageData.packageCounts).forEach(([packageId, count]) => {
        console.log(`🔍 Debug: Processing packageId: "${packageId}", count: ${count}`);
        
        if (Number(count) > 0) {
          // Get the Mietfach types for this package ID
          const mietfachTypes = packageIdToTypesMap[packageId];
          
          if (mietfachTypes) {
            mietfachTypes.forEach(type => {
              types.add(type);
              console.log(`✅ Added type: ${type} (from packageId: ${packageId})`);
            });
          } else {
            console.log(`⚠️ Warning: No mapping found for packageId: "${packageId}"`);
            // Fallback: try to guess from package name
            const packageOption = packageData.packageOptions?.find((p: any) => p.id === packageId);
            if (packageOption) {
              const name = packageOption.name.toLowerCase();
              if (name.includes('kühl') || name.includes('gekühlt')) {
                types.add('kuehl');
                console.log(`✅ Added type: kuehl (guessed from name: ${packageOption.name})`);
              } else if (name.includes('gefrier') || name.includes('gefroren')) {
                types.add('gefrier');
                console.log(`✅ Added type: gefrier (guessed from name: ${packageOption.name})`);
              } else if (name.includes('schaufenster')) {
                types.add('schaufenster');
                console.log(`✅ Added type: schaufenster (guessed from name: ${packageOption.name})`);
              } else if (name.includes('tisch')) {
                types.add('sonstiges');
                console.log(`✅ Added type: sonstiges (guessed from name: ${packageOption.name})`);
              } else {
                types.add('regal');
                console.log(`✅ Added type: regal (fallback for name: ${packageOption.name})`);
              }
            }
          }
        }
      });
    } else {
      console.log('⚠️ Warning: packageCounts not available in packageData');
    }
    
    const typesArray = Array.from(types);
    console.log('🔍 Debug: Final requested types:', typesArray);
    return typesArray.length > 0 ? typesArray : ['all'];
  }, [user.pendingBooking?.packageData]);

  /**
   * Checks Mietfach availability for selected date and duration
   * @description Queries backend for availability conflicts and updates filtered list
   * @async
   * @returns {Promise<void>} Updates filteredMietfaecher with availability status
   * @complexity Real-time availability checking with conflict detection
   */
  const checkAvailabilityForDate = useCallback(async () => {
    if (!user.pendingBooking?.packageData) return;
    
    setLoadingAvailability(true);
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const duration = user.pendingBooking.packageData.rentalDuration || 1;
      const requestedTypes = getRequestedMietfachTypes();
      
      console.log('🔍 Debug: Making availability request with:', {
        startDate: scheduledStartDate,
        duration,
        requestedTypes
      });
      
      const response = await axios.post(
        `${apiUrl}/admin/check-mietfach-availability`,
        {
          startDate: scheduledStartDate,
          duration: duration,
          requestedTypes: requestedTypes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('🔍 Debug: Availability response:', response.data);
      
      if (response.data.success) {
        console.log('🔍 Debug: Setting filtered mietfaecher:', response.data.mietfaecher);
        setFilteredMietfaecher(response.data.mietfaecher);
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      // Fallback to showing all mietfaecher without availability info
      console.log('🔍 Debug: Falling back to all available mietfaecher:', availableMietfaecher);
      setFilteredMietfaecher(availableMietfaecher.map(mf => ({ ...mf, available: true })));
    } finally {
      setLoadingAvailability(false);
    }
  }, [scheduledStartDate, user.pendingBooking?.packageData, availableMietfaecher, getRequestedMietfachTypes]);

  useEffect(() => {
    if (availableMietfaecher.length > 0 && user.pendingBooking?.packageData) {
      checkAvailabilityForDate();
    }
  }, [checkAvailabilityForDate, availableMietfaecher, user.pendingBooking?.packageData]);

  /**
   * Fetches all available Mietfächer from the API
   * @description Retrieves complete list of Mietfächer for assignment selection
   * @async
   * @returns {Promise<void>} Updates availableMietfaecher state
   */
  const fetchAvailableMietfaecher = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      
      const response = await axios.get(`${apiUrl}/admin/available-mietfaecher`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAvailableMietfaecher(response.data.mietfaecher);
      } else {
        setError('Fehler beim Laden der verfügbaren Mietfächer');
      }
    } catch (err) {
      setError('Serverfehler beim Laden der Mietfächer');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maps technical type names to user-friendly display names
   * @param {string} typ - Technical Mietfach type
   * @returns {string} User-friendly display name
   */
  const getDisplayTypeName = (typ: string): string => {
    const typeMap: Record<string, string> = {
      'kuehlregal': 'Kühlregal',
      'gefrierregal': 'Gefrierregal',
      'regal': 'Regal',
      'regal-b': 'Regal Typ B',
      'verkaufstisch': 'Verkaufstisch',
      'schaufenster': 'Schaufenster',
      'lagerraum': 'Lagerraum',
      'sonstiges': 'Sonstiges',
      'Standard': 'Standard',
      'Premium': 'Premium'
    };
    
    return typeMap[typ] || typ;
  };

  /**
   * Toggles Mietfach selection and manages price adjustments
   * @param {string} mietfachId - ID of Mietfach to toggle
   * @returns {void} Updates selection state and clears price on deselection
   */
  const toggleMietfach = (mietfachId: string) => {
    setSelectedMietfaecher(prev => {
      const isCurrentlySelected = prev.includes(mietfachId);
      if (isCurrentlySelected) {
        // Remove from selection and clear price adjustment
        setPriceAdjustments(prevPrices => {
          const newPrices = { ...prevPrices };
          delete newPrices[mietfachId];
          return newPrices;
        });
        return prev.filter(id => id !== mietfachId);
      } else {
        // Add to selection - price will be set manually by admin
        return [...prev, mietfachId];
      }
    });
  };

  /**
   * Updates price adjustment for a specific Mietfach
   * @param {string} mietfachId - ID of Mietfach to update price for
   * @param {number} newPrice - New monthly price
   * @returns {void} Updates priceAdjustments state
   */
  const handlePriceChange = (mietfachId: string, newPrice: number) => {
    setPriceAdjustments(prev => ({
      ...prev,
      [mietfachId]: newPrice
    }));
  };

  /**
   * Calculates total monthly price including Zusatzleistungen and discounts
   * @description Computes final price with Mietfach costs, additional services, and applied discounts
   * @returns {number} Total monthly price rounded to 2 decimal places
   * @complexity Complex pricing logic with conditional services and discount calculations
   */
  const calculateTotalPriceWithZusatzleistungen = () => {
    let total = 0;
    
    // Basis-Mietfachpreise
    selectedMietfaecher.forEach(mietfachId => {
      total += priceAdjustments[mietfachId] || 0;
    });
    
    // Zusatzleistungen hinzufügen (nur bei Premium-Modell)
    const zusatzleistungen = user.pendingBooking?.packageData?.zusatzleistungen;
    const provisionType = user.pendingBooking?.packageData?.selectedProvisionType;
    
    if (zusatzleistungen && provisionType === 'premium') {
      if (zusatzleistungen.lagerservice) total += 20;
      if (zusatzleistungen.versandservice) total += 5;
    }
    
    // Rabatt anwenden (falls vorhanden)
    const discount = user.pendingBooking?.packageData?.discount || 0;
    if (discount > 0) {
      total = total * (1 - discount);
    }
    
    return Math.round(total * 100) / 100; // Auf 2 Dezimalstellen runden
  };

  /**
   * Handles booking confirmation with validation and assignment creation
   * @description Validates selections, creates assignments, and triggers parent confirmation callback
   * @async
   * @returns {Promise<void>} Confirms booking with assignments, pricing, and additional data
   * @complexity Multi-step validation and assignment creation with error handling
   */
  const handleConfirm = async () => {
    if (selectedMietfaecher.length === 0) {
      setError('Bitte wählen Sie mindestens ein Mietfach aus');
      return;
    }

    // Validate all prices are set and valid
    for (const mietfachId of selectedMietfaecher) {
      const adjustedPrice = priceAdjustments[mietfachId];
      if (adjustedPrice === undefined || adjustedPrice === null) {
        setError('Bitte setzen Sie für alle ausgewählten Mietfächer einen Preis');
        return;
      }
      if (adjustedPrice < 0) {
        setError('Preise müssen positive Werte sein');
        return;
      }
      if (adjustedPrice > 1000) {
        setError('Preise dürfen nicht über 1000€ liegen');
        return;
      }
    }
    
    setConfirming(true);
    setError('');
    
    try {
      // Create assignment objects with price adjustments
      const assignments: MietfachAssignment[] = selectedMietfaecher.map(mietfachId => {
        const adjustedPrice = priceAdjustments[mietfachId];
        
        return {
          mietfachId,
          adjustedPrice: adjustedPrice || 0
        };
      });

      // Calculate total price and prepare additional data
      const totalPrice = calculateTotalPriceWithZusatzleistungen();
      const additionalData = {
        zusatzleistungen: user.pendingBooking?.packageData?.zusatzleistungen,
        totalPrice
      };

      await onConfirm(assignments, scheduledStartDate, additionalData);
      setConfirming(false); // Reset spinner on success too
    } catch (error) {
      console.error('Error in modal confirmation:', error);
      setError('Fehler beim Bestätigen der Buchung. Bitte versuchen Sie es erneut.');
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mietfächer zuweisen</h2>
            <p className="text-gray-600 mt-1">
              Wählen Sie Mietfächer für {user.kontakt.name} ({user.kontakt.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date Selection Section */}
        <div className="p-6 bg-blue-50 border-b">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Startdatum festlegen
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <DatePicker
                selected={scheduledStartDate}
                onChange={(date: Date | null) => date && setScheduledStartDate(date)}
                minDate={new Date()}
                dateFormat="dd.MM.yyyy"
                locale={de}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholderText="Startdatum wählen"
              />
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Laufzeit:</span> {user.pendingBooking?.packageData?.rentalDuration || 1} Monate
              <br />
              <span className="font-medium">Enddatum:</span> {format(addMonths(scheduledStartDate, user.pendingBooking?.packageData?.rentalDuration || 1), 'dd.MM.yyyy', { locale: de })}
            </div>
          </div>
          {loadingAvailability && (
            <div className="mt-3 text-sm text-blue-600 flex items-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Verfügbarkeit wird geprüft...
            </div>
          )}
        </div>

        {/* Vendor Comments - Show prominently at top */}
        {user.pendingBooking?.comments && (
          <div className="p-6 bg-amber-50 border-b border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center">
              <span className="inline-block w-3 h-3 bg-amber-600 rounded-full mr-2"></span>
              Wichtige Anmerkungen des Direktvermarkters
            </h3>
            <div className="bg-white p-4 rounded-lg border border-amber-200">
              <p className="text-amber-800 whitespace-pre-wrap font-medium">
                {user.pendingBooking.comments}
              </p>
            </div>
          </div>
        )}

        {/* Package Details */}
        {user.pendingBooking?.packageData && (
          <div className="p-6 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold mb-3">Buchungsanfrage Details:</h3>
            
            {/* Grunddaten */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <strong>Provisionsmodell:</strong> {user.pendingBooking.packageData.selectedProvisionType === 'basic' ? 'Basismodell' : 'Premium-Modell'}
              </div>
              <div>
                <strong>Mietdauer:</strong> {user.pendingBooking.packageData.rentalDuration} Monate
              </div>
              <div>
                <strong>Monatliche Kosten:</strong> {user.pendingBooking.packageData.totalCost?.monthly?.toFixed(2)}€
              </div>
            </div>

            {/* Ausgewählte Pakete */}
            {user.pendingBooking.packageData.packageCounts && Object.keys(user.pendingBooking.packageData.packageCounts).length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Gewählte Verkaufsflächen:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(user.pendingBooking.packageData.packageCounts).map(([packageId, count]) => {
                    const numCount = Number(count);
                    if (numCount > 0) {
                      const packageOption = user.pendingBooking?.packageData?.packageOptions?.find((p: any) => p.id === packageId);
                      return (
                        <div key={packageId} className="bg-white p-3 rounded border text-sm">
                          <div className="font-medium text-gray-900">
                            {numCount}x {packageOption?.name || packageId}
                          </div>
                          <div className="text-gray-600">
                            {packageOption?.price || 'N/A'}€/Monat pro Einheit
                          </div>
                          {packageOption?.description && (
                            <div className="text-gray-500 text-xs mt-1">
                              {packageOption.description}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Zusatzoptionen */}
            {user.pendingBooking.packageData.selectedAddons && user.pendingBooking.packageData.selectedAddons.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Zusatzoptionen:</h4>
                <div className="flex flex-wrap gap-2">
                  {user.pendingBooking.packageData.selectedAddons.map((addon: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {addon}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zusatzleistungen */}
            {user.pendingBooking.packageData.zusatzleistungen && 
             user.pendingBooking.packageData.selectedProvisionType === 'premium' && 
             (user.pendingBooking.packageData.zusatzleistungen.lagerservice || user.pendingBooking.packageData.zusatzleistungen.versandservice) && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-green-600" />
                  Gebuchte Zusatzleistungen
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {user.pendingBooking.packageData.zusatzleistungen.lagerservice && (
                    <div className="bg-white p-3 rounded-lg border-2 border-green-200 shadow-sm">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <div>
                          <div className="font-medium text-green-800">Lagerservice</div>
                          <div className="text-sm text-green-600 font-semibold">+20€/Monat</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {user.pendingBooking.packageData.zusatzleistungen.versandservice && (
                    <div className="bg-white p-3 rounded-lg border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🚚</span>
                        <div>
                          <div className="font-medium text-blue-800">Versandservice</div>
                          <div className="text-sm text-blue-600 font-semibold">+5€/Monat</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border">
                  <strong>Hinweis:</strong> Zusatzleistungen werden zu den Mietfachkosten hinzugerechnet.
                </div>
              </div>
            )}

            {/* Provision Details */}
            <div className="bg-amber-50 p-3 rounded border-l-4 border-amber-400">
              <div className="text-sm">
                <strong>Provision:</strong> {user.pendingBooking.packageData.totalCost?.provision || 'N/A'}% auf alle Verkäufe
                {user.pendingBooking.packageData.discount && user.pendingBooking.packageData.discount > 0 && (
                  <span className="ml-2 text-green-600">
                    (Rabatt: -{(user.pendingBooking.packageData.discount * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-lg">Lade verfügbare Mietfächer...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => {
                    setError('');
                    fetchAvailableMietfaecher();
                  }}
                  className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm font-medium transition-colors"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Verfügbare Mietfächer</h3>
                <p className="text-gray-600">Wählen Sie die Mietfächer aus, die Sie diesem Vendor zuweisen möchten.</p>
                {filteredMietfaecher.length > 0 && (
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                      Verfügbar: {filteredMietfaecher.filter(m => m.available).length}
                    </span>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                      Belegt: {filteredMietfaecher.filter(m => !m.available).length}
                    </span>
                  </div>
                )}
              </div>

              {(filteredMietfaecher.length === 0 && !loadingAvailability) ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Keine verfügbaren Mietfächer vorhanden</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Available Mietfächer */}
                  {filteredMietfaecher.filter(m => m.available).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3">Verfügbar ab {format(scheduledStartDate, 'dd.MM.yyyy', { locale: de })}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMietfaecher.filter(m => m.available).map((mietfach) => (
                          <div
                            key={mietfach._id}
                            onClick={() => toggleMietfach(mietfach._id)}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              selectedMietfaecher.includes(mietfach._id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{mietfach.bezeichnung}</h4>
                        <input
                          type="checkbox"
                          checked={selectedMietfaecher.includes(mietfach._id)}
                          onChange={() => toggleMietfach(mietfach._id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Package className="w-4 h-4 mr-2" />
                          <span>{getDisplayTypeName(mietfach.typ)}</span>
                        </div>
                        
                        {mietfach.standort && (
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>{mietfach.standort}</span>
                          </div>
                        )}
                        
                        {mietfach.groesse && (
                          <div className="flex items-center text-gray-600">
                            <Square className="w-4 h-4 mr-2" />
                            <span>{mietfach.groesse.flaeche} {mietfach.groesse.einheit}</span>
                          </div>
                        )}
                        
                        {/* Price Setting for Selected Mietfach */}
                        {selectedMietfaecher.includes(mietfach._id) && (
                          <div className="price-adjustment">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monatspreis festlegen:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={priceAdjustments[mietfach._id] || ''}
                                onChange={(e) => handlePriceChange(mietfach._id, parseFloat(e.target.value) || 0)}
                                min="0"
                                max="1000"
                                step="0.01"
                                placeholder="0.00"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-sm text-gray-600">€/Monat</span>
                            </div>
                          </div>
                        )}
                        
                        {mietfach.beschreibung && (
                          <p className="text-gray-500 text-xs mt-2">{mietfach.beschreibung}</p>
                        )}
                        
                        {mietfach.features && mietfach.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {mietfach.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Unavailable Mietfächer */}
                  {filteredMietfaecher.filter(m => !m.available).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-3">Nicht verfügbar für den gewählten Zeitraum</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMietfaecher.filter(m => !m.available).map((mietfach) => (
                          <div
                            key={mietfach._id}
                            className="border rounded-lg p-4 opacity-60 cursor-not-allowed border-gray-200 bg-gray-50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-500">{mietfach.bezeichnung}</h4>
                              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center text-gray-500">
                                <Package className="w-4 h-4 mr-2" />
                                <span>{getDisplayTypeName(mietfach.typ)}</span>
                              </div>
                              
                              {mietfach.standort && (
                                <div className="flex items-center text-gray-500">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>{mietfach.standort}</span>
                                </div>
                              )}
                              
                              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                                Bereits gebucht für diesen Zeitraum
                                {mietfach.nextAvailable && (
                                  <div className="mt-1">
                                    Nächster freier Termin: {format(new Date(mietfach.nextAvailable), 'dd.MM.yyyy', { locale: de })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 p-6 border-t bg-gray-50">
          {/* Price Summary */}
          {selectedMietfaecher.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-800 mb-3">Preisübersicht:</h4>
              <div className="space-y-2">
                {selectedMietfaecher.map(mietfachId => {
                  const mietfach = availableMietfaecher.find(m => m._id === mietfachId);
                  const price = priceAdjustments[mietfachId] || 0;
                  
                  return (
                    <div key={mietfachId} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{mietfach?.bezeichnung}</span>
                      <span className="font-medium text-blue-600">
                        {price.toFixed(2)}€/Monat
                      </span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2">
                  {(() => {
                    // Use the new price calculation service for consistency
                    const mietfachPrices = selectedMietfaecher.map(mietfachId => {
                      const mietfach = availableMietfaecher.find(m => m._id === mietfachId);
                      return {
                        id: mietfachId,
                        name: mietfach?.bezeichnung || 'Mietfach',
                        price: priceAdjustments[mietfachId] || 0
                      };
                    });

                    const priceConfig = {
                      mietfachPrices,
                      zusatzleistungen: user.pendingBooking?.packageData?.zusatzleistungen,
                      discount: user.pendingBooking?.packageData?.discount,
                      provisionType: user.pendingBooking?.packageData?.selectedProvisionType || 'basic'
                    };

                    // Import price calculation service dynamically
                    let priceBreakdown: any = null;
                    try {
                      // For now, use inline calculation for immediate display
                      // TODO: Replace with service import after ensuring no circular dependencies
                      const mietfachTotal = priceConfig.mietfachPrices.reduce((sum, item) => sum + item.price, 0);
                      
                      // Zusatzleistungen (nur bei Premium)
                      let zusatzleistungenTotal = 0;
                      if (priceConfig.zusatzleistungen && priceConfig.provisionType === 'premium') {
                        if (priceConfig.zusatzleistungen.lagerservice) zusatzleistungenTotal += 20;
                        if (priceConfig.zusatzleistungen.versandservice) zusatzleistungenTotal += 5;
                      }
                      
                      const subtotal = mietfachTotal + zusatzleistungenTotal;
                      const discount = priceConfig.discount || 0;
                      const discountAmount = subtotal * discount;
                      const finalTotal = subtotal - discountAmount;
                      
                      priceBreakdown = {
                        mietfachTotal,
                        zusatzleistungenTotal,
                        subtotal,
                        discountAmount,
                        finalTotal
                      };
                    } catch (error) {
                      console.error('Price calculation error:', error);
                      // Fallback calculation
                      const mietfachTotal = selectedMietfaecher.reduce((total, mietfachId) => {
                        return total + (priceAdjustments[mietfachId] || 0);
                      }, 0);
                      priceBreakdown = { mietfachTotal, zusatzleistungenTotal: 0, subtotal: mietfachTotal, discountAmount: 0, finalTotal: mietfachTotal };
                    }
                    
                    return (
                      <>
                        {/* Mietfach-Preise */}
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Mietfächer:</span>
                          <span>{priceBreakdown.mietfachTotal.toFixed(2)}€/Monat</span>
                        </div>
                        
                        {/* Zusatzleistungen */}
                        {priceBreakdown.zusatzleistungenTotal > 0 && (
                          <div className="space-y-1">
                            {user.pendingBooking?.packageData?.zusatzleistungen?.lagerservice && (
                              <div className="flex justify-between items-center text-sm text-green-600">
                                <span>📦 Lagerservice:</span>
                                <span>+20.00€/Monat</span>
                              </div>
                            )}
                            {user.pendingBooking?.packageData?.zusatzleistungen?.versandservice && (
                              <div className="flex justify-between items-center text-sm text-blue-600">
                                <span>🚚 Versandservice:</span>
                                <span>+5.00€/Monat</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Zwischensumme */}
                        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-2 mt-2">
                          <span>Zwischensumme:</span>
                          <span>{priceBreakdown.subtotal.toFixed(2)}€/Monat</span>
                        </div>
                        
                        {/* Rabatt */}
                        {priceBreakdown.discountAmount > 0 ? (
                          <div className="flex justify-between items-center text-sm text-red-600">
                            <span>Rabatt (-{((user.pendingBooking?.packageData?.discount || 0) * 100).toFixed(0)}%):</span>
                            <span>-{priceBreakdown.discountAmount.toFixed(2)}€/Monat</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-sm text-gray-500">
                            <span>Rabatt:</span>
                            <span>Keine (Laufzeit: {user.pendingBooking?.packageData?.rentalDuration || 0} Monate)</span>
                          </div>
                        )}
                        
                        {/* Gesamtsumme */}
                        <div className="flex justify-between items-center font-semibold border-t pt-2 mt-2 text-lg">
                          <span>Gesamt:</span>
                          <span className="text-green-600">
                            {priceBreakdown.finalTotal.toFixed(2)}€/Monat
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
          
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {confirming ? (
                <span className="text-blue-600 font-medium">Buchung wird bestätigt...</span>
              ) : selectedMietfaecher.length > 0 ? (
                `${selectedMietfaecher.length} Mietfach${selectedMietfaecher.length > 1 ? 'er' : ''} ausgewählt`
              ) : (
                'Keine Mietfächer ausgewählt'
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={confirming}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedMietfaecher.length === 0 || confirming}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Bestätige...
                  </>
                ) : (
                  'Buchung bestätigen & Mietfächer zuweisen'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MietfachAssignmentModal;