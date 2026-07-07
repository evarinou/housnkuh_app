/**
 * @file AssignCategoryModal.tsx
 * @purpose Modal for assigning FlourIO category tags to products
 * @created 2025-11-13
 */

import React, { useState } from 'react';
import { X, Tag, AlertCircle } from 'lucide-react';

interface FlourioTag {
  _id: string;
  name: string;
  flourioId?: string;
  category?: string;
}

interface AssignCategoryModalProps {
  selectedProducts: Array<{ _id: string; name: string }>;
  categories: FlourioTag[];
  onClose: () => void;
  onSuccess: () => void;
  apiUrl: string;
  token: string;
}

export const AssignCategoryModal: React.FC<AssignCategoryModalProps> = ({
  selectedProducts,
  categories,
  onClose,
  onSuccess,
  apiUrl,
  token
}) => {
  const [categoryTagId, setCategoryTagId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flourioCategories = categories.filter(tag => tag.flourioId);

  const handleAssign = async () => {
    if (!categoryTagId) {
      setError('Bitte wählen Sie eine Kategorie aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/admin/products/assign-category`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'x-auth-token': token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: selectedProducts.map(p => p._id),
          categoryTagId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Fehler beim Zuweisen der Kategorie');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error assigning category:', err);
      setError(err.message || 'Fehler beim Zuweisen der Kategorie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              FlourIO Kategorie zuweisen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Selected Products Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>{selectedProducts.length}</strong> Produkt{selectedProducts.length !== 1 ? 'e' : ''} ausgewählt
            </p>
            {selectedProducts.length <= 3 && (
              <ul className="mt-2 text-xs text-blue-700 list-disc list-inside">
                {selectedProducts.map(product => (
                  <li key={product._id}>{product.name}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              FlourIO Kategorie
            </label>
            <select
              id="category"
              value={categoryTagId}
              onChange={(e) => setCategoryTagId(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Kategorie auswählen...</option>
              {flourioCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name} {cat.category ? `(${cat.category})` : ''}
                </option>
              ))}
            </select>
            {flourioCategories.length === 0 && (
              <p className="mt-2 text-sm text-yellow-600">
                Keine FlourIO-Kategorien gefunden. Bitte synchronisieren Sie erst die Kategorien.
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abbrechen
          </button>
          <button
            onClick={handleAssign}
            disabled={!categoryTagId || loading || flourioCategories.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird zugewiesen...' : 'Kategorie zuweisen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignCategoryModal;
