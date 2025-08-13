/**
 * @file PackageManagementInterface.tsx
 * @purpose Complete package tracking and management interface with bulk operations and status workflows
 * @created 2025-01-15
 * @modified 2025-08-05
 */
import React, { useState } from 'react';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react';
import { PackageTracking } from '../../types/contract.types';

/**
 * Props for the PackageManagementInterface component
 * @interface PackageManagementInterfaceProps
 */
interface PackageManagementInterfaceProps {
  packages: PackageTracking[];
  onRefresh: () => void;
}

/**
 * Action data structure for package status updates
 * @interface PackageAction
 */
interface PackageAction {
  packageId: string;
  action: 'confirm_arrival' | 'confirm_stored' | 'mark_shipped' | 'mark_delivered';
  notes?: string;
}

/**
 * Comprehensive package management interface for tracking and updating package status
 * 
 * Features:
 * - Complete package workflow management (expected → arrived → stored → shipped → delivered)
 * - Bulk operations for multiple packages with selection
 * - Status-based grouping and display
 * - Individual and bulk action buttons
 * - Package type differentiation (Lagerservice vs Versandservice)
 * - Timestamp tracking for all status changes
 * - Notes system for documentation
 * - Confirmation modals for status updates
 * - Responsive table design with overflow handling
 * 
 * @param {PackageManagementInterfaceProps} props - Component props
 * @param {PackageTracking[]} props.packages - Array of package tracking objects
 * @param {() => void} props.onRefresh - Callback to refresh package data after updates
 * @returns {JSX.Element} Package management interface with status workflow
 * 
 * @complexity O(n log n) - Package grouping and sorting operations
 */
const PackageManagementInterface: React.FC<PackageManagementInterfaceProps> = ({
  packages,
  onRefresh
}) => {
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<PackageAction | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Generates color-coded status badge with icon for package status
   * @param {string} status - Package status ('erwartet'|'angekommen'|'eingelagert'|'versandt'|'zugestellt')
   * @returns {JSX.Element} Status badge with appropriate styling and icon
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'erwartet': { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Erwartet' },
      'angekommen': { color: 'bg-blue-100 text-blue-800', icon: MapPin, text: 'Angekommen' },
      'eingelagert': { color: 'bg-green-100 text-green-800', icon: Package, text: 'Eingelagert' },
      'versandt': { color: 'bg-purple-100 text-purple-800', icon: Truck, text: 'Versandt' },
      'zugestellt': { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, text: 'Zugestellt' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.erwartet;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  /**
   * Generates type badge for package service type
   * @param {string} packageTyp - Package type ('lagerservice'|'versandservice')
   * @returns {JSX.Element} Type badge with appropriate styling and icon
   */
  const getTypeBadge = (packageTyp: string) => {
    const typeConfig = {
      'lagerservice': { color: 'bg-orange-100 text-orange-800', icon: Package, text: 'Lagerservice' },
      'versandservice': { color: 'bg-blue-100 text-blue-800', icon: Truck, text: 'Versandservice' }
    };

    const config = typeConfig[packageTyp as keyof typeof typeConfig] || typeConfig.lagerservice;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  /**
   * Determines available actions based on package status and type
   * @param {PackageTracking} pkg - Package tracking object
   * @returns {Array} Array of available action objects with labels and icons
   */
  const getAvailableActions = (pkg: PackageTracking) => {
    const actions = [];

    switch (pkg.status) {
      case 'erwartet':
        actions.push({ action: 'confirm_arrival', label: 'Ankunft bestätigen', icon: MapPin });
        break;
      case 'angekommen':
        if (pkg.package_typ === 'lagerservice') {
          actions.push({ action: 'confirm_stored', label: 'Einlagerung bestätigen', icon: Package });
        } else {
          actions.push({ action: 'mark_shipped', label: 'Als versandt markieren', icon: Truck });
        }
        break;
      case 'eingelagert':
        actions.push({ action: 'mark_shipped', label: 'Als versandt markieren', icon: Truck });
        break;
      case 'versandt':
        actions.push({ action: 'mark_delivered', label: 'Als zugestellt markieren', icon: CheckCircle });
        break;
    }

    return actions;
  };

  const handlePackageAction = async (packageAction: PackageAction) => {
    try {
      setLoading(true);

      const endpoint = getActionEndpoint(packageAction.action);
      const response = await fetch(endpoint.replace(':id', packageAction.packageId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          package_typ: packages.find(p => p._id === packageAction.packageId)?.package_typ,
          notizen: packageAction.notes
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Package-Status');
      }

      setShowConfirmModal(null);
      setNotes('');
      onRefresh();
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Fehler beim Aktualisieren des Package-Status');
    } finally {
      setLoading(false);
    }
  };

  const getActionEndpoint = (action: string) => {
    switch (action) {
      case 'confirm_arrival':
        return '/api/admin/contracts/:id/confirm-package-arrival';
      case 'confirm_stored':
        return '/api/admin/contracts/:id/confirm-package-stored';
      default:
        return '/api/admin/packages/:id/update-status';
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedPackages.length === 0) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/packages/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          packageIds: selectedPackages,
          action: action,
          notes: notes
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Bulk-Update');
      }

      setSelectedPackages([]);
      setNotes('');
      onRefresh();
    } catch (error) {
      console.error('Error in bulk action:', error);
      alert('Fehler beim Bulk-Update');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedPackages = packages.reduce((groups, pkg) => {
    const status = pkg.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(pkg);
    return groups;
  }, {} as Record<string, PackageTracking[]>);

  const statusOrder = ['erwartet', 'angekommen', 'eingelagert', 'versandt', 'zugestellt'];

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {selectedPackages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedPackages.length} Package(s) ausgewählt
              </span>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('confirm_arrival')}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Ankunft bestätigen
                </button>
                <button
                  onClick={() => handleBulkAction('mark_shipped')}
                  disabled={loading}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  Als versandt markieren
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedPackages([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Auswahl aufheben
            </button>
          </div>
          
          <div className="mt-3">
            <input
              type="text"
              placeholder="Notizen für Bulk-Aktion (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Package Groups */}
      {statusOrder.map(status => {
        const statusPackages = groupedPackages[status] || [];
        if (statusPackages.length === 0) return null;

        return (
          <div key={status} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusBadge(status)}
                  <span className="text-lg font-medium text-gray-900">
                    {statusPackages.length} Package(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={statusPackages.every(pkg => selectedPackages.includes(pkg._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPackages(prev => [...prev, ...statusPackages.map(p => p._id)]);
                          } else {
                            setSelectedPackages(prev => prev.filter(id => !statusPackages.map(p => p._id).includes(id)));
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zeitstempel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notizen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statusPackages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedPackages.includes(pkg._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPackages(prev => [...prev, pkg._id]);
                            } else {
                              setSelectedPackages(prev => prev.filter(id => id !== pkg._id));
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(pkg.package_typ)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pkg.contract?.user?.kontakt?.name || 'Unbekannt'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Vertrag: {pkg.vertrag_id?.toString().slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                            <span>Erstellt: {formatDate(pkg.created_at)}</span>
                          </div>
                          {pkg.ankunft_datum && (
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 text-blue-400 mr-1" />
                              <span>Ankunft: {formatDate(pkg.ankunft_datum)}</span>
                            </div>
                          )}
                          {pkg.einlagerung_datum && (
                            <div className="flex items-center">
                              <Package className="h-3 w-3 text-green-400 mr-1" />
                              <span>Eingelagert: {formatDate(pkg.einlagerung_datum)}</span>
                            </div>
                          )}
                          {pkg.versand_datum && (
                            <div className="flex items-center">
                              <Truck className="h-3 w-3 text-purple-400 mr-1" />
                              <span>Versandt: {formatDate(pkg.versand_datum)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {pkg.notizen ? (
                            <div className="flex items-start space-x-1">
                              <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600 break-words">
                                {pkg.notizen}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Keine Notizen</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {getAvailableActions(pkg).map((action) => {
                            const IconComponent = action.icon;
                            return (
                              <button
                                key={action.action}
                                onClick={() => setShowConfirmModal({ packageId: pkg._id, action: action.action as any })}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                disabled={loading}
                              >
                                <IconComponent className="h-3 w-3 mr-1" />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {packages.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Keine Packages gefunden
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Es wurden keine Packages gefunden, die verwaltet werden müssen.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Package-Status aktualisieren
                  </h3>
                  <p className="text-sm text-gray-500">
                    Möchten Sie diese Aktion wirklich durchführen?
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handlePackageAction({ ...showConfirmModal, notes })}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
              >
                {loading ? 'Wird verarbeitet...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagementInterface;