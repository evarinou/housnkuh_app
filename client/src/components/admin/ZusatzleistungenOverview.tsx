/**
 * @file ZusatzleistungenOverview.tsx
 * @purpose Comprehensive overview and management interface for additional services (Lager/Versand) with statistics
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  MoreVertical,
  Edit,
  Eye
} from 'lucide-react';
import { Contract } from '../../types/contract.types';

/**
 * Props for the ZusatzleistungenOverview component
 * @interface ZusatzleistungenOverviewProps
 */
interface ZusatzleistungenOverviewProps {
  contracts: Contract[];
  statistics: {
    totalLagerservice: number;
    totalVersandservice: number;
    pendingPackages: number;
    activePackages: number;
  };
  onRefresh: () => void;
}

/**
 * Action data structure for contract operations
 * @interface ContractAction
 */
interface ContractAction {
  contract: Contract;
  action: 'view' | 'edit' | 'manage';
}

/**
 * Comprehensive overview and management interface for additional services (Zusatzleistungen)
 * 
 * Features:
 * - Statistics dashboard with service breakdown (Lager/Versand/Active/Pending)
 * - Interactive contract table with service badges
 * - Bulk selection and operations
 * - Service status indicators with color coding
 * - Monthly cost calculations including additional services
 * - Action menu for contract management (view/edit/manage packages)
 * - Service confirmation status tracking
 * - Responsive statistics cards layout
 * - Empty state handling
 * 
 * @param {ZusatzleistungenOverviewProps} props - Component props
 * @param {Contract[]} props.contracts - Array of contracts with additional services
 * @param {Object} props.statistics - Service statistics object
 * @param {() => void} props.onRefresh - Callback to refresh data after operations
 * @returns {JSX.Element} Service overview interface with statistics and management
 * 
 * @complexity O(n) - Linear contract processing and rendering
 */
const ZusatzleistungenOverview: React.FC<ZusatzleistungenOverviewProps> = ({
  contracts,
  statistics,
  onRefresh
}) => {
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  const getServiceBadge = (contract: Contract) => {
    const services = [];
    
    if (contract.zusatzleistungen?.lagerservice) {
      services.push(
        <span
          key="lager"
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
            contract.zusatzleistungen.lagerservice_bestätigt
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          <Package className="h-3 w-3 mr-1" />
          Lager
          {contract.zusatzleistungen.lagerservice_bestätigt && (
            <CheckCircle className="h-3 w-3 ml-1" />
          )}
        </span>
      );
    }

    if (contract.zusatzleistungen?.versandservice) {
      services.push(
        <span
          key="versand"
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            contract.zusatzleistungen.versandservice_aktiv
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <Truck className="h-3 w-3 mr-1" />
          Versand
          {contract.zusatzleistungen.versandservice_aktiv && (
            <CheckCircle className="h-3 w-3 ml-1" />
          )}
        </span>
      );
    }

    return services;
  };

  const getStatusIcon = (contract: Contract) => {
    const hasLager = contract.zusatzleistungen?.lagerservice;
    const hasVersand = contract.zusatzleistungen?.versandservice;
    const lagerConfirmed = contract.zusatzleistungen?.lagerservice_bestätigt;
    const versandActive = contract.zusatzleistungen?.versandservice_aktiv;

    if ((hasLager && lagerConfirmed) || (hasVersand && versandActive)) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (hasLager || hasVersand) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }

    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const calculateMonthlyCosts = (contract: Contract) => {
    let costs = contract.totalMonthlyPrice || 0;
    
    if (contract.zusatzleistungen?.lagerservice) {
      costs += contract.zusatzleistungen_kosten?.lagerservice_monatlich || 20;
    }
    
    if (contract.zusatzleistungen?.versandservice) {
      costs += contract.zusatzleistungen_kosten?.versandservice_monatlich || 5;
    }

    return costs;
  };

  const handleSelectContract = (contractId: string, selected: boolean) => {
    if (selected) {
      setSelectedContracts(prev => [...prev, contractId]);
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedContracts(contracts.map(c => c._id));
    } else {
      setSelectedContracts([]);
    }
  };

  const handleContractAction = async (action: ContractAction) => {
    switch (action.action) {
      case 'view':
        // Navigate to contract details
        window.open(`/admin/contracts/${action.contract._id}`, '_blank');
        break;
      case 'edit':
        // Open edit modal
        // TODO: Implement edit modal
        break;
      case 'manage':
        // Navigate to package management
        // TODO: Implement navigation
        break;
    }
    setShowActionMenu(null);
  };

  const displayStats = {
    total: contracts.length,
    withLager: statistics?.totalLagerservice || contracts.filter(c => c.zusatzleistungen?.lagerservice).length,
    withVersand: statistics?.totalVersandservice || contracts.filter(c => c.zusatzleistungen?.versandservice).length,
    active: statistics?.activePackages || contracts.filter(c => 
      c.zusatzleistungen?.lagerservice_bestätigt || 
      c.zusatzleistungen?.versandservice_aktiv
    ).length,
    pending: statistics?.pendingPackages || contracts.filter(c => 
      (c.zusatzleistungen?.lagerservice && !c.zusatzleistungen?.lagerservice_bestätigt) ||
      (c.zusatzleistungen?.versandservice && !c.zusatzleistungen?.versandservice_aktiv)
    ).length
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Gesamt
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {displayStats.total}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-orange-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Lagerservice
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {displayStats.withLager}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Truck className="h-8 w-8 text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Versandservice
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {displayStats.withVersand}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Aktiv
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {displayStats.active}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Wartend
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {displayStats.pending}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Verträge mit Zusatzleistungen ({contracts.length})
            </h3>
            
            {selectedContracts.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {selectedContracts.length} ausgewählt
                </span>
                <button className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-dark">
                  Bulk-Aktion
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedContracts.length === contracts.length && contracts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monatliche Kosten
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vertragsdauer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedContracts.includes(contract._id)}
                      onChange={(e) => handleSelectContract(contract._id, e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusIcon(contract)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contract.user?.kontakt?.name || 'Unbekannt'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.user?.kontakt?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap">
                      {getServiceBadge(contract)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    €{calculateMonthlyCosts(contract).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.contractDuration} Monate
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === contract._id ? null : contract._id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActionMenu === contract._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                          <div className="py-1">
                            <button
                              onClick={() => handleContractAction({ contract, action: 'view' })}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details anzeigen
                            </button>
                            <button
                              onClick={() => handleContractAction({ contract, action: 'edit' })}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleContractAction({ contract, action: 'manage' })}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Packages verwalten
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contracts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Keine Verträge gefunden
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Es wurden keine Verträge mit Zusatzleistungen gefunden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZusatzleistungenOverview;