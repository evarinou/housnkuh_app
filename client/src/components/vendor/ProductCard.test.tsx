/**
 * @file ProductCard.test.tsx
 * @purpose Unit tests for ProductCard component
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductCard, { Product } from './ProductCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock SyncStatusBadge
jest.mock('../ui/SyncStatusBadge', () => ({
  __esModule: true,
  default: ({ status, lastSyncedAt, errorMessage }: any) => (
    <div data-testid="sync-status-badge" data-status={status}>
      {status} {lastSyncedAt && `- ${lastSyncedAt}`} {errorMessage && `- ${errorMessage}`}
    </div>
  )
}));

describe('ProductCard', () => {
  const mockOnSync = jest.fn().mockResolvedValue(undefined);
  const mockOnEdit = jest.fn();

  const mockProduct: Product = {
    _id: 'product1',
    name: 'Bio-Äpfel',
    description: 'Frische Bio-Äpfel aus der Region',
    price: 3.50,
    priceUnit: 'kg',
    tags: [
      { _id: 'tag1', name: 'Bio', category: 'Qualität' },
      { _id: 'tag2', name: 'Regional', category: 'Herkunft' }
    ],
    images: ['https://example.com/apple.jpg'],
    availability: 'available',
    minimumQuantity: 1,
    taxRate: 7,
    vendorId: 'vendor1',
    flourioSync: {
      articleId: 'art123',
      status: 'synced',
      lastSyncedAt: '2025-11-17T10:00:00Z'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders product information correctly', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      expect(screen.getByText('Bio-Äpfel')).toBeInTheDocument();
      expect(screen.getByText('3.50€/kg')).toBeInTheDocument();
    });

    it('displays product image when available', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const image = screen.getByAltText('Bio-Äpfel');
      expect(image).toHaveAttribute('src', 'https://example.com/apple.jpg');
    });

    it('displays fallback icon when no image', () => {
      const productWithoutImage = { ...mockProduct, images: [] };
      render(<ProductCard product={productWithoutImage} onSync={mockOnSync} />);

      // Package icon should be displayed
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays tags as badges', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      expect(screen.getByText('Bio')).toBeInTheDocument();
      expect(screen.getByText('Regional')).toBeInTheDocument();
    });

    it('shows +N badge when more than 3 tags', () => {
      const productWithManyTags = {
        ...mockProduct,
        tags: [
          { _id: 'tag1', name: 'Bio' },
          { _id: 'tag2', name: 'Regional' },
          { _id: 'tag3', name: 'Obst' },
          { _id: 'tag4', name: 'Frisch' },
          { _id: 'tag5', name: 'Saisonal' }
        ]
      };

      render(<ProductCard product={productWithManyTags} onSync={mockOnSync} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('renders sync status badge', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const badge = screen.getByTestId('sync-status-badge');
      expect(badge).toHaveAttribute('data-status', 'synced');
    });

    it('displays edit button when onEdit provided', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} onEdit={mockOnEdit} />);

      const editButton = screen.getByLabelText('Produkt bearbeiten');
      expect(editButton).toBeInTheDocument();
    });

    it('hides edit button when onEdit not provided', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const editButton = screen.queryByLabelText('Produkt bearbeiten');
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Price Formatting', () => {
    it('formats price correctly with 2 decimals', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      expect(screen.getByText('3.50€/kg')).toBeInTheDocument();
    });

    it('handles different price units', () => {
      const productWithDifferentUnit = { ...mockProduct, price: 2.00, priceUnit: 'Stück' };
      render(<ProductCard product={productWithDifferentUnit} onSync={mockOnSync} />);

      expect(screen.getByText('2.00€/Stück')).toBeInTheDocument();
    });
  });

  describe('Sync Status', () => {
    it('shows "synced" status when flourioSync.status is synced', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const badge = screen.getByTestId('sync-status-badge');
      expect(badge).toHaveAttribute('data-status', 'synced');
    });

    it('shows "pending" status when flourioSync.status is pending', () => {
      const pendingProduct = {
        ...mockProduct,
        flourioSync: { status: 'pending' }
      };

      render(<ProductCard product={pendingProduct} onSync={mockOnSync} />);

      const badge = screen.getByTestId('sync-status-badge');
      expect(badge).toHaveAttribute('data-status', 'pending');
    });

    it('shows "error" status when flourioSync.status is error', () => {
      const errorProduct = {
        ...mockProduct,
        flourioSync: { status: 'error', error: 'Sync failed' }
      };

      render(<ProductCard product={errorProduct} onSync={mockOnSync} />);

      const badge = screen.getByTestId('sync-status-badge');
      expect(badge).toHaveAttribute('data-status', 'error');
    });

    it('shows "never" status when no flourioSync', () => {
      const neverSyncedProduct = { ...mockProduct, flourioSync: undefined };

      render(<ProductCard product={neverSyncedProduct} onSync={mockOnSync} />);

      const badge = screen.getByTestId('sync-status-badge');
      expect(badge).toHaveAttribute('data-status', 'never');
    });
  });

  describe('Interactions', () => {
    it('calls onSync when sync button clicked', async () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const syncButton = screen.getByLabelText('Produkt synchronisieren');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockOnSync).toHaveBeenCalledWith('product1');
      });
    });

    it('calls onEdit when edit button clicked', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} onEdit={mockOnEdit} />);

      const editButton = screen.getByLabelText('Produkt bearbeiten');
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith('product1');
    });

    it('shows loading state during sync', async () => {
      let resolveSync: () => void;
      const slowSync = jest.fn(() => new Promise<void>((resolve) => {
        resolveSync = resolve;
      }));

      render(<ProductCard product={mockProduct} onSync={slowSync} />);

      const syncButton = screen.getByLabelText('Produkt synchronisieren');
      fireEvent.click(syncButton);

      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(syncButton).toBeDisabled();

      resolveSync!();
      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument();
      });
    });

    it('disables sync button during sync', async () => {
      let resolveSync: () => void;
      const slowSync = jest.fn(() => new Promise<void>((resolve) => {
        resolveSync = resolve;
      }));

      render(<ProductCard product={mockProduct} onSync={slowSync} />);

      const syncButton = screen.getByLabelText('Produkt synchronisieren');
      fireEvent.click(syncButton);

      expect(syncButton).toBeDisabled();

      resolveSync!();
      await waitFor(() => {
        expect(syncButton).not.toBeDisabled();
      });
    });
  });

  describe('Text Truncation', () => {
    it('truncates long product names', () => {
      const longNameProduct = {
        ...mockProduct,
        name: 'This is a very long product name that should be truncated to fit in the card'
      };

      render(<ProductCard product={longNameProduct} onSync={mockOnSync} />);

      const heading = screen.getByRole('heading');
      expect(heading.textContent).toContain('...');
      expect(heading.textContent?.length).toBeLessThan(longNameProduct.name.length);
    });

    it('shows full name in title attribute', () => {
      const longNameProduct = {
        ...mockProduct,
        name: 'This is a very long product name that should be truncated'
      };

      render(<ProductCard product={longNameProduct} onSync={mockOnSync} />);

      const heading = screen.getByRole('heading');
      expect(heading).toHaveAttribute('title', longNameProduct.name);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} onEdit={mockOnEdit} />);

      expect(screen.getByLabelText('Produkt synchronisieren')).toBeInTheDocument();
      expect(screen.getByLabelText('Produkt bearbeiten')).toBeInTheDocument();
    });

    it('has alt text on product image', () => {
      render(<ProductCard product={mockProduct} onSync={mockOnSync} />);

      const image = screen.getByAltText('Bio-Äpfel');
      expect(image).toBeInTheDocument();
    });
  });
});
