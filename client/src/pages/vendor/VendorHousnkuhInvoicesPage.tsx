// client/src/pages/vendor/VendorHousnkuhInvoicesPage.tsx
import React from 'react';
import { Receipt, Calendar, CreditCard, Archive } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorHousnkuhInvoicesPage: React.FC = () => {
  return (
    <VendorLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Receipt className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Eingangsrechnungen (housnkuh)</h1>
          </div>
          <p className="text-gray-600">
            Übersicht über Ihre Rechnungen von housnkuh und Zahlungshistorie.
          </p>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="bg-indigo-50 rounded-full p-6 w-24 h-24 mx-auto mb-4">
              <Receipt className="w-12 h-12 text-indigo-600 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-secondary mb-3">
              Rechnungsübersicht kommt bald!
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Hier erhalten Sie bald eine vollständige Übersicht über alle Rechnungen von housnkuh 
              und können Ihre Zahlungshistorie einsehen.
            </p>
          </div>

          {/* Preview Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <Calendar className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Monatliche Abrechnungen</h3>
              <p className="text-sm text-gray-600">
                Übersicht über Mietkosten, Servicegebühren und Zusatzleistungen.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <CreditCard className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Zahlungshistorie</h3>
              <p className="text-sm text-gray-600">
                Detaillierte Aufstellung aller getätigten Zahlungen an housnkuh.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <Archive className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Rechnungsarchiv</h3>
              <p className="text-sm text-gray-600">
                Alle Rechnungen als PDF herunterladen und archivieren.
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-indigo-50 rounded-lg p-6">
            <p className="text-indigo-800 mb-2">
              <strong>Fragen zu Ihrer Abrechnung?</strong>
            </p>
            <p className="text-indigo-700">
              Kontaktieren Sie uns jederzeit unter{' '}
              <a href="mailto:info@housnkuh.de" className="text-indigo-600 hover:underline font-medium">
                info@housnkuh.de
              </a>
              {' '}oder{' '}
              <a href="tel:+4915735711257" className="text-indigo-600 hover:underline font-medium">
                0157 35711257
              </a>
            </p>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorHousnkuhInvoicesPage;