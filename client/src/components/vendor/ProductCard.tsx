/**
 * @file ProductCard.tsx
 * @purpose Card component for displaying individual products in vendor product list
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, RefreshCw, Package } from 'lucide-react';
import SyncStatusBadge, { SyncStatus } from '../ui/SyncStatusBadge';
import StockLevelBadge from '../ui/StockLevelBadge';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  priceUnit: string;
  tags: Array<{ _id: string; name: string; category?: string }>;
  images: string[];
  availability: string;
  minimumQuantity: number;
  taxRate: number;
  vendorId: string;
  flourioSync?: {
    articleId?: string;
    status: string;
    lastSyncedAt?: string;
    error?: string;
  };
  flourioStock?: {
    totalAmount: number;
    entries: Array<{ warehouseId: string; warehouseName?: string; amount: number }>;
    lastPulledAt?: string;
  };
}

export interface ProductCardProps {
  product: Product;
  onSync: (productId: string) => Promise<void>;
  onEdit?: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSync, onEdit }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(product._id);
    } finally {
      setSyncing(false);
    }
  };

  const unitLabels: Record<string, string> = {
    kg: 'kg', g: 'g', piece: 'Stk.', liter: 'l', ml: 'ml', bunch: 'Bund', pack: 'Pkg.', box: 'Kiste'
  };

  const formatPrice = (price: number, unit: string) => {
    return `${price.toFixed(2)}€/${unitLabels[unit] || unit}`;
  };

  const getSyncStatus = (): SyncStatus => {
    if (!product.flourioSync) return 'never';
    if (product.flourioSync.status === 'synced') return 'synced';
    if (product.flourioSync.status === 'pending') return 'pending';
    if (product.flourioSync.status === 'error') return 'error';
    return 'never';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const productImage = product.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:border-emerald-300 transition-colors"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        {productImage ? (
          <img
            src={productImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2" title={product.name}>
          {truncateText(product.name, 40)}
        </h3>

        {/* Price */}
        <div className="text-2xl font-bold text-emerald-600 mb-3">
          {formatPrice(product.price, product.priceUnit)}
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag._id}
                className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
              >
                {tag.name}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                +{product.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stock Level + Sync Status */}
        <div className="flex flex-wrap gap-2 mb-3">
          <StockLevelBadge
            totalAmount={product.flourioStock?.totalAmount}
            lastPulledAt={product.flourioStock?.lastPulledAt}
          />
          <SyncStatusBadge
            status={getSyncStatus()}
            lastSyncedAt={product.flourioSync?.lastSyncedAt}
            errorMessage={product.flourioSync?.error}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Produkt synchronisieren"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(product._id)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              aria-label="Produkt bearbeiten"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
