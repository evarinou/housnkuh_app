/**
 * @file VendorHousnkuhInvoicesPage.tsx
 * @purpose Vendor incoming invoices page — zeigt die Monatsrechnungen von housnkuh
 *          (Miete, Gebühren, Zusatzleistungen, Provision) mit PDF-Download.
 * @created 2025-01-15
 * @modified 2026-07-07
 */
import React from 'react';
import { Receipt } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';
import InvoiceList from '../../components/vendor/InvoiceList';

/**
 * VendorHousnkuhInvoicesPage — Eingangsrechnungen von housnkuh.
 * Listet die monatlichen housnkuh→Vendor-Rechnungen (Invoice-Backend) mit
 * Filter/Sortierung/Download; Detailansicht via VendorInvoiceDetailPage.
 *
 * @component
 * @returns {JSX.Element}
 */
const VendorHousnkuhInvoicesPage: React.FC = () => {
  return (
    <VendorLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Receipt className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Eingangsrechnungen (housnkuh)</h1>
          </div>
          <p className="text-gray-600">
            Deine monatlichen Rechnungen von housnkuh (Miete, Gebühren,
            Zusatzleistungen und Provision) mit Zahlungsstatus und PDF-Download.
          </p>
        </div>

        {/* Rechnungsliste */}
        <InvoiceList />

        {/* Contact Info */}
        <div className="bg-indigo-50 rounded-lg p-6 mt-8">
          <p className="text-indigo-800 mb-2">
            <strong>Fragen zur Abrechnung?</strong>
          </p>
          <p className="text-indigo-700">
            Kontaktiere housnkuh jederzeit unter{' '}
            <a href="mailto:info@housnkuh.de" className="text-indigo-600 hover:underline font-medium">
              info@housnkuh.de
            </a>
            {' '}oder{' '}
            <a href="tel:+4915222035788" className="text-indigo-600 hover:underline font-medium">
              0152 22035788
            </a>
          </p>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorHousnkuhInvoicesPage;
