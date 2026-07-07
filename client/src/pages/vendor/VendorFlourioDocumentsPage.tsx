/**
 * @file VendorFlourioDocumentsPage.tsx
 * @purpose Vendor page to view their own Flourio documents (invoices, orders, etc.)
 * @created 2026-03-31
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Filter, X } from 'lucide-react';
import axios from 'axios';
import VendorLayout from '../../components/vendor/VendorLayout';
import { tokenStorage, apiUtils } from '../../utils/auth';
import { PriceFormatter } from '../../utils/priceFormatting';

interface FlourioDoc {
  _id: string;
  flourioId: string;
  type: string;
  number: string;
  date: string;
  items: Array<{
    flourioArticleId: string;
    productId?: { _id: string; name: string };
    title?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount?: number;
    netTotal: number;
    grossTotal: number;
    cancelled?: boolean;
  }>;
  netTotal: number;
  grossTotal: number;
  currency: string;
  status: string;
  isVoided?: boolean;
  credit?: boolean;
  paymentStatus?: string;
}

const typeLabels: Record<string, string> = {
  R: 'Rechnung (Kassenbon)', Belegabbruch: 'Belegabbruch'
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700'
};

const statusLabels: Record<string, string> = {
  draft: 'Entwurf', sent: 'Versendet', paid: 'Bezahlt', cancelled: 'Storniert'
};

const VendorFlourioDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<FlourioDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<FlourioDoc | null>(null);

  const apiUrl = apiUtils.getApiUrl();
  const token = tokenStorage.getToken('VENDOR');

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'x-auth-token': token || '',
    'Content-Type': 'application/json'
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;

      const response = await axios.get(`${apiUrl}/vendor-auth/flourio/documents`, {
        headers: getHeaders(),
        params
      });

      if (response.data?.success) {
        setDocuments(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, typeFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('de-DE');

  return (
    <VendorLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-emerald-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Meine Dokumente</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Alle Typen</option>
              <option value="R">Rechnung (Kassenbon)</option>
              <option value="Belegabbruch">Belegabbruch</option>
            </select>
            {typeFilter && (
              <button onClick={() => setTypeFilter('')} className="text-sm text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-sm text-gray-500 ml-auto">{documents.length} Dokumente</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Keine Dokumente</h3>
            <p className="text-gray-600">Sobald Dokumente in Flourio erstellt werden, erscheinen sie hier.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nummer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc._id} onClick={() => setSelectedDoc(doc)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {doc.number}
                      {doc.isVoided && (
                        <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Storniert
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{typeLabels[doc.type] || doc.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(doc.date)}</td>
                    <td className={`px-6 py-4 text-sm font-semibold text-right ${doc.isVoided ? 'line-through text-gray-400' : ''}`}>{PriceFormatter.formatCurrency(doc.grossTotal)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[doc.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[doc.status] || doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {typeLabels[selectedDoc.type] || selectedDoc.type} {selectedDoc.number}
                    {selectedDoc.isVoided && (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 align-middle">
                        Storniert
                      </span>
                    )}
                  </h2>
                  <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div><span className="text-gray-500">Datum:</span> <span className="font-medium">{formatDate(selectedDoc.date)}</span></div>
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedDoc.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[selectedDoc.status] || selectedDoc.status}
                    </span>
                  </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500">Artikel</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500">Menge</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500">Preis</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedDoc.items.map((item, i) => (
                      <tr key={i} className={item.cancelled ? 'line-through text-gray-400' : ''}>
                        <td className="px-4 py-2 text-sm">
                          {item.title || item.productId?.name || item.flourioArticleId}
                          {item.cancelled && (
                            <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Storniert
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{PriceFormatter.formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{PriceFormatter.formatCurrency(item.grossTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t pt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Netto:</span><span>{PriceFormatter.formatCurrency(selectedDoc.netTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">MwSt:</span><span>{PriceFormatter.formatCurrency(selectedDoc.grossTotal - selectedDoc.netTotal)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Gesamt:</span><span>{PriceFormatter.formatCurrency(selectedDoc.grossTotal)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorFlourioDocumentsPage;
