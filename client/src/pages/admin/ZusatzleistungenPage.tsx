/**
 * @file ZusatzleistungenPage.tsx
 * @purpose Admin interface for managing additional services (Lager/Versand) with contract tracking and package management
 * @created 2024-12-03
 * @modified 2025-08-04
 */

// client/src/pages/admin/ZusatzleistungenPage.tsx
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Download, RefreshCw } from 'lucide-react';
import ZusatzleistungenOverview from '../../components/admin/ZusatzleistungenOverview';
import PackageManagementInterface from '../../components/admin/PackageManagementInterface';
import { Contract, PackageTracking } from '../../types/contract.types';

/**
 * Filter criteria for additional services
 * @interface ZusatzleistungenFilter
 */
interface ZusatzleistungenFilter {
  service_type?: 'lager' | 'versand' | '';
  status?: 'active' | 'inactive' | 'pending' | '';
  search?: string;
}

/**
 * Admin additional services management page
 * @description Manages Lager and Versand services with dual-tab interface for overview and package tracking
 * @returns {React.FC} Additional services management interface
 * @complexity Complex business logic with filtering, dual-tab interface, and service management
 */
const ZusatzleistungenPage: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [packages, setPackages] = useState<PackageTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'packages'>('overview');
  const [filters, setFilters] = useState<ZusatzleistungenFilter>({
    service_type: '',
    status: '',
    search: ''
  });

  /**
   * Fetches contracts with additional services from the API
   * @description Retrieves all contracts that include Lager or Versand services,
   * with filtering and package extraction capabilities
   * @async
   * @returns {Promise<void>} Updates component state with contracts and packages
   * @complexity Filters contracts and extracts package data for separate display
   */
  const fetchContracts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.service_type) {
        queryParams.append('service_type', filters.service_type);
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }

      const response = await fetch(`/api/admin/contracts/zusatzleistungen?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Verträge');
      }

      const data = await response.json();
      if (data.success) {
        setContracts(data.contracts);
        // Extract packages from contracts
        const allPackages = data.contracts.flatMap((contract: any) => 
          contract.packages?.map((pkg: any) => ({
            ...pkg,
            contract: {
              _id: contract._id,
              user: contract.user,
              totalMonthlyPrice: contract.totalMonthlyPrice
            }
          })) || []
        );
        setPackages(allPackages);
      } else {
        throw new Error(data.error || 'Unbekannter Fehler');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filters]);

  /**
   * Updates filter criteria for contract listing
   * @param {Partial<ZusatzleistungenFilter>} newFilters - New filter values to merge
   * @returns {void} Updates filter state which triggers data refetch
   */
  const handleFilterChange = (newFilters: Partial<ZusatzleistungenFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * Refreshes contract and package data
   * @returns {void} Triggers data refetch
   */
  const handleRefresh = () => {
    fetchContracts();
  };

  /**
   * Exports contract data as CSV file
   * @description Downloads filtered contract data in CSV format with current filters applied
   * @async
   * @returns {Promise<void>} Triggers CSV download in browser
   */
  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.service_type) queryParams.append('service_type', filters.service_type);
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('format', 'csv');

      const response = await fetch(`/api/admin/contracts/zusatzleistungen/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zusatzleistungen-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        contract.user?.kontakt?.name?.toLowerCase().includes(searchLower) ||
        contract.user?.kontakt?.email?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredPackages = packages.filter(pkg => {
    if (filters.service_type) {
      return pkg.package_typ === filters.service_type + 'service';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Zusatzleistungen Management</h1>
              <p className="text-gray-600">Verwalten Sie Lager- und Versandservice für Vendors</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Verträge Übersicht
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'packages'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Package Management
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service-Typ
            </label>
            <select
              value={filters.service_type}
              onChange={(e) => handleFilterChange({ service_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Alle Services</option>
              <option value="lager">Lagerservice</option>
              <option value="versand">Versandservice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="pending">Wartend</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nach Vendor Name oder E-Mail suchen..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-gray-600">Lade Daten...</span>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ZusatzleistungenOverview
              contracts={filteredContracts}
              statistics={{
                totalLagerservice: filteredContracts.filter(c => c.zusatzleistungen?.lagerservice).length,
                totalVersandservice: filteredContracts.filter(c => c.zusatzleistungen?.versandservice).length,
                pendingPackages: filteredPackages.filter(p => p.status === 'erwartet' || p.status === 'angekommen').length,
                activePackages: filteredPackages.filter(p => p.status === 'eingelagert' || p.status === 'versandt').length
              }}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'packages' && (
            <PackageManagementInterface
              packages={filteredPackages}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ZusatzleistungenPage;