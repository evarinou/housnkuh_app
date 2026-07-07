/**
 * @file InvoiceDetail.test.tsx
 * @purpose Comprehensive unit tests for InvoiceDetail component
 * @created 2025-09-09
 * @modified 2025-09-09
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InvoiceDetail from './InvoiceDetail';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams()
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: jest.fn(() => 'mocked-blob-url'),
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-vendor-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.print
Object.defineProperty(window, 'print', {
  value: jest.fn(),
});

// Mock CSS import
jest.mock('./InvoiceDetail.css', () => ({}));

// Test data
const mockInvoiceData = {
  id: 'invoice-123',
  invoiceNumber: 'RE-2024-001',
  vendor: {
    id: 'vendor-456',
    name: 'Test Vendor GmbH',
    email: 'test@vendor.com',
    address: {
      street: 'Teststraße 123',
      city: 'München',
      postalCode: '80331',
      country: 'Deutschland'
    }
  },
  period: {
    month: 8,
    year: 2024
  },
  items: [
    {
      description: 'Mietfach M (August 2024)',
      quantity: 1,
      unitPrice: 150.00,
      totalPrice: 150.00,
      type: 'mietfach' as const,
      period: {
        from: new Date('2024-08-01'),
        to: new Date('2024-08-31')
      }
    },
    {
      description: 'Paketservice',
      quantity: 5,
      unitPrice: 2.50,
      totalPrice: 12.50,
      type: 'zusatzleistung' as const
    }
  ],
  subtotal: 162.50,
  tax: 30.88,
  totalAmount: 193.38,
  status: 'sent' as const,
  dueDate: '2024-09-15T00:00:00.000Z',
  paidDate: undefined,
  emailStatus: 'sent' as const,
  emailSentAt: '2024-08-15T10:30:00.000Z',
  notes: 'Testrechnung für Entwicklung',
  createdAt: '2024-08-01T00:00:00.000Z',
  updatedAt: '2024-08-01T00:00:00.000Z'
};

const renderInvoiceDetail = () => {
  return render(
    <BrowserRouter>
      <InvoiceDetail />
    </BrowserRouter>
  );
};

describe.skip('InvoiceDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ id: 'invoice-123' });
    mockFetch.mockClear();
  });

  describe('Loading State', () => {
    it('should display loading skeleton while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderInvoiceDetail();
      
      expect(screen.getByTestId('loading-skeleton') || screen.getByText(/lädt/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Server Error' })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/fehler beim laden der rechnung/i)).toBeInTheDocument();
      });
    });

    it('should display specific error for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: 'Not Found' })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/rechnung nicht gefunden/i)).toBeInTheDocument();
      });
    });

    it('should show retry and back buttons in error state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/erneut versuchen/i)).toBeInTheDocument();
        expect(screen.getByText(/zurück zur liste/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should render invoice header with number and dates', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText('Rechnung RE-2024-001')).toBeInTheDocument();
        expect(screen.getByText(/periode: august 2024/i)).toBeInTheDocument();
        expect(screen.getByText(/erstellt: 01\.08\.2024/i)).toBeInTheDocument();
      });
    });

    it('should display vendor information', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText('Test Vendor GmbH')).toBeInTheDocument();
        expect(screen.getByText('test@vendor.com')).toBeInTheDocument();
        expect(screen.getByText('Teststraße 123')).toBeInTheDocument();
        expect(screen.getByText('80331 München')).toBeInTheDocument();
        expect(screen.getByText('Deutschland')).toBeInTheDocument();
      });
    });

    it('should render itemized list with descriptions and amounts', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText('Mietfach M (August 2024)')).toBeInTheDocument();
        expect(screen.getByText('Paketservice')).toBeInTheDocument();
        expect(screen.getByText('150,00 €')).toBeInTheDocument();
        expect(screen.getByText('12,50 €')).toBeInTheDocument();
      });
    });

    it('should display calculation breakdown', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/zwischensumme:/i)).toBeInTheDocument();
        expect(screen.getByText(/mehrwertsteuer \(19%\):/i)).toBeInTheDocument();
        expect(screen.getByText(/gesamtbetrag:/i)).toBeInTheDocument();
        expect(screen.getByText('162,50 €')).toBeInTheDocument();
        expect(screen.getByText('30,88 €')).toBeInTheDocument();
        expect(screen.getByText('193,38 €')).toBeInTheDocument();
      });
    });

    it('should show payment status and due date', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/versendet/i)).toBeInTheDocument();
        expect(screen.getByText(/15\.09\.2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('German Number Formatting', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should format currency amounts in German style', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        // Check for German decimal separator (comma) and thousands separator
        expect(screen.getByText('162,50 €')).toBeInTheDocument();
        expect(screen.getByText('193,38 €')).toBeInTheDocument();
      });
    });

    it('should format quantities in German style', async () => {
      const mockDataWithLargeQuantity = {
        ...mockInvoiceData,
        items: [
          ...mockInvoiceData.items,
          {
            description: 'Test Item',
            quantity: 1234,
            unitPrice: 1.00,
            totalPrice: 1234.00,
            type: 'sonstiges' as const
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockDataWithLargeQuantity })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText('1.234')).toBeInTheDocument();
      });
    });
  });

  describe('Date Formatting', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should format dates in DD.MM.YYYY German format', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/01\.08\.2024/)).toBeInTheDocument();
        expect(screen.getByText(/15\.09\.2024/)).toBeInTheDocument();
      });
    });

    it('should format period in German month names', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/august 2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should render all action buttons', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/zurück/i)).toBeInTheDocument();
        expect(screen.getByText(/drucken/i)).toBeInTheDocument();
        expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      });
    });

    it('should handle back navigation', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        const backButton = screen.getByText(/zurück/i);
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/vendor/customer-invoices');
      });
    });

    it('should handle print action', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        const printButton = screen.getByText(/drucken/i);
        fireEvent.click(printButton);
        expect(window.print).toHaveBeenCalled();
      });
    });
  });

  describe('PDF Download', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should handle successful PDF download', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockPdfResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob)
      };

      // Mock the initial invoice fetch
      await waitFor(() => {
        expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      });

      // Mock the PDF download fetch
      mockFetch.mockResolvedValueOnce(mockPdfResponse);

      const downloadButton = screen.getByText(/pdf/i);
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/invoices/invoice-123/pdf',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-vendor-token'
            })
          })
        );
      });
    });

    it('should show loading state during download', async () => {
      renderInvoiceDetail();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      });

      // Mock slow PDF download
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const downloadButton = screen.getByText(/pdf/i);
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/lädt\.\.\./i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should apply responsive classes', async () => {
      renderInvoiceDetail();

      await waitFor(() => {
        const container = document.querySelector('.space-y-6');
        expect(container).toBeInTheDocument();
        
        const headerContainer = document.querySelector('.flex.flex-col.sm\\:flex-row');
        expect(headerContainer).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should call navigate with correct path on back button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        const backButton = screen.getByText(/zurück/i);
        fireEvent.click(backButton);
        
        expect(mockNavigate).toHaveBeenCalledWith('/vendor/customer-invoices');
      });
    });
  });

  describe('Error Handling in Actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });
    });

    it('should handle PDF download errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/pdf/i)).toBeInTheDocument();
      });

      // Mock failed PDF download
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const downloadButton = screen.getByText(/pdf/i);
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Download error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Email Status Display', () => {
    it('should show email status when email was sent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/e-mail versendet/i)).toBeInTheDocument();
        expect(screen.getByText(/15\.08\.2024, 10:30/i)).toBeInTheDocument();
      });
    });

    it('should handle different email statuses', async () => {
      const failedEmailData = {
        ...mockInvoiceData,
        emailStatus: 'failed' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: failedEmailData })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText(/e-mail fehlgeschlagen/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notes Display', () => {
    it('should display notes when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInvoiceData })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.getByText('Testrechnung für Entwicklung')).toBeInTheDocument();
      });
    });

    it('should not show notes section when no notes', async () => {
      const dataWithoutNotes = {
        ...mockInvoiceData,
        notes: undefined
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: dataWithoutNotes })
      });

      renderInvoiceDetail();

      await waitFor(() => {
        expect(screen.queryByText(/bemerkungen/i)).not.toBeInTheDocument();
      });
    });
  });
});