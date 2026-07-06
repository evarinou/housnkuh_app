/**
 * @file InvoiceDashboard.tsx
 * @purpose Admin dashboard for comprehensive invoice management and statistics overview
 * @created 2025-01-15
 * @modified 2025-09-15
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  TrendingUp,
  Eye,
  Mail,
  Edit,
  RefreshCw,
  Plus,
  TrendingDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import StatusBadge, { InvoiceStatus } from '../../components/ui/StatusBadge';
import ManualInvoiceGenerator from '../../components/admin/ManualInvoiceGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { tokenStorage, apiUtils } from '../../utils/auth';

// Types and interfaces
interface Invoice {
  _id: string;
  invoiceNumber: string;
  vendor: {
    _id: string;
    kontakt: {
      name: string;
      email: string;
    };
  };
  status: InvoiceStatus;
  totalAmount: number;
  createdAt: string;
  dueDate: string;
  paidDate?: string;
  period: {
    month: number;
    year: number;
  };
}

interface InvoiceStats {
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueCount: number;
  };
  statusBreakdown: Array<{
    _id: InvoiceStatus;
    count: number;
    totalAmount: number;
  }>;
  monthlyStats: Array<{
    _id: number;
    count: number;
    totalAmount: number;
    avgAmount: number;
  }>;
  recentInvoices: Invoice[];
}

interface InvoiceFilters {
  status: string;
  vendor: string;
  month: string;
  year: string;
  search: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  iconBgColor: string;
  iconColor: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

// Chart colors
const CHART_COLORS = ['#f97316', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// Status color mapping  
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#64748b',
  sent: '#06b6d4',
  paid: '#10b981',
  overdue: '#ef4444',
  cancelled: '#64748b'
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-DE');
};

const getStatusLabel = (status: InvoiceStatus): string => {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Entwurf',
    sent: 'Versendet',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
    cancelled: 'Storniert'
  };
  return labels[status] || status;
};

// Enhanced Components using Card UI
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  change,
  changeType = 'neutral'
}) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' && title.toLowerCase().includes('revenue') 
              ? formatCurrency(value)
              : value
            }
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {changeType === 'positive' ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : changeType === 'negative' ? (
                <TrendingDown className="w-4 h-4 mr-1" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-1" />
              )}
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MonthlyRevenueChart: React.FC<{ data: InvoiceStats['monthlyStats'] }> = ({ data }) => {
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthData = data.find(item => item._id === month);
      return {
        month: MONTH_NAMES[index],
        revenue: monthData?.totalAmount || 0,
        count: monthData?.count || 0
      };
    });
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monatliche Umsatzentwicklung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Umsatz' : 'Anzahl'
                ]}
                labelFormatter={(label) => `Monat: ${label}`}
              />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBreakdownChart: React.FC<{ data: InvoiceStats['statusBreakdown'] }> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: getStatusLabel(item._id),
      value: item.count,
      amount: item.totalAmount,
      color: STATUS_COLORS[item._id] || '#64748b'
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Verteilung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} (${formatCurrency(props.payload.amount)})`,
                  'Anzahl'
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const RecentInvoicesTable: React.FC<{
  invoices: Invoice[],
  onView: (invoice: Invoice) => Promise<void>,
  onResend: (invoice: Invoice) => Promise<void>,
  onDownload: (invoice: Invoice) => Promise<void>
}> = ({ invoices, onView, onResend, onDownload }) => (
  <Card>
    <CardHeader>
      <CardTitle>Neueste Rechnungen</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rechnungsnummer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verkäufer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Erstellt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fällig
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.vendor?.kontakt?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge 
                    status={invoice.status}
                    dueDate={invoice.dueDate}
                    paidDate={invoice.paidDate}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(invoice.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(invoice.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onView(invoice)}
                      title="Rechnung anzeigen"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onResend(invoice)}
                      title="E-Mail erneut senden"
                      className="text-green-600 hover:text-green-900"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDownload(invoice)}
                      title="PDF herunterladen"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);


// Main component
const InvoiceDashboard: React.FC = () => {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: '',
    vendor: '',
    month: '',
    year: new Date().getFullYear().toString(),
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch invoice statistics
  const fetchStats = useCallback(async () => {
    try {
      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');

      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
        'x-auth-token': token || '',
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${apiUrl}/admin/invoices/stats`, { headers });

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError('Fehler beim Laden der Statistiken');
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Daten');
    }
  }, []);

  // Fetch invoices with pagination and filters
  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Apply filters
      if (filters.status) params.append('status', filters.status);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.vendor) params.append('vendor', filters.vendor);
      if (filters.search) params.append('search', filters.search);
      
      // Pagination
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');
      const response = await axios.get(`${apiUrl}/invoices?${params.toString()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || ''
        }
      });
      
      if (response.data.success) {
        setInvoices(response.data.data.invoices || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination?.total || 0,
          pages: response.data.data.pagination?.pages || 0
        }));
      }
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError('Fehler beim Laden der Rechnungen');
    }
  }, [filters, pagination.page, pagination.limit]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([fetchStats(), fetchInvoices()]);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Fehler beim Laden der Dashboard-Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchStats, fetchInvoices]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchInvoices();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchInvoices]);

  // Refresh dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchInvoices()]);
    setRefreshing(false);
  };

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      
      // Apply current filters to export
      if (filters.status) params.append('status', filters.status);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.vendor) params.append('vendor', filters.vendor);
      if (filters.search) params.append('search', filters.search);

      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');
      const response = await axios.get(`${apiUrl}/admin/invoices/export?${params.toString()}`, {
        responseType: 'blob',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || ''
        }
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rechnungen_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Fehler beim Exportieren der Rechnungen');
    } finally {
      setExporting(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      vendor: '',
      month: '',
      year: new Date().getFullYear().toString(),
      search: ''
    });
  };

  // Handle invoice actions
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');

      const response = await fetch(`${apiUrl}/invoices/${invoice._id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the object URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        const errorText = await response.text();
        console.error('Failed to load PDF:', response.status, response.statusText);
        console.error('Error response:', errorText);
        setError(`Fehler beim Laden der PDF-Datei: ${response.status}`);
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      setError('Fehler beim Anzeigen der Rechnung');
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');

      const response = await fetch(`${apiUrl}/invoices/${invoice._id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || ''
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download PDF:', response.status, response.statusText);
        setError('Fehler beim Herunterladen der PDF-Datei');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setError('Fehler beim Herunterladen der Rechnung');
    }
  };

  const handleResendInvoice = async (invoice: Invoice) => {
    try {
      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken('ADMIN');
      await axios.post(`${apiUrl}/admin/invoices/${invoice._id}/resend`, {}, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || ''
        }
      });
      setError(null);
      // Optionally show success message
      await fetchStats(); // Refresh data
    } catch (err: any) {
      console.error('Error resending invoice:', err);
      setError('Fehler beim Versenden der Rechnung');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Rechnungs-Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Rechnungs-Dashboard</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rechnungs-Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Übersicht und Verwaltung aller Rechnungen
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>

          <ManualInvoiceGenerator
            onGenerationComplete={handleRefresh}
            className="inline-flex items-center text-sm leading-4 font-medium"
          />

          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exportiere...' : 'CSV Export'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Gesamt Rechnungen"
          value={stats?.summary?.totalInvoices || 0}
          icon={FileText}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Gesamt Umsatz"
          value={stats?.summary?.totalRevenue || 0}
          icon={DollarSign}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="Bezahlter Umsatz"
          value={stats?.summary?.paidRevenue || 0}
          icon={TrendingUp}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          change={stats?.summary?.totalRevenue ?
            `${Math.round((stats?.summary?.paidRevenue / stats?.summary?.totalRevenue) * 100)}%` : '0%'}
          changeType="positive"
        />
        <StatCard
          title="Überfällig"
          value={stats?.summary?.overdueCount || 0}
          icon={AlertCircle}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={stats?.monthlyStats || []} />
        <StatusBreakdownChart data={stats?.statusBreakdown || []} />
      </div>

      {/* Filters and Invoice Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Rechnungen verwalten</CardTitle>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Filter zurücksetzen
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechnungsnummer suchen..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="sent">Versendet</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Überfällig</option>
              <option value="cancelled">Storniert</option>
            </select>

            {/* Month Filter */}
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Alle Monate</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <Plus className="h-4 w-4 mr-1" />
                Neue Rechnung
              </button>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <RecentInvoicesTable
            invoices={invoices}
            onView={handleViewInvoice}
            onResend={handleResendInvoice}
            onDownload={handleDownloadInvoice}
          />

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Zeige {((pagination.page - 1) * pagination.limit) + 1} bis{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} von{' '}
                {pagination.total} Rechnungen
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Zurück
                </button>
                
                <span className="px-3 py-1 text-sm border bg-blue-50 border-blue-200">
                  {pagination.page} von {pagination.pages}
                </span>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDashboard;