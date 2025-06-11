// client/src/pages/vendor/VendorCustomerInvoicesPage.tsx
import React from 'react';
import { FileText, Send, Eye, Download } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorCustomerInvoicesPage: React.FC = () => {
  return (
    <VendorLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FileText className="w-8 h-8 text-orange-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Ausgangsrechnungen (Endkunde)</h1>
          </div>
          <p className="text-gray-600">
            Verwalten Sie Rechnungen an Ihre Kunden und Endverbraucher.
          </p>
        </div>

        {/* Coming Soon Content */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="bg-orange-50 rounded-full p-6 w-24 h-24 mx-auto mb-4">
              <FileText className="w-12 h-12 text-orange-600 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-secondary mb-3">
              Rechnungsmanagement kommt bald!
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Wir entwickeln ein vollständiges Rechnungssystem für Sie. 
              Bald können Sie Kundenrechnungen direkt über housnkuh erstellen und verwalten.
            </p>
          </div>

          {/* Preview Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <Send className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Rechnungen erstellen</h3>
              <p className="text-sm text-gray-600">
                Professionelle Rechnungen mit Ihrem Branding automatisch generieren.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <Eye className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Zahlungsverfolgung</h3>
              <p className="text-sm text-gray-600">
                Übersicht über offene, bezahlte und überfällige Rechnungen.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <Download className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary mb-2">Export & Archiv</h3>
              <p className="text-sm text-gray-600">
                Alle Rechnungen als PDF exportieren oder für die Steuer archivieren.
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-orange-50 rounded-lg p-6">
            <p className="text-orange-800 mb-2">
              <strong>Fragen zum Rechnungsmanagement?</strong>
            </p>
            <p className="text-orange-700">
              Wir beraten Sie gerne unter{' '}
              <a href="mailto:info@housnkuh.de" className="text-orange-600 hover:underline font-medium">
                info@housnkuh.de
              </a>
              {' '}oder{' '}
              <a href="tel:+4915735711257" className="text-orange-600 hover:underline font-medium">
                0157 35711257
              </a>
            </p>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorCustomerInvoicesPage;