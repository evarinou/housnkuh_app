/**
 * @file InvoiceList.tsx
 * @purpose React component for displaying vendor invoices with filtering, sorting and pagination
 * @created 2025-09-09
 * @modified 2025-09-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import StatusBadge from '../ui/StatusBadge';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  period: {
    month: number;
    year: number;
  };
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceListProps {
  className?: string;
}

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
}

type SortField = 'createdAt' | 'totalAmount' | 'status' | 'dueDate';
type SortDirection = 'asc' | 'desc';

const InvoiceList: React.FC<InvoiceListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const itemsPerPage = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort: sortField,
        direction: sortDirection,
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      const response = await fetch(`${apiUrl}/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Rechnungen');
      }

      const result = await response.json();
      setInvoices(result.data.invoices || []);
      setTotalCount(result.data.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortField, sortDirection, filters]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('vendorToken');
      
      const response = await fetch(`${apiUrl}/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rechnung-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleViewDetail = (invoiceId: string) => {
    navigate(`/vendor/customer-invoices/${invoiceId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPeriod = (period: { month: number; year: number }) => {
    const date = new Date(period.year, period.month - 1);
    return format(date, 'MMMM yyyy', { locale: de });
  };


  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <i className="fas fa-sort text-gray-400"></i>;
    }
    return (
      <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} text-blue-600`}></i>
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Rechnungen</h2>
        </div>
        
        {/* Loading skeleton */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/8"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
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
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={fetchInvoices}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">
          Rechnungen ({totalCount})
        </h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle Status</option>
            <option value="draft">Entwurf</option>
            <option value="sent">Versendet</option>
            <option value="paid">Bezahlt</option>
            <option value="overdue">Überfällig</option>
            <option value="cancelled">Storniert</option>
          </select>
          
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Von Datum"
          />
          
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Bis Datum"
          />
          
          {(filters.status || filters.dateFrom || filters.dateTo) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <i className="fas fa-times"></i> Filter löschen
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Rechnungsnr.</span>
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Betrag</span>
                    {getSortIcon('totalAmount')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Fällig am</span>
                    {getSortIcon('dueDate')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <i className="fas fa-file-invoice text-4xl mb-4"></i>
                      <p className="text-lg font-medium">Keine Rechnungen gefunden</p>
                      <p className="text-sm">Es wurden noch keine Rechnungen erstellt.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(invoice.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPeriod(invoice.period)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge 
                        status={invoice.status} 
                        dueDate={invoice.dueDate}
                        paidDate={invoice.paidDate}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetail(invoice.id)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Details anzeigen"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        onClick={() => handleDownload(invoice.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="PDF herunterladen"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-gray-500">
              <i className="fas fa-file-invoice text-4xl mb-4"></i>
              <p className="text-lg font-medium">Keine Rechnungen gefunden</p>
              <p className="text-sm">Es wurden noch keine Rechnungen erstellt.</p>
            </div>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPeriod(invoice.period)}
                  </div>
                </div>
                <StatusBadge 
                  status={invoice.status} 
                  dueDate={invoice.dueDate}
                  paidDate={invoice.paidDate}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Fällig: {format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de })}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetail(invoice.id)}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <i className="fas fa-eye mr-1"></i>
                    Details
                  </button>
                  <button
                    onClick={() => handleDownload(invoice.id)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <i className="fas fa-download mr-1"></i>
                    PDF
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Zeige {((currentPage - 1) * itemsPerPage) + 1} bis {Math.min(currentPage * itemsPerPage, totalCount)} von {totalCount} Rechnungen
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <i className="fas fa-chevron-left"></i> Zurück
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-2 text-gray-600">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      currentPage === totalPages
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Weiter <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;