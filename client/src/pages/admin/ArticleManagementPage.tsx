/**
 * @file ArticleManagementPage.tsx
 * @purpose Admin page for managing FlourIO article synchronization with products
 * @created 2025-10-17
 * @modified 2025-10-17
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Package, AlertCircle, Filter, Search, Tag as TagIcon, Plus, Printer } from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SyncStatusBadge, { SyncStatus } from '../../components/ui/SyncStatusBadge';
import { tokenStorage, apiUtils } from '../../utils/auth';
import AssignCategoryModal from '../../components/admin/AssignCategoryModal';
import ProductCreationModal from '../../components/admin/ProductCreationModal';
import ProductLabelPrintModal from '../../components/ui/ProductLabelPrintModal';

// Types
interface Product {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  priceUnit?: string;
  vendorId: string;
  /** Interne EAN-13 für Etiketten/Kassen-Scan */
  ean?: string;
  tags?: Array<{
    _id: string;
    name: string;
    flourioId?: string;
  }>;
  flourioSync?: {
    articleId?: string;
    status: SyncStatus;
    lastSyncedAt?: string;
    error?: string;
  };
}

interface ProductFilters {
  search: string;
  syncStatus: string;
  category: string;
  missingCategory?: boolean;
}

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  error: number;
  never: number;
}

