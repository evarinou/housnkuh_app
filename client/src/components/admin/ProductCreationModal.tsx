/**
 * @file ProductCreationModal.tsx
 * @purpose Modal for creating new products with form validation
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ProductFormFields, { ProductFormValues, Tag, Vendor } from './ProductFormFields';
import { tokenStorage, apiUtils } from '../../utils/auth';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  priceUnit: string;
  tags: any[];
  images: string[];
  availability: string;
  minimumQuantity: number;
  taxRate: number;
  vendorId: string;
  /** Interne EAN-13 (auto-generiert, read-only) */
  ean?: string;
  flourioSync?: {
    articleId?: string;
    status: string;
    lastSyncedAt?: string;
  };
  flourioStock?: {
    totalAmount: number;
    entries?: Array<{ warehouseId?: string; warehouseName?: string; amount: number }>;
  };
}

export interface VendorMietfach {
  _id: string;
  bezeichnung: string;
  typ: string;
  groesse?: { flaeche: number; einheit: string };
}

export interface ProductCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  isVendor?: boolean;
  vendorId?: string;
  availableTags: Tag[];
  availableVendors?: Vendor[];
  vendorMietfaecher?: VendorMietfach[];
  /** Edit mode: pass existing product to pre-populate form */
  editProduct?: Product;
  /** Callback to create a new tag inline */
  onCreateTag?: (name: string) => Promise<any>;
}

// Validation Schema
const getValidationSchema = (isVendor: boolean) => {
  return Yup.object().shape({
    name: Yup.string()
      .required('Produktname ist erforderlich')
      .min(3, 'Mindestens 3 Zeichen')
      .max(100, 'Maximal 100 Zeichen'),
    description: Yup.string()
      .required('Beschreibung ist erforderlich')
      .min(10, 'Mindestens 10 Zeichen'),
    price: Yup.number()
      .required('Preis ist erforderlich')
      .min(0, 'Preis muss positiv sein')
      .typeError('Muss eine Zahl sein'),
    priceUnit: Yup.string()
      .required('Einheit ist erforderlich'),
    tags: Yup.array()
      .of(Yup.string()),
    images: Yup.array()
      .of(Yup.string())
      .max(isVendor ? 5 : 10, `Maximal ${isVendor ? 5 : 10} Bilder erlaubt`),
    availability: Yup.string()
      .oneOf(['available', 'seasonal', 'out_of_stock', 'preorder']),
    minimumQuantity: Yup.number()
      .min(0, 'Muss positiv sein')
      .typeError('Muss eine Zahl sein'),
    taxRate: Yup.number()
      .oneOf([7, 19], 'Ungültiger MwSt.-Satz'),
    vendorId: isVendor ? Yup.string() : Yup.string().required('Vendor auswählen ist erforderlich')
  });
};

