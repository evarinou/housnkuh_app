/**
 * @file ProductCreationModal.test.tsx
 * @purpose Unit tests for ProductCreationModal component
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ProductCreationModal, { Product } from './ProductCreationModal';
import { tokenStorage, apiUtils } from '../../utils/auth';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/auth');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockApiUtils = apiUtils as jest.Mocked<typeof apiUtils>;

describe('ProductCreationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockTags = [
    { _id: 'tag1', name: 'Bio' },
    { _id: 'tag2', name: 'Regional' }
  ];

  const mockVendors = [
    { _id: 'vendor1', businessName: 'Biohof Müller' },
    { _id: 'vendor2', businessName: 'Obsthof Schmidt' }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    availableTags: mockTags,
    availableVendors: mockVendors
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiUtils.getApiUrl.mockReturnValue('http://localhost:3000/api');
    mockTokenStorage.getToken.mockReturnValue('mock-token');
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<ProductCreationModal {...defaultProps} />);

      expect(screen.getByText('Neues Produkt erstellen')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ProductCreationModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Neues Produkt erstellen')).not.toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<ProductCreationModal {...defaultProps} />);

      expect(screen.getByLabelText(/Produktname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preis/i)).toBeInTheDocument();
    });

    it('renders auto-sync info notice (kein Checkbox — Sync läuft über Post-Save-Hook)', () => {
      render(<ProductCreationModal {...defaultProps} />);

      expect(
        screen.getByText('Das Produkt wird automatisch zu FlourIO synchronisiert.')
      ).toBeInTheDocument();
      // Es gibt bewusst keine Auto-Sync-Checkbox mehr
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<ProductCreationModal {...defaultProps} />);

      expect(screen.getByText('Produkt erstellen')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    // Hinweis: Tests für Auto-Sync-Checkbox (Default checked/unchecked, Toggle)
    // wurden entfernt — die Checkbox existiert nicht; der FlourIO-Sync läuft
    // immer automatisch über den Post-Save-Hook am Product-Model.
  });

  describe('Interactions', () => {
    it('closes modal when close button is clicked', () => {
      render(<ProductCreationModal {...defaultProps} />);

      const closeButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'))!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when cancel button is clicked', () => {
      render(<ProductCreationModal {...defaultProps} />);

      const cancelButton = screen.getByText('Abbrechen');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when backdrop is clicked', () => {
      render(<ProductCreationModal {...defaultProps} />);

      const backdrop = document.querySelector('.bg-black');
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });

  });

  describe('Form Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      render(<ProductCreationModal {...defaultProps} />);

      const submitButton = screen.getByText('Produkt erstellen');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Produktname ist erforderlich/i)).toBeInTheDocument();
      });
    });

    it('validates minimum length for name', async () => {
      render(<ProductCreationModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Produktname/i);
      fireEvent.change(nameInput, { target: { value: 'AB' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/Mindestens 3 Zeichen/i)).toBeInTheDocument();
      });
    });

    it('rejects non-numeric price input', async () => {
      render(<ProductCreationModal {...defaultProps} />);

      // Preis ist ein <input type="number"> — nicht-numerische Eingaben
      // werden vom Browser verworfen (Wert bleibt leer), daher greift
      // die Pflichtfeld-Validierung statt des Yup-typeError.
      const priceInput = screen.getByLabelText(/Preis/i);
      fireEvent.change(priceInput, { target: { value: 'abc' } });
      fireEvent.blur(priceInput);

      await waitFor(() => {
        expect(screen.getByText(/Preis ist erforderlich/i)).toBeInTheDocument();
      });
    });

    it('validates price is not negative', async () => {
      render(<ProductCreationModal {...defaultProps} />);

      const priceInput = screen.getByLabelText(/Preis/i);
      fireEvent.change(priceInput, { target: { value: '-10' } });
      fireEvent.blur(priceInput);

      await waitFor(() => {
        expect(screen.getByText(/Preis muss positiv sein/i)).toBeInTheDocument();
      });
    });
  });

  const validFormData = {
    name: 'Bio-Äpfel',
    description: 'Frische Bio-Äpfel aus der Region',
    price: '3.50',
    priceUnit: 'kg',
    tags: ['tag1'],
    images: [],
    availability: 'available',
    minimumQuantity: '1',
    taxRate: '7',
    vendorId: 'vendor1'
  };

  const mockProductResponse = {
    data: {
      success: true,
      data: {
        _id: 'product123',
        ...validFormData,
        price: 3.50,
        minimumQuantity: 1,
        taxRate: 7
      }
    }
  };

  describe('Form Submission', () => {

    it('submits form with valid data', async () => {
      mockAxios.post.mockResolvedValueOnce(mockProductResponse);

      render(<ProductCreationModal {...defaultProps} />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      // Submit
      const submitButton = screen.getByText('Produkt erstellen');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/admin/products',
          expect.objectContaining({
            name: validFormData.name,
            description: validFormData.description,
            price: 3.50,
            priceUnit: validFormData.priceUnit
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token'
            })
          })
        );
      });
    });

    it('calls onSuccess with created product', async () => {
      mockAxios.post.mockResolvedValueOnce(mockProductResponse);

      render(<ProductCreationModal {...defaultProps} />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockProductResponse.data.data);
      });
    });

    it('does not trigger a separate sync call (Sync läuft über Post-Save-Hook)', async () => {
      mockAxios.post.mockResolvedValueOnce(mockProductResponse);

      render(<ProductCreationModal {...defaultProps} />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Nur der Create-Call — kein zweiter Sync-Request vom Client,
      // der FlourIO-Sync passiert serverseitig im Post-Save-Hook
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/products',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('displays error message on API failure', async () => {
      const errorMessage = 'Produkt konnte nicht erstellt werden';
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: errorMessage
          }
        }
      });

      render(<ProductCreationModal {...defaultProps} />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      mockAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ProductCreationModal {...defaultProps} />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      expect(screen.getByText('Wird erstellt...')).toBeInTheDocument();
    });

    it('disables buttons during submission', async () => {
      mockAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ProductCreationModal {...defaultProps} />);

      // Fill form
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: validFormData.name } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: validFormData.description } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: validFormData.price } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: validFormData.priceUnit } });
      fireEvent.change(screen.getByLabelText(/Vendor auswählen/i), { target: { value: validFormData.vendorId } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      const submitButton = screen.getByText('Wird erstellt...');
      const cancelButton = screen.getByText('Abbrechen');

      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Vendor Mode', () => {
    it('uses vendor token when isVendor is true', async () => {
      mockAxios.post.mockResolvedValueOnce(mockProductResponse);
      mockTokenStorage.getToken.mockReturnValueOnce('vendor-token');

      render(<ProductCreationModal {...defaultProps} isVendor={true} vendorId="vendor1" />);

      // Form submission...
      fireEvent.change(screen.getByLabelText(/Produktname/i), { target: { value: 'Test' } });
      fireEvent.change(screen.getByLabelText(/Beschreibung/i), { target: { value: 'Test description' } });
      fireEvent.change(screen.getByLabelText(/Preis/i), { target: { value: '1.00' } });
      fireEvent.change(screen.getByLabelText(/Einheit/i), { target: { value: 'kg' } });

      fireEvent.click(screen.getByText('Produkt erstellen'));

      await waitFor(() => {
        expect(mockTokenStorage.getToken).toHaveBeenCalledWith('VENDOR');
      });
    });

    it('pre-fills vendorId for vendors', () => {
      render(
        <ProductCreationModal {...defaultProps} isVendor={true} vendorId="vendor1" />
      );

      // Vendor selection should not be visible for vendors
      expect(screen.queryByLabelText(/Vendor auswählen/i)).not.toBeInTheDocument();
    });
  });
});
