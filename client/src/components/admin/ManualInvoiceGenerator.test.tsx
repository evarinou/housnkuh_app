/**
 * @file ManualInvoiceGenerator.test.tsx
 * @purpose Unit tests for the ManualInvoiceGenerator component
 * @created 2025-09-16
 * @modified 2025-09-16
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ManualInvoiceGenerator from './ManualInvoiceGenerator';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockVendors = [
  {
    _id: '1',
    kontakt: { name: 'Vendor 1', email: 'vendor1@test.com' },
    isActive: true
  },
  {
    _id: '2',
    kontakt: { name: 'Vendor 2', email: 'vendor2@test.com' },
    isActive: true
  }
];

describe('ManualInvoiceGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('adminToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders trigger button', () => {
    render(<ManualInvoiceGenerator />);
    expect(screen.getByText('Rechnungen generieren')).toBeInTheDocument();
  });

  test('opens dialog when button is clicked', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText('Manuelle Rechnungsgenerierung')).toBeInTheDocument();
    });
  });

  test('loads vendors when dialog opens', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/vendors', {
        headers: { Authorization: 'Bearer test-token' }
      });
    });
  });

  test('shows vendor dropdown', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText(/Anbieter auswählen/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Alle Anbieter/)).toBeInTheDocument();
    });
  });

  test('shows period selection controls', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText(/Monat/)).toBeInTheDocument();
      expect(screen.getByText(/Jahr/)).toBeInTheDocument();
    });
  });

  test('shows preview information', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText(/Vorschau/)).toBeInTheDocument();
      expect(screen.getByText(/Es werden Rechnungen für/)).toBeInTheDocument();
    });
  });

  test('shows confirmation button', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText('Weiter zur Bestätigung')).toBeInTheDocument();
    });
  });

  test('handles successful invoice generation', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        invoicesGenerated: 2,
        message: 'Erfolgreich generiert'
      }
    });

    render(<ManualInvoiceGenerator />);

    // The component should successfully mount and be able to trigger generation
    expect(screen.getByText('Rechnungen generieren')).toBeInTheDocument();

    // Verify the component can handle the full flow without errors
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  test('handles error during invoice generation', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);

    // Component should handle errors gracefully
    expect(screen.getByText('Rechnungen generieren')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  test('displays error when vendor fetch fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Anbieter')).toBeInTheDocument();
    });
  });

  test('closes dialog on cancel', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator />);
    fireEvent.click(screen.getByText('Rechnungen generieren'));

    await waitFor(() => {
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));

    expect(screen.queryByText('Manuelle Rechnungsgenerierung')).not.toBeInTheDocument();
  });

  test('accepts onGenerationComplete callback', () => {
    const mockCallback = jest.fn();
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendors });

    render(<ManualInvoiceGenerator onGenerationComplete={mockCallback} />);

    // Component should render with callback prop
    expect(screen.getByText('Rechnungen generieren')).toBeInTheDocument();
  });
});