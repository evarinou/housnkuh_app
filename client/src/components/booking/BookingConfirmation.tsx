import React from 'react';
import { Package } from 'lucide-react';
import { Zusatzleistungen } from '../../types';

interface ProvisionType {
  id: string;
  name: string;
  rate: number;
  description: string;
  benefits: string[];
}

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

interface TotalCost {
  monthly: number;
  oneTime: number;
  provision: number;
}

interface BookingConfirmationProps {
  showBookingConfirmation: boolean;
  bookingInProgress: boolean;
  vendorUser: any;
  provisionTypes: ProvisionType[];
  packageOptions: PackageOption[];
  selectedProvisionType: string;
  packageCounts: Record<string, number>;
  rentalDuration: number;
  totalCost: TotalCost;
  zusatzleistungen: Zusatzleistungen;
  onClose: () => void;
  onSubmit: () => void;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  showBookingConfirmation,
  bookingInProgress,
  vendorUser,
  provisionTypes,
  packageOptions,
  selectedProvisionType,
  packageCounts,
  rentalDuration,
  totalCost,
  zusatzleistungen,
  onClose,
  onSubmit,
}) => {
  if (!showBookingConfirmation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-90vh overflow-y-auto">
        <h3 className="text-2xl font-bold text-[#09122c] mb-4">
          Zusätzliche Buchung bestätigen
        </h3>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Hallo {vendorUser?.name}, du möchtest zusätzliche Verkaufsfläche buchen:
          </p>
          
          {/* Package Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">Buchungsübersicht:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Provisionsmodell:</span>
                <span>{provisionTypes.find(p => p.id === selectedProvisionType)?.name}</span>
              </div>
              
              {Object.entries(packageCounts).map(([id, count]) => {
                if (count <= 0) return null;
                const pkg = packageOptions.find(p => p.id === id);
                return pkg ? (
                  <div key={id} className="flex justify-between">
                    <span>{count}x {pkg.name}</span>
                    <span>{(pkg.price * count).toFixed(2)}€/Monat</span>
                  </div>
                ) : null;
              }).filter(Boolean)}
              
              {selectedProvisionType === 'premium' && (zusatzleistungen.lagerservice || zusatzleistungen.versandservice) && (
                <>
                  {zusatzleistungen.lagerservice && (
                    <div className="flex justify-between">
                      <span>Lagerservice</span>
                      <span>20€/Monat</span>
                    </div>
                  )}
                  {zusatzleistungen.versandservice && (
                    <div className="flex justify-between">
                      <span>Versandservice</span>
                      <span>5€/Monat</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between">
                <span>Laufzeit:</span>
                <span>{rentalDuration} Monate</span>
              </div>
              
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Monatliche Kosten:</span>
                <span>{totalCost.monthly.toFixed(2)}€</span>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Diese Buchung wird zu Ihren bestehenden Verkaufsflächen hinzugefügt.
          </p>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={bookingInProgress}
          >
            Abbrechen
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2 bg-[#e17564] text-white rounded-lg hover:bg-[#e17564]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={bookingInProgress}
          >
            {bookingInProgress ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Wird verarbeitet...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Buchung bestätigen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;