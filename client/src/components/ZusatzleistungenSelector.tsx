// client/src/components/ZusatzleistungenSelector.tsx
import React from 'react';
import { Package, Truck } from 'lucide-react';
import { Zusatzleistungen } from '../types';

interface ZusatzleistungenSelectorProps {
  zusatzleistungen: Zusatzleistungen;
  onChange: (zusatzleistungen: Zusatzleistungen) => void;
  disabled?: boolean;
}

const ZusatzleistungenSelector: React.FC<ZusatzleistungenSelectorProps> = ({
  zusatzleistungen,
  onChange,
  disabled = false
}) => {
  const handleChange = (service: 'lagerservice' | 'versandservice') => {
    onChange({
      ...zusatzleistungen,
      [service]: !zusatzleistungen[service]
    });
  };

  return (
    <div className={`p-6 rounded-lg border ${disabled ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${disabled ? 'text-gray-500' : ''}`}>Zusatzleistungen</h3>
      <div className="space-y-4">
        <label className={`flex items-start cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={zusatzleistungen.lagerservice}
            onChange={() => handleChange('lagerservice')}
            disabled={disabled}
            className="mt-1 mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-600" />
              <span className="font-medium">Lagerservice</span>
              <span className="ml-auto text-primary font-semibold">+20€/Monat</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Lagerplatz und automatisches Auffüllen bei Bedarf
            </p>
          </div>
        </label>

        <label className={`flex items-start cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={zusatzleistungen.versandservice}
            onChange={() => handleChange('versandservice')}
            disabled={disabled}
            className="mt-1 mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <Truck className="h-5 w-5 mr-2 text-gray-600" />
              <span className="font-medium">Versandservice</span>
              <span className="ml-auto text-primary font-semibold">+5€/Monat</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Annahme der Verkaufsartikel per Post und Bestücken der Lagerfläche
            </p>
          </div>
        </label>
      </div>

      {disabled ? (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Hinweis:</strong> Zusatzleistungen sind nur mit dem Premium-Provisionsmodell verfügbar.
          </p>
        </div>
      ) : (zusatzleistungen.lagerservice || zusatzleistungen.versandservice) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Zusatzleistungen werden monatlich berechnet 
            und sind nur mit dem Premium-Provisionsmodell verfügbar.
          </p>
        </div>
      )}
    </div>
  );
};

export default ZusatzleistungenSelector;