// ProductArticleRow Component
const ProductArticleRow: React.FC<{
  product: Product;
  onSync: (productId: string) => Promise<void>;
  onPrintLabel: (productId: string) => void;
  loading: boolean;
  selected: boolean;
  onToggleSelect: (productId: string) => void;
}> = ({ product, onSync, onPrintLabel, loading, selected, onToggleSelect }) => {
  const [syncing, setSyncing] = useState(false);

  // Check if product has FlourIO category tag
  const hasFlourioCategory = product.tags?.some(tag => tag.flourioId) || false;

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(product._id);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const syncStatus = product.flourioSync?.status || 'never';

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product._id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        <div className="flex items-center space-x-2">
          <span>{product.name}</span>
          {!hasFlourioCategory && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="Keine FlourIO-Kategorie zugewiesen">
              <AlertCircle className="h-3 w-3 mr-1" />
              Kategorie fehlt
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {product.tags && product.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {product.tags.map(tag => (
              <span
                key={tag._id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">Keine Tags</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(product.price)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
        {product.ean || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <SyncStatusBadge
          status={syncStatus}
          lastSyncedAt={product.flourioSync?.lastSyncedAt}
          errorMessage={product.flourioSync?.error}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {product.flourioSync?.articleId || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          {product.ean && (
            <button
              onClick={() => onPrintLabel(product._id)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Etikett mit Barcode drucken"
            >
              <Printer className="h-3 w-3 mr-1" />
              Etikett
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sync...' : 'Sync'}
          </button>
        </div>
      </td>
    </tr>
  );
};

// Main Component
const ArticleManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    syncStatus: '',
    category: ''
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [availableTags, setAvailableTags] = useState<Array<{ _id: string; name: string; flourioId?: string }>>([]);
  const [availableVendors, setAvailableVendors] = useState<Array<{ _id: string; businessName: string }>>([]);

  const apiUrl = apiUtils.getApiUrl();
  const token = tokenStorage.getToken('ADMIN');

  const getHeaders = () => ({
    'Authorization': token ? `Bearer ${token}` : '',
    'x-auth-token': token || '',
    'Content-Type': 'application/json'
  });

  // Fetch available tags for category assignment
  const fetchAvailableTags = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/admin/flourio/categories`, {
        headers: getHeaders()
      });

      if (response.data.success && response.data.data) {
        setAvailableTags(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching available tags:', err);
    }
  }, [apiUrl, token]);

  // Fetch available vendors for product creation
  const fetchAvailableVendors = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/admin/users`, {
        headers: getHeaders()
      });

      if (response.data) {
        // Filter only vendors and map to required format
        const vendors = response.data
          .filter((user: any) => user.isVendor || user.vendorProfile)
          .map((user: any) => ({
            _id: user._id,
            businessName: user.vendorProfile?.unternehmen || user.kontakt?.name || user.email || user.username
          }));

        setAvailableVendors(vendors);
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      // Don't show error to user, vendors list is optional
    }
  }, [apiUrl, token]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.syncStatus) params.append('syncStatus', filters.syncStatus);
      if (filters.category) params.append('category', filters.category);

      const response = await axios.get(`${apiUrl}/admin/flourio/products?${params.toString()}`, {
        headers: getHeaders()
      });

      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Fehler beim Laden der Produkte');
    }
  }, [apiUrl, token, filters]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchAvailableTags(), fetchAvailableVendors(), fetchProducts()]);
      } catch (err) {
        setError('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchAvailableTags, fetchAvailableVendors, fetchProducts]);

  // Sync single product
  const handleProductSync = async (productId: string) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post(
        `${apiUrl}/admin/flourio/products/${productId}/sync`,
        {},
        { headers: getHeaders() }
      );

      if (response.data.success) {
        setSuccessMessage('Produkt erfolgreich synchronisiert');
        await fetchProducts();
      }
    } catch (err: any) {
      console.error('Error syncing product:', err);
      setError(err.response?.data?.message || 'Fehler bei der Produkt-Synchronisation');
    }
  };

  // Bulk sync
  const handleBulkSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post(
        `${apiUrl}/admin/flourio/products/sync-bulk`,
        { productIds: products.map(p => p._id) },
        { headers: getHeaders() }
      );

      if (response.data.success) {
        setSuccessMessage(`${response.data.data.synced} Produkte erfolgreich synchronisiert`);
        await fetchProducts();
      }
    } catch (err: any) {
      console.error('Error bulk syncing products:', err);
      setError(err.response?.data?.message || 'Fehler bei der Massen-Synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  // Filter products by missing category (client-side)
  const filteredProducts = filters.missingCategory
    ? products.filter(product => !product.tags?.some(tag => tag.flourioId))
    : products;

  // Calculate sync stats
  const syncStats: SyncStats = filteredProducts.reduce(
    (acc, product) => {
      const status = product.flourioSync?.status || 'never';
      acc.total++;
      acc[status]++;
      return acc;
    },
    { total: 0, synced: 0, pending: 0, error: 0, never: 0 }
  );

  // Filter change handler
  const handleFilterChange = (key: keyof ProductFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({ search: '', syncStatus: '', category: '', missingCategory: false });
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Select/deselect all products (only visible filtered products)
  const toggleSelectAll = () => {
    const visibleProductIds = filteredProducts.map(p => p._id);
    const allVisibleSelected = visibleProductIds.every(id => selectedProducts.includes(id));

    if (allVisibleSelected) {
      setSelectedProducts(prev => prev.filter(id => !visibleProductIds.includes(id)));
    } else {
      setSelectedProducts(prev => {
        const combined = [...prev, ...visibleProductIds];
        // Remove duplicates using filter
        return combined.filter((id, index) => combined.indexOf(id) === index);
      });
    }
  };

  // Handle successful category assignment
  const handleAssignSuccess = () => {
    setSelectedProducts([]);
    setShowAssignModal(false);
    fetchProducts();
  };

  // Handle successful product creation
  const handleProductCreated = (product: any) => {
    setSuccessMessage(`Produkt "${product.name}" erfolgreich erstellt!`);
    setShowCreateModal(false);
    fetchProducts();

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Artikel-Verwaltung</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Artikel-Verwaltung</h1>
          <p className="mt-1 text-sm text-gray-600">
            Synchronisieren Sie Produkte mit FlourIO Artikeln
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Produkt erstellen
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fehler</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <Package className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tag Sync Section - DEPRECATED: Tags are now synced automatically with Articles */}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{syncStats.total}</div>
            <div className="text-sm text-gray-500">Gesamt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{syncStats.synced}</div>
            <div className="text-sm text-gray-500">Synchronisiert</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{syncStats.pending}</div>
            <div className="text-sm text-gray-500">Ausstehend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{syncStats.error}</div>
            <div className="text-sm text-gray-500">Fehler</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{syncStats.never}</div>
            <div className="text-sm text-gray-500">Nie synchronisiert</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Produkte</CardTitle>
            <div className="flex space-x-3">
              {selectedProducts.length > 0 && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <TagIcon className="h-4 w-4 mr-2" />
                  Kategorie zuweisen ({selectedProducts.length})
                </button>
              )}
              <button
                onClick={handleBulkSync}
                disabled={syncing || products.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisiere...' : 'Alle Artikel zu FlourIO synchronisieren'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Produkt suchen..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.syncStatus}
              onChange={(e) => handleFilterChange('syncStatus', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Alle Status</option>
              <option value="synced">Synchronisiert</option>
              <option value="pending">Ausstehend</option>
              <option value="error">Fehler</option>
              <option value="never">Nie synchronisiert</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Alle Produkt-Kategorien</option>
              {Array.from(new Set(products.map(p => p.category))).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.missingCategory || false}
                onChange={(e) => setFilters(prev => ({ ...prev, missingCategory: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Nur ohne Kategorie</span>
            </label>

            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter zurücksetzen
            </button>
          </div>

          {/* Table */}
          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          filteredProducts.every(p => selectedProducts.includes(p._id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EAN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FlourIO Artikel ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <ProductArticleRow
                      key={product._id}
                      product={product}
                      onSync={handleProductSync}
                      onPrintLabel={(id) => setLabelProduct(products.find(p => p._id === id) || null)}
                      loading={syncing}
                      selected={selectedProducts.includes(product._id)}
                      onToggleSelect={toggleProductSelection}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Keine Produkte gefunden.</p>
              <p className="text-sm mt-1">Passen Sie die Filter an oder fügen Sie Produkte hinzu.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Category Modal */}
      {showAssignModal && (
        <AssignCategoryModal
          selectedProducts={selectedProducts.map(id => {
            const product = products.find(p => p._id === id);
            return { _id: id, name: product?.name || 'Unknown' };
          })}
          categories={availableTags}
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
          apiUrl={apiUrl}
          token={token || ''}
        />
      )}

      {/* Product Creation Modal */}
      <ProductCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProductCreated}
        isVendor={false}
        availableTags={availableTags}
        availableVendors={availableVendors}
      />

      {/* Label Print Modal */}
      <ProductLabelPrintModal
        isOpen={!!labelProduct}
        onClose={() => setLabelProduct(null)}
        product={labelProduct ? {
          name: labelProduct.name,
          price: labelProduct.price,
          priceUnit: labelProduct.priceUnit || 'piece',
          ean: labelProduct.ean
        } : null}
      />
    </div>
  );
};

export default ArticleManagementPage;
