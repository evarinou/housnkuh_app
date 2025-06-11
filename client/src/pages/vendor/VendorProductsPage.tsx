// client/src/pages/vendor/VendorProductsPage.tsx
import React from 'react';
import { ShoppingCart, Plus, Package, Tag } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorProductsPage: React.FC = () => {
  return (
    <VendorLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ShoppingCart className="w-8 h-8 text-emerald-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Produkte verwalten</h1>
          </div>
          <p className="text-gray-600">
            Verwalten Sie hier Ihre Produktpalette, Preise und Verfügbarkeiten.
          </p>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="bg-emerald-50 rounded-full p-6 w-24 h-24 mx-auto mb-4">
              <ShoppingCart className="w-12 h-12 text-emerald-600 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-secondary mb-3">
              Produktverwaltung kommt bald!
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Wir arbeiten intensiv an einer umfassenden Produktverwaltung für Sie. 
              Bald können Sie hier Ihre gesamte Produktpalette verwalten.
            </p>
          </div>

          {/* Preview Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <Package className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Produkte anlegen</h3>
              <p className="text-sm text-gray-600">
                Erstellen Sie detaillierte Produktbeschreibungen mit Bildern und Preisen.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <Tag className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Kategorien verwalten</h3>
              <p className="text-sm text-gray-600">
                Organisieren Sie Ihre Produkte in übersichtlichen Kategorien.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <Plus className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Verfügbarkeit setzen</h3>
              <p className="text-sm text-gray-600">
                Legen Sie Lagerbestände und Verfügbarkeitszeiten fest.
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-emerald-50 rounded-lg p-6">
            <p className="text-emerald-800 mb-2">
              <strong>Haben Sie Fragen zur kommenden Produktverwaltung?</strong>
            </p>
            <p className="text-emerald-700">
              Kontaktieren Sie uns gerne unter{' '}
              <a href="mailto:info@housnkuh.de" className="text-emerald-600 hover:underline font-medium">
                info@housnkuh.de
              </a>
              {' '}oder{' '}
              <a href="tel:+4915735711257" className="text-emerald-600 hover:underline font-medium">
                0157 35711257
              </a>
            </p>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorProductsPage;