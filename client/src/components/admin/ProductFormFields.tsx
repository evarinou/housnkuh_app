/**
 * @file ProductFormFields.tsx
 * @purpose Reusable product form fields with conditional rendering for Admin/Vendor
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { FormikErrors, FormikTouched } from 'formik';
import { AlertCircle } from 'lucide-react';
import ImageUploadField from '../ui/ImageUploadField';

export interface ProductFormValues {
  name: string;
  description: string;
  price: number | string;
  priceUnit: string;
  tags: string[];
  images: string[];
  availability: 'available' | 'limited' | 'unavailable';
  minimumQuantity: number | string;
  taxRate: number | string;
  vendorId?: string;
}

export interface Tag {
  _id: string;
  name: string;
  category?: string;
  flourioId?: string;
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

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Verfügbar' },
  { value: 'limited', label: 'Begrenzt verfügbar' },
  { value: 'unavailable', label: 'Nicht verfügbar' }
];

const ProductFormFields: React.FC<ProductFormFieldsProps> = ({
  isVendor,
  selectedVendor,
  onVendorChange,
  availableTags,
  availableVendors = [],
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  setFieldTouched
}) => {
  const getFieldError = (fieldName: keyof ProductFormValues) => {
    return touched[fieldName] && errors[fieldName] ? String(errors[fieldName]) : undefined;
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
                <button
                  key={tag._id}
                  type="button"
                  onClick={() => handleTagToggle(tag._id)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      isSelected
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {tag.name}
                  {tag.category && (
                    <span className="ml-1 text-xs opacity-75">({tag.category})</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tags helfen Kunden, Ihre Produkte zu finden
        </p>
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
        />
      </div>

      {/* Availability and Minimum Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            Verfügbarkeit
          </label>
          <select
            id="availability"
            name="availability"
            value={values.availability}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {AVAILABILITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

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
