/**
 * @file MeineBuchungenPage.test.tsx
 * @purpose Unit tests for MeineBuchungenPage component API calls
 * @created 2025-08-11
 * @modified 2025-08-11
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import MeineBuchungenPage from './MeineBuchungenPage';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock VendorAuthContext
const mockVendorAuth = {
  user: { id: '1', name: 'Test Vendor' },
  bookings: [],
  isBookingsLoading: false,
  refreshBookings: jest.fn()
};

jest.mock('../../contexts/VendorAuthContext', () => ({
  useVendorAuth: () => mockVendorAuth
}));

// Mock child components
jest.mock('../../components/vendor/VendorLayout', () => {
  return ({ children }: { children: React.ReactNode }) => <div data-testid="vendor-layout">{children}</div>;
});

jest.mock('../../components/vendor/StatusFilterTabs', () => {
  return () => <div data-testid="status-filter-tabs">Status Filter Tabs</div>;
});

jest.mock('../../components/vendor/BookingsList', () => {
  return () => <div data-testid="bookings-list">Bookings List</div>;
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'test-token')
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock environment variable
const originalEnv = process.env;
beforeAll(() => {
  process.env.REACT_APP_API_URL = 'http://localhost:5000/api';
});

afterAll(() => {
  process.env = originalEnv;
});

describe('MeineBuchungenPage', () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  it('should call correct API endpoint for zusatzleistungen', async () => {
    // Mock successful API response with correct structure
    mockedAxios.get.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        contracts: [] 
      } 
    });

    render(
      <BrowserRouter>
        <MeineBuchungenPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:5000/api/vendor/contracts/zusatzleistungen',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  it('should load without API errors', async () => {
    // Mock successful response
    mockedAxios.get.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        contracts: [] 
      } 
    });

    render(
      <BrowserRouter>
        <MeineBuchungenPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Meine Buchungen/i)).toBeInTheDocument();
    });
  });
});