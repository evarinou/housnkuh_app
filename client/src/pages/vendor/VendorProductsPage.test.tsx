/**
 * @file VendorProductsPage.test.tsx
 * @purpose Unit tests for VendorProductsPage component
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import VendorProductsPage from './VendorProductsPage';
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

// Mock VendorLayout
jest.mock('../../components/vendor/VendorLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="vendor-layout">{children}</div>
}));

// Mock ProductCard
jest.mock('../../components/vendor/ProductCard', () => ({
  __esModule: true,
  default: ({ product, onSync }: any) => (
    <div data-testid={`product-card-${product._id}`}>
      <h3>{product.name}</h3>
      <p>{product.price}€/{product.priceUnit}</p>
      <button onClick={() => onSync(product._id)}>Sync</button>
    </div>
  )
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockApiUtils = apiUtils as jest.Mocked<typeof apiUtils>;

describe('VendorProductsPage', () => {
  const mockProducts = [
    {
      _id: 'product1',
      name: 'Bio-Äpfel',
      description: 'Frische Bio-Äpfel',
      price: 3.50,
      priceUnit: 'kg',
      tags: [
        { _id: 'tag1', name: 'Bio', category: 'Qualität' },
        { _id: 'tag2', name: 'Regional', category: 'Herkunft' }
      ],
      images: ['image1.jpg'],
      availability: 'available',
      minimumQuantity: 1,
      taxRate: 7,
      vendorId: 'vendor1',
      flourioSync: { status: 'synced', lastSyncedAt: '2025-11-17T10:00:00Z' }
    },
    {
      _id: 'product2',
      name: 'Bio-Tomaten',
      description: 'Frische Bio-Tomaten',
      price: 4.20,
      priceUnit: 'kg',
      tags: [
        { _id: 'tag3', name: 'Bio', category: 'Qualität' },
        { _id: 'tag4', name: 'Gemüse', category: 'Kategorie' }
      ],
      images: [],
      availability: 'available',
      minimumQuantity: 1,
      taxRate: 7,
      vendorId: 'vendor1',
      flourioSync: { status: 'pending' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiUtils.getApiUrl.mockReturnValue('http://localhost:3000/api');
    mockTokenStorage.getToken.mockReturnValue('vendor-token');
  });

  describe('Loading and Data Fetching', () => {
    it('displays loading state initially', () => {
      mockAxios.get.mockImplementation(() => new Promise(() => {}));

      render(<VendorProductsPage />);

      expect(screen.getByText('Produkte werden geladen...')).toBeInTheDocument();
    });

    it('fetches products on mount', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(
          'http://localhost:3000/api/vendor-auth/flourio/products',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer vendor-token'
            })
          })
        );
      });
    });

    it('displays products after successful fetch', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
        expect(screen.getByText('Bio-Tomaten')).toBeInTheDocument();
      });
    });

    it('displays error message on fetch failure', async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: { data: { message: 'Fehler beim Laden' } }
      });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Display', () => {
    it('calculates and displays total products count', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('calculates and displays synced products count', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Only product1 is synced
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters products by search term', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Tomaten' } });

      expect(screen.queryByText('Bio-Äpfel')).not.toBeInTheDocument();
      expect(screen.getByText('Bio-Tomaten')).toBeInTheDocument();
    });

    it('searches in product description', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Frische' } });

      // Both products have "Frische" in description
      expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      expect(screen.getByText('Bio-Tomaten')).toBeInTheDocument();
    });

    it('shows "no products found" when search has no results', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Bananen' } });

      expect(screen.getByText('Keine Produkte gefunden')).toBeInTheDocument();
    });
  });

  describe('Category Filter', () => {
    it('displays available categories in dropdown', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('Alle Kategorien');
      expect(categorySelect).toBeInTheDocument();

      // Check options are rendered
      expect(screen.getByText('Qualität')).toBeInTheDocument();
      expect(screen.getByText('Herkunft')).toBeInTheDocument();
      expect(screen.getByText('Kategorie')).toBeInTheDocument();
    });

    it('filters products by selected category', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('Alle Kategorien');
      fireEvent.change(categorySelect, { target: { value: 'Kategorie' } });

      // Only product2 has "Kategorie" category
      expect(screen.queryByText('Bio-Äpfel')).not.toBeInTheDocument();
      expect(screen.getByText('Bio-Tomaten')).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('shows clear filters button when filters are active', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getAllByText('Filter zurücksetzen')[0]).toBeInTheDocument();
    });

    it('clears all filters when clear button clicked', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'Tomaten' } });

      const clearButton = screen.getAllByText('Filter zurücksetzen')[0];
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      expect(screen.getByText('Bio-Tomaten')).toBeInTheDocument();
    });
  });

  describe('Individual Product Sync', () => {
    it('calls sync API for individual product', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts }); // Refetch after sync

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const syncButtons = screen.getAllByText('Sync');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/vendor-auth/flourio/products/product1/sync',
          {},
          expect.any(Object)
        );
      });
    });

    it('shows success message after sync', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const syncButtons = screen.getAllByText('Sync');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Produkt erfolgreich synchronisiert')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Sync', () => {
    it('syncs all products when bulk sync clicked', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const bulkSyncButton = screen.getByText('Alle synchronisieren');
      fireEvent.click(bulkSyncButton);

      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          'http://localhost:3000/api/vendor-auth/flourio/products/sync-bulk',
          { productIds: ['product1', 'product2'] },
          expect.any(Object)
        );
      });
    });

    it('disables bulk sync when no products', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: [] });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Noch keine Produkte')).toBeInTheDocument();
      });

      const bulkSyncButton = screen.getByText('Alle synchronisieren');
      expect(bulkSyncButton).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no products', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: [] });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Noch keine Produkte')).toBeInTheDocument();
      });
    });

    it('shows different message when filters active but no results', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Produkte durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });

      expect(screen.getByText('Keine Produkte gefunden')).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('renders page header with title', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Meine Produkte')).toBeInTheDocument();
      });
    });

    it('renders "Neues Produkt" button as enabled (Vendor-Produktanlage ist freigeschaltet)', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: mockProducts });

      render(<VendorProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      });

      const newProductButton = screen.getByText('Neues Produkt');
      expect(newProductButton).toBeEnabled();
    });
  });
});
