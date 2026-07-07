/**
 * @file InvoiceDetail.tsx
 * @purpose Detailed view component for displaying comprehensive invoice information with German formatting, PDF download and print functionality
 * @created 2025-09-09
 * @modified 2025-09-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import StatusBadge from '../ui/StatusBadge';
import { PriceFormatter } from '../../utils/priceFormatting';
import './InvoiceDetail.css';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'mietfach' | 'zusatzleistung' | 'sonstiges';
  referenceId?: string;
  period?: {
    from?: Date;
    to?: Date;
  };
}

interface InvoiceDetailData {
  id: string;
  invoiceNumber: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  period: {
    month: number;
    year: number;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'retrying';
  emailSentAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceDetailProps {
  className?: string;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ className = '' }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      const response = await fetch(`${apiUrl}/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Rechnung nicht gefunden');
        }
        throw new Error('Fehler beim Laden der Rechnung');
      }

      const result = await response.json();
      setInvoice(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const formatPeriod = (period: { month: number; year: number }) => {
    const date = new Date(period.year, period.month - 1);
    return format(date, 'MMMM yyyy', { locale: de });
  };


  const getItemTypeLabel = (type: InvoiceItem['type']) => {
    const typeLabels = {
      mietfach: 'Mietfach',
      zusatzleistung: 'Zusatzleistung',
      sonstiges: 'Sonstiges'
    };
    return typeLabels[type];
  };

  const handleDownload = async () => {
    if (!invoice?.id || downloading) return;

    setDownloading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      const response = await fetch(`${apiUrl}/invoices/${invoice.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Download der PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rechnung-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      // You might want to show a user-friendly error notification here
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/vendor/customer-invoices');
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow space-y-4 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <i className="fas fa-exclamation-triangle text-red-600 text-2xl mb-2"></i>
          <p className="text-red-800 font-medium mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={fetchInvoice}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Erneut versuchen
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Zurück zur Liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Rechnung {invoice.invoiceNumber}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Periode: {formatPeriod(invoice.period)}</span>
            <span>•</span>
            <span>Erstellt: {format(new Date(invoice.createdAt), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Zurück
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors print:hidden"
          >
            <i className="fas fa-print mr-2"></i>
            Drucken
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors print:hidden"
          >
            {downloading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Lädt...
              </>
            ) : (
              <>
                <i className="fas fa-download mr-2"></i>
                PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-lg shadow print:shadow-none print:rounded-none">
        {/* Invoice Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Rechnungsdetails</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rechnungsnummer:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge 
                    status={invoice.status} 
                    dueDate={invoice.dueDate}
                    paidDate={invoice.paidDate}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fälligkeitsdatum:</span>
                  <span className="font-medium">
                    {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
                {invoice.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bezahlt am:</span>
                    <span className="font-medium text-green-600">
                      {format(new Date(invoice.paidDate), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor Info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Anbieter</h2>
              <div className="space-y-1 text-sm">
                <div className="font-medium">{invoice.vendor.name}</div>
                <div className="text-gray-600">{invoice.vendor.email}</div>
                {invoice.vendor.address && (
                  <div className="text-gray-600">
                    <div>{invoice.vendor.address.street}</div>
                    <div>
                      {invoice.vendor.address.postalCode} {invoice.vendor.address.city}
                    </div>
                    <div>{invoice.vendor.address.country}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Positionen</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Beschreibung</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Typ</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Menge</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Einzelpreis</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{item.description}</div>
                      {item.period && (
                        <div className="text-sm text-gray-600 mt-1">
                          {item.period.from && item.period.to && (
                            <>
                              {format(new Date(item.period.from), 'dd.MM.yyyy', { locale: de })} - 
                              {format(new Date(item.period.to), 'dd.MM.yyyy', { locale: de })}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getItemTypeLabel(item.type)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {new Intl.NumberFormat('de-DE').format(item.quantity)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {PriceFormatter.formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {PriceFormatter.formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zwischensumme:</span>
                <span className="font-medium">{PriceFormatter.formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mehrwertsteuer (19%):</span>
                <span className="font-medium">{PriceFormatter.formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Gesamtbetrag:</span>
                <span>{PriceFormatter.formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Instructions & Notes */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Instructions */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Zahlungshinweise
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Bitte überweisen Sie den Betrag bis zum Fälligkeitsdatum auf das angegebene Konto.
                </p>
                <p>
                  Bei Fragen zur Rechnung kontaktieren Sie uns unter der angegebenen E-Mail-Adresse.
                </p>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  Bemerkungen
                </h3>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Email Status */}
            {invoice.emailSentAt && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  E-Mail Status
                </h3>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      invoice.emailStatus === 'sent' ? 'bg-green-500' : 
                      invoice.emailStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <span>
                      E-Mail {invoice.emailStatus === 'sent' ? 'versendet' : 
                             invoice.emailStatus === 'failed' ? 'fehlgeschlagen' : 
                             'ausstehend'}
                    </span>
                  </div>
                  {invoice.emailSentAt && (
                    <div className="mt-1 text-xs text-gray-500">
                      {format(new Date(invoice.emailSentAt), 'dd.MM.yyyy, HH:mm', { locale: de })} Uhr
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;