const ProductCreationModal: React.FC<ProductCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isVendor = false,
  vendorId,
  availableTags,
  availableVendors = [],
  vendorMietfaecher = [],
  editProduct,
  onCreateTag
}) => {
  const isEdit = !!editProduct;
  const [apiError, setApiError] = useState<string | null>(null);
  const [initialMietfachId, setInitialMietfachId] = useState('');
  const [initialAmount, setInitialAmount] = useState('');

  const initialValues: ProductFormValues = editProduct ? {
    name: editProduct.name,
    description: editProduct.description,
    price: editProduct.price,
    priceUnit: editProduct.priceUnit,
    tags: editProduct.tags?.map((t: any) => t._id || t) || [],
    images: editProduct.images || [],
    availability: (editProduct.availability as any) || 'available',
    minimumQuantity: editProduct.minimumQuantity || '',
    taxRate: editProduct.taxRate || '7',
    vendorId: typeof editProduct.vendorId === 'object' ? (editProduct.vendorId as any)?._id : editProduct.vendorId
  } : {
    name: '',
    description: '',
    price: '',
    priceUnit: '',
    tags: [],
    images: [],
    availability: 'available',
    minimumQuantity: '',
    taxRate: '7',
    vendorId: isVendor ? vendorId : ''
  };

  // Produktbild zum Server hochladen — Produkt speichert nur die URL
  const handleUploadImage = async (file: File): Promise<string> => {
    const apiUrl = apiUtils.getApiUrl();
    const token = tokenStorage.getToken(isVendor ? 'VENDOR' : 'ADMIN');
    const baseUrl = isVendor ? `${apiUrl}/vendor-auth` : `${apiUrl}/admin`;

    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${baseUrl}/products/upload-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token || ''
      }
    });

    if (!response.data?.success || !response.data?.imageUrl) {
      throw new Error(response.data?.message || 'Upload fehlgeschlagen');
    }
    return response.data.imageUrl;
  };

  const handleSubmit = async (values: ProductFormValues, { setSubmitting }: any) => {
    setApiError(null);

    try {
      const apiUrl = apiUtils.getApiUrl();
      const token = tokenStorage.getToken(isVendor ? 'VENDOR' : 'ADMIN');

      // Prepare payload
      const payload: any = {
        name: values.name,
        description: values.description,
        price: Number(values.price),
        priceUnit: values.priceUnit,
        tags: values.tags,
        images: values.images,
        availability: values.availability,
        taxRate: Number(values.taxRate),
        vendorId: values.vendorId
      };

      // Mindestmenge nur mitsenden, wenn gesetzt (Server/Schema verlangen >= 1)
      const minQty = Number(values.minimumQuantity);
      if (Number.isFinite(minQty) && minQty >= 1) {
        payload.minimumQuantity = Math.floor(minQty);
      }

      // Add optional initial stock (only for new products with Mietfächer)
      if (!isEdit && isVendor && initialMietfachId && initialAmount) {
        payload.initialStock = {
          mietfachId: initialMietfachId,
          amount: Number(initialAmount)
        };
      }

      const baseUrl = isVendor ? `${apiUrl}/vendor-auth` : `${apiUrl}/admin`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token || '',
        'Content-Type': 'application/json'
      };

      const response = isEdit
        ? await axios.put(`${baseUrl}/products/${editProduct!._id}`, payload, { headers })
        : await axios.post(`${baseUrl}/products`, payload, { headers });

      if (response.data.success) {
        const createdProduct = response.data.data;

        // Auto-sync is handled by post-save hook on Product model
        // No need for separate sync call

        onSuccess(createdProduct);
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Fehler beim Erstellen des Produkts';
      setApiError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <Formik
                initialValues={initialValues}
                enableReinitialize
                validationSchema={getValidationSchema(isVendor)}
                onSubmit={handleSubmit}
              >
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue, setFieldTouched, isSubmitting, isValid }) => (
                  <Form className="space-y-6">
                    {/* API Error */}
                    {apiError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Fehler</h3>
                            <p className="mt-1 text-sm text-red-700">{apiError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Form Fields */}
                    <ProductFormFields
                      isVendor={isVendor}
                      selectedVendor={values.vendorId}
                      availableTags={availableTags}
                      availableVendors={availableVendors}
                      flourioStock={isEdit ? editProduct?.flourioStock : undefined}
                      ean={isEdit ? editProduct?.ean : undefined}
                      onUploadImage={handleUploadImage}
                      onCreateTag={onCreateTag}
                      values={values}
                      errors={errors}
                      touched={touched}
                      handleChange={handleChange}
                      handleBlur={handleBlur}
                      setFieldValue={setFieldValue}
                      setFieldTouched={setFieldTouched}
                    />

                    {/* FlourIO Sync Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-800">
                        Das Produkt wird automatisch zu FlourIO synchronisiert.
                      </p>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        onClick={() => {
                          if (!isValid && Object.keys(errors).length > 0) {
                            setApiError('Bitte alle Pflichtfelder ausfüllen: ' + Object.keys(errors).join(', '));
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {isEdit ? 'Wird gespeichert...' : 'Wird erstellt...'}
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {isEdit ? 'Änderungen speichern' : 'Produkt erstellen'}
                          </>
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default ProductCreationModal;
