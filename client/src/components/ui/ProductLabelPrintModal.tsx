/**
 * @file ProductLabelPrintModal.tsx
 * @purpose Print product labels (name, price, EAN-13 barcode) on a label printer
 * @created 2026-06-10
 *
 * Druckweg: Print-CSS blendet alles außer dem Etikettenbereich aus und setzt
 * @page auf die gewählte Etikettengröße. Im Druckdialog muss das passende
 * Etikettenmedium gewählt und "An Seite anpassen" deaktiviert sein.
 */

import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import ProductBarcode from './ProductBarcode';
import { PriceFormatter } from '../../utils/priceFormatting';

export interface LabelProduct {
  name: string;
  price: number;
  priceUnit: string;
  ean?: string;
}

export interface ProductLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LabelProduct | null;
}

interface LabelPreset {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

const LABEL_PRESETS: LabelPreset[] = [
  { id: '62x29', label: '62 × 29 mm (Brother QL Standard)', widthMm: 62, heightMm: 29 },
  { id: '50x30', label: '50 × 30 mm', widthMm: 50, heightMm: 30 },
  { id: '38x90', label: '90 × 38 mm', widthMm: 90, heightMm: 38 }
];

const PRESET_STORAGE_KEY = 'housnkuh.labelPreset';

const unitLabels: Record<string, string> = {
  kg: 'kg', g: 'g', piece: 'Stk.', liter: 'l', ml: 'ml', bunch: 'Bund', pack: 'Pkg.', box: 'Kiste'
};

const formatPrice = (price: number, unit: string): string => {
  return `${PriceFormatter.formatCurrency(price)} / ${unitLabels[unit] || unit}`;
};

const ProductLabelPrintModal: React.FC<ProductLabelPrintModalProps> = ({ isOpen, onClose, product }) => {
  const [presetId, setPresetId] = useState(() =>
    localStorage.getItem(PRESET_STORAGE_KEY) || LABEL_PRESETS[0].id
  );
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    localStorage.setItem(PRESET_STORAGE_KEY, presetId);
  }, [presetId]);

  if (!isOpen || !product) return null;

  const preset = LABEL_PRESETS.find(p => p.id === presetId) || LABEL_PRESETS[0];

  if (!product.ean) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Etikett drucken</h2>
          <p className="text-sm text-gray-600 mb-4">
            Dieses Produkt hat noch keine EAN. Sie wird beim Speichern automatisch vergeben —
            bitte das Produkt einmal öffnen und speichern oder neu synchronisieren.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  const ean = product.ean;

  const labelStyle: React.CSSProperties = {
    width: `${preset.widthMm}mm`,
    height: `${preset.heightMm}mm`,
    padding: '1.5mm',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#fff'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="label-print-modal">
      {/* Druck-CSS: nur der Etikettenbereich wird gedruckt, Seitengröße = Etikett */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #label-print-area, #label-print-area * { visibility: visible !important; }
          #label-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
          }
          #label-print-area .print-label { page-break-after: always; }
          #label-print-area .print-label:last-child { page-break-after: auto; }
        }
        @page {
          size: ${preset.widthMm}mm ${preset.heightMm}mm;
          margin: 0;
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 print:hidden" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 print:hidden">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Etikett drucken</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 rounded-full p-1"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="labelPreset" className="block text-sm font-medium text-gray-700 mb-1">
                  Etikettengröße
                </label>
                <select
                  id="labelPreset"
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                >
                  {LABEL_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="labelCopies" className="block text-sm font-medium text-gray-700 mb-1">
                  Anzahl
                </label>
                <input
                  id="labelCopies"
                  type="number"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                />
              </div>
            </div>

            {/* Preview (erste Kopie) */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">Vorschau</p>
              <div className="flex justify-center bg-gray-100 rounded-md p-4">
                <div style={labelStyle} className="border border-dashed border-gray-400">
                  <div style={{ fontSize: '8pt', fontWeight: 600, lineHeight: 1.1 }}>
                    {product.name.length > 40 ? `${product.name.slice(0, 40)}…` : product.name}
                  </div>
                  <div style={{ fontSize: '9pt', fontWeight: 700 }}>
                    {formatPrice(product.price, product.priceUnit)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ProductBarcode ean={ean} width={1} height={30} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Im Druckdialog das passende Etikettenmedium wählen und Skalierung
              („An Seite anpassen") deaktivieren, sonst stimmen die Maße nicht.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Drucken
            </button>
          </div>
        </div>
      </div>

      {/* Print area: eine Seite pro Kopie (für Rollen-/Etikettendrucker) */}
      <div id="label-print-area" className="hidden print:block" aria-hidden="true">
        {Array.from({ length: copies }, (_, i) => (
          <div key={i} className="print-label" style={labelStyle}>
            <div style={{ fontSize: '8pt', fontWeight: 600, lineHeight: 1.1 }}>
              {product.name.length > 40 ? `${product.name.slice(0, 40)}…` : product.name}
            </div>
            <div style={{ fontSize: '9pt', fontWeight: 700 }}>
              {formatPrice(product.price, product.priceUnit)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ProductBarcode ean={ean} width={1} height={30} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductLabelPrintModal;
