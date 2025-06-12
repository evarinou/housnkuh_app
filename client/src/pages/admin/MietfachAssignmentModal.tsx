import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Square } from 'lucide-react';
import axios from 'axios';

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

interface MietfachAssignment {
  mietfachId: string;
  adjustedPrice: number;
  priceChangeReason?: string;
}

interface MietfachAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignments: MietfachAssignment[]) => void;
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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      setSelectedMietfaecher([]);
      setPriceAdjustments({});
      setConfirming(false);
      fetchAvailableMietfaecher();
    }
  }, [isOpen]);

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

  const handlePriceChange = (mietfachId: string, newPrice: number) => {
    setPriceAdjustments(prev => ({
      ...prev,
      [mietfachId]: newPrice
    }));
  };

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

      await onConfirm(assignments);
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
                <h3 className="text-lg font-semibold">Verfügbare Mietfächer ({availableMietfaecher.length})</h3>
                <p className="text-gray-600">Wählen Sie die Mietfächer aus, die Sie diesem Vendor zuweisen möchten.</p>
              </div>

              {availableMietfaecher.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Keine verfügbaren Mietfächer vorhanden</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableMietfaecher.map((mietfach) => (
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
                          <span>{mietfach.typ}</span>
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
                  <div className="flex justify-between items-center font-semibold">
                    <span>Gesamt:</span>
                    <span className="text-lg">
                      {selectedMietfaecher.reduce((total, mietfachId) => {
                        return total + (priceAdjustments[mietfachId] || 0);
                      }, 0).toFixed(2)}€/Monat
                    </span>
                  </div>
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