/**
 * @file ProductFormFields.tsx
 * @purpose Reusable product form fields with conditional rendering for Admin/Vendor
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React, { useState } from 'react';
import { FormikErrors, FormikTouched } from 'formik';
import { AlertCircle } from 'lucide-react';
import TagBadge from '../ui/TagBadge';
import CreateTagInline from '../ui/CreateTagInline';
import ImageUploadField from '../ui/ImageUploadField';

export interface ProductFormValues {
  name: string;
  description: string;
  price: number | string;
  priceUnit: string;
  tags: string[];
  images: string[];
  availability: 'available' | 'seasonal' | 'out_of_stock' | 'preorder';
  minimumQuantity: number | string;
  taxRate: number | string;
  vendorId?: string;
}

export interface Tag {
  _id: string;
  name: string;
  slug?: string;
  category?: string;
  color?: string;
  flourioId?: string;
  isActive?: boolean;
}

export interface Vendor {
  _id: string;
  businessName: string;
}

export interface ProductFormFieldsProps {
  isVendor: boolean;
  selectedVendor?: string;
  onVendorChange?: (vendorId: string) => void;
  availableTags: Tag[];
  availableVendors?: Vendor[];
  /** Current stock info from Flourio (read-only, shown in edit mode) */
  flourioStock?: { totalAmount: number; entries?: Array<{ warehouseName?: string; amount: number }> };
  /** Interne EAN-13 (read-only, shown in edit mode) */
  ean?: string;
  /** Lädt ein Produktbild hoch und liefert die URL zurück */
  onUploadImage?: (file: File) => Promise<string>;
  /** Callback to create a new tag (vendor can add tags inline) */
  onCreateTag?: (name: string, icon?: string, color?: string) => Promise<Tag | null>;
  values: ProductFormValues;
  errors: FormikErrors<ProductFormValues>;
  touched: FormikTouched<ProductFormValues>;
  handleChange: (e: React.ChangeEvent<any>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
}

const PRICE_UNITS = [
  { value: 'kg', label: 'Kilogramm (kg)' },
  { value: 'g', label: 'Gramm (g)' },
  { value: 'liter', label: 'Liter (l)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'piece', label: 'Stück' },
  { value: 'bunch', label: 'Bund' },
  { value: 'pack', label: 'Packung' },
  { value: 'box', label: 'Kiste' }
];

const ProductFormFields: React.FC<ProductFormFieldsProps> = ({
  isVendor,
  selectedVendor,
  onVendorChange,
  availableTags,
  availableVendors = [],
  flourioStock,
  ean,
  onUploadImage,
  onCreateTag,
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  setFieldTouched
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  const getFieldError = (fieldName: keyof ProductFormValues) => {
    return touched[fieldName] && errors[fieldName] ? String(errors[fieldName]) : undefined;
  };

  const handleCreateNewTag = async () => {
    if (!onCreateTag || !newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await onCreateTag(newTagName.trim());
      if (tag) {
        // Auto-select the new tag
        const currentTags = values.tags || [];
        setFieldValue('tags', [...currentTags, tag._id]);
        setNewTagName('');
      }
    } finally {
      setCreatingTag(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    const currentTags = values.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    setFieldValue('tags', newTags);
  };

  return (
    <div className="space-y-6">
      {/* Vendor Selection (Admin only) */}
      {!isVendor && (
        <div>
          <label htmlFor="vendorId" className="block text-sm font-medium text-gray-700 mb-1">
            Vendor auswählen <span className="text-red-500">*</span>
          </label>
          <select
            id="vendorId"
            name="vendorId"
            value={values.vendorId || ''}
            onChange={(e) => {
              handleChange(e);
              onVendorChange?.(e.target.value);
            }}
            onBlur={handleBlur}
            className={`
              w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500
              ${getFieldError('vendorId') ? 'border-red-300' : ''}
            `}
          >
            <option value="">-- Vendor auswählen --</option>
            {availableVendors.map(vendor => (
              <option key={vendor._id} value={vendor._id}>
                {vendor.businessName}
              </option>
            ))}
          </select>
          {getFieldError('vendorId') && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {getFieldError('vendorId')}
            </p>
          )}
        </div>
      )}

      {/* Product Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Produktname <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`
            w-full rounded-md border-gray-300 shadow-sm
            focus:border-blue-500 focus:ring-blue-500
            ${getFieldError('name') ? 'border-red-300' : ''}
          `}
          placeholder="z.B. Bio-Äpfel Elstar"
        />
        {getFieldError('name') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {getFieldError('name')}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Beschreibung <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={4}
          className={`
            w-full rounded-md border-gray-300 shadow-sm
            focus:border-blue-500 focus:ring-blue-500
            ${getFieldError('description') ? 'border-red-300' : ''}
          `}
          placeholder="Detaillierte Produktbeschreibung..."
        />
        {getFieldError('description') && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {getFieldError('description')}
          </p>
        )}
      </div>

      {/* Price and Unit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Preis (EUR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={values.price}
            onChange={handleChange}
            onBlur={handleBlur}
            step="0.01"
            min="0"
            className={`
              w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500
              ${getFieldError('price') ? 'border-red-300' : ''}
            `}
            placeholder="0.00"
          />
          {getFieldError('price') && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {getFieldError('price')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="priceUnit" className="block text-sm font-medium text-gray-700 mb-1">
            Einheit <span className="text-red-500">*</span>
          </label>
          <select
            id="priceUnit"
            name="priceUnit"
            value={values.priceUnit}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`
              w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500
              ${getFieldError('priceUnit') ? 'border-red-300' : ''}
            `}
          >
            <option value="">-- Einheit wählen --</option>
            {PRICE_UNITS.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
          {getFieldError('priceUnit') && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {getFieldError('priceUnit')}
            </p>
          )}
        </div>
      </div>

      {/* Tags/Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategorien/Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Tags verfügbar</p>
          ) : (
            availableTags.map(tag => {
              const isSelected = values.tags?.includes(tag._id) || false;
              return (
                <TagBadge
                  key={tag._id}
                  name={tag.name}
                  color={tag.color}
                  icon={(tag as any).icon}
                  selected={isSelected}
                  onClick={() => handleTagToggle(tag._id)}
                  size="md"
                />
              );
            })
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tags helfen Kunden, Ihre Produkte zu finden
        </p>
        {onCreateTag && (
          <CreateTagInline
            onCreateTag={async (name, icon, color) => {
              const tag = await onCreateTag(name, icon, color);
              if (tag) {
                const currentTags = values.tags || [];
                if (!currentTags.includes(tag._id)) {
                  setFieldValue('tags', [...currentTags, tag._id]);
                }
              }
            }}
          />
        )}
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Produktbilder {isVendor && <span className="text-xs text-gray-500">(max. 5)</span>}
        </label>
        <ImageUploadField
          images={values.images || []}
          onChange={(images) => setFieldValue('images', images)}
          maxImages={isVendor ? 5 : 10}
          maxSizeMB={2}
          error={getFieldError('images')}
          onUpload={onUploadImage}
        />
      </div>

      {/* EAN (read-only, auto-generiert) */}
      {ean && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EAN / Scancode
          </label>
          <input
            type="text"
            value={ean}
            readOnly
            disabled
            className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 font-mono shadow-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Automatisch vergeben — wird auf Etiketten gedruckt und an der flour.io-Kasse gescannt
          </p>
        </div>
      )}

      {/* Stock Info (read-only) + Minimum Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flourioStock != null && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aktueller Bestand
            </label>
            <div className={`px-3 py-2 rounded-md text-sm font-medium ${
              flourioStock.totalAmount > 0
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {flourioStock.totalAmount} Stk. gesamt
              {flourioStock.entries && flourioStock.entries.length > 0 && (
                <span className="text-xs ml-2 opacity-75">
                  ({flourioStock.entries.map(e =>
                    `${e.warehouseName || 'Lager'}: ${e.amount}`
                  ).join(', ')})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Bestand wird über Flourio verwaltet
            </p>
          </div>
        )}

        <div>
          <label htmlFor="minimumQuantity" className="block text-sm font-medium text-gray-700 mb-1">
            Mindestmenge
          </label>
          <input
            type="number"
            id="minimumQuantity"
            name="minimumQuantity"
            value={values.minimumQuantity}
            onChange={handleChange}
            onBlur={handleBlur}
            min="0"
            step="1"
            className={`
              w-full rounded-md border-gray-300 shadow-sm
              focus:border-blue-500 focus:ring-blue-500
              ${getFieldError('minimumQuantity') ? 'border-red-300' : ''}
            `}
            placeholder="0"
          />
          {getFieldError('minimumQuantity') && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {getFieldError('minimumQuantity')}
            </p>
          )}
        </div>
      </div>

      {/* Tax Rate */}
      <div>
        <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">
          MwSt.-Satz (%)
        </label>
        <select
          id="taxRate"
          name="taxRate"
          value={values.taxRate}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="19">19% (Standard)</option>
          <option value="7">7% (Ermäßigt)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Lebensmittel haben meist 7% MwSt., andere Produkte 19%
        </p>
      </div>
    </div>
  );
};

export default ProductFormFields;
