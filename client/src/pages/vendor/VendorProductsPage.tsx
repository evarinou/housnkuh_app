/**
 * @file VendorProductsPage.tsx
 * @purpose Vendor product management page with card-based product list, search, filters, and sync functionality
 * @created 2025-01-15
 * @modified 2025-11-17
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, Plus, RefreshCw, Search, X } from 'lucide-react';
import axios from 'axios';
import VendorLayout from '../../components/vendor/VendorLayout';
import ProductCard, { Product } from '../../components/vendor/ProductCard';
import ProductCreationModal, { VendorMietfach } from '../../components/admin/ProductCreationModal';
import { tokenStorage, apiUtils } from '../../utils/auth';

/**
 * VendorProductsPage - Product management page with full functionality
 *
 * Features:
 * - Card-based product grid display
 * - Search functionality with debouncing
 * - Category filtering
 * - Individual product sync
 * - Bulk sync all products
 * - Stats display (total/synced counts)
 * - Empty state handling
 * - Loading states
 *
 * @component
 * @returns {JSX.Element} The product management page
 */
const VendorProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [vendorMietfaecher, setVendorMietfaecher] = useState<VendorMietfach[]>([]);

  const apiUrl = apiUtils.getApiUrl();
  const token = tokenStorage.getToken('VENDOR');

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'x-auth-token': token || '',
    'Content-Type': 'application/json'
  });

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUrl}/vendor-auth/flourio/products`, {
        headers: getHeaders()
      });

      const products = response.data?.data || response.data;
      if (Array.isArray(products)) {
        setProducts(products);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch vendor's active Mietfächer (for product creation)
  useEffect(() => {
    const fetchMietfaecher = async () => {
      try {
        const response = await axios.get(`${apiUrl}/vendor-auth/mietfaecher`, {
          headers: getHeaders()
        });
        if (response.data?.success) {
          setVendorMietfaecher(response.data.data || []);
        }
      } catch (err) {
        // Silent fail — Mietfächer just won't show in create modal
      }
    };
    fetchMietfaecher();
  }, [apiUrl, token]);

  // Sync individual product
  const handleSync = async (productId: string) => {
    try {
      await axios.post(
        `${apiUrl}/vendor-auth/flourio/products/${productId}/sync`,
        {},
        { headers: getHeaders() }
      );

      setSuccessMessage('Produkt erfolgreich synchronisiert');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh product list to get updated sync status
      await fetchProducts();
    } catch (err: any) {
      console.error('Error syncing product:', err);
      setError(err.response?.data?.message || 'Fehler beim Synchronisieren');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Bulk sync all products
  const handleBulkSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const productIds = products.map(p => p._id);

      await axios.post(
        `${apiUrl}/vendor-auth/flourio/products/sync-bulk`,
        { productIds },
        { headers: getHeaders() }
      );

      setSuccessMessage('Alle Produkte werden synchronisiert');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh product list
      await fetchProducts();
    } catch (err: any) {
      console.error('Error bulk syncing:', err);
      setError(err.response?.data?.message || 'Fehler beim Synchronisieren');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  // Book stock for a product onto a Mietfach
  const handleBookStock = async (productId: string, mietfachId: string, amount: number) => {
    try {
      await axios.post(
        `${apiUrl}/vendor-auth/products/${productId}/stock`,
        { mietfachId, amount },
        { headers: getHeaders() }
      );
      setSuccessMessage(`${amount} Stk. erfolgreich gebucht`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Buchen des Bestands');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Edit product
  const handleEdit = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setEditingProduct(product);
      setShowCreateModal(true);
    }
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !selectedCategory ||
        product.tags?.some(tag => tag.category === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach(product => {
      product.tags?.forEach(tag => {
        if (tag.category) catSet.add(tag.category);
      });
    });
    return Array.from(catSet).sort();
  }, [products]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = products.length;
    const synced = products.filter(p =>
      p.flourioSync?.status === 'synced'
    ).length;
    return { total, synced };
  }, [products]);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  const hasActiveFilters = searchTerm || selectedCategory;

  return (
    <VendorLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ShoppingCart className="w-8 h-8 text-emerald-600 mr-3" />
              <h1 className="text-3xl font-bold text-secondary">Meine Produkte</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBulkSync}
                disabled={syncing || products.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisiere...' : 'Alle synchronisieren'}
              </button>
              <button
                onClick={() => { setEditingProduct(null); setShowCreateModal(true); }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Produkt
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesamt Produkte</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Synchronisiert</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.synced}</p>
                </div>
                <RefreshCw className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Produkte durchsuchen..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Filter zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Produkte werden geladen...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'Keine Produkte gefunden' : 'Noch keine Produkte'}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters
                ? 'Versuche es mit anderen Suchbegriffen oder Filtern'
                : 'Erstelle Dein erstes Produkt, um loszulegen'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onSync={handleSync}
                onEdit={handleEdit}
                onBookStock={handleBookStock}
                vendorMietfaecher={vendorMietfaecher}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Creation Modal */}
      <ProductCreationModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingProduct(null); }}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingProduct(null);
          setSuccessMessage(editingProduct ? 'Produkt aktualisiert!' : 'Produkt erstellt!');
          setTimeout(() => setSuccessMessage(null), 3000);
          fetchProducts();
        }}
        isVendor={true}
        availableTags={categories.map(c => ({ _id: c, name: c }))}
        vendorMietfaecher={vendorMietfaecher}
        editProduct={editingProduct || undefined}
      />
    </VendorLayout>
  );
};

export default VendorProductsPage;
