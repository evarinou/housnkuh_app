/**
 * @file PackageTrackingWidget.test.tsx
 * @purpose Unit tests for PackageTrackingWidget component
 * @created 2025-08-11
 * @modified 2025-08-11
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import { VendorAuthStateContext, VendorAuthActionsContext } from '../../contexts/VendorAuthContext';
import { VendorAuthState, VendorAuthActions } from '../../hooks/useProviderState';
import PackageTrackingWidget from './PackageTrackingWidget';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockVendorAuthState: VendorAuthState = {
  user: {
    id: 'vendor-123',
    email: 'test@example.com',
    name: 'Test Vendor',
    isVendor: true,
    registrationStatus: 'trial_active',
    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  bookings: [],
  isBookingsLoading: false
};

const mockVendorAuthActions: VendorAuthActions = {
  login: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn(),
  registerWithBooking: jest.fn(),
  preRegisterVendor: jest.fn(),
  getTrialStatus: jest.fn(),
  cancelTrialBooking: jest.fn(),
  fetchBookings: jest.fn(),
  refreshBookings: jest.fn()
};

describe('PackageTrackingWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('vendorToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render loading state initially', () => {
    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should use correct API endpoint for zusatzleistungen', async () => {
    const mockData = {
      data: {
        success: true,
        contracts: [
          {
            _id: 'contract-1',
            id: 'contract-1',
            vendorId: 'vendor-123',
            zusatzleistungen: {
              lagerservice: true,
              versandservice: false
            },
            packages: [
              {
                _id: 'package-1',
                id: 'package-1',
                package_typ: 'lagerservice',
                status: 'eingelagert',
                notizen: 'Test package'
              }
            ]
          }
        ]
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockData);

    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/vendor/contracts/zusatzleistungen'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token'
          }
        })
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network Error';
    mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Laden der Package-Daten/i)).toBeInTheDocument();
    });
  });

  it('should display message when no zusatzleistungen are active', async () => {
    const mockData = {
      data: {
        success: true,
        contracts: []
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockData);

    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Aktivieren Sie Zusatzleistungen/i)).toBeInTheDocument();
    });
  });

  it('should display packages when data is available', async () => {
    const mockData = {
      data: {
        success: true,
        contracts: [
          {
            _id: 'contract-1',
            id: 'contract-1',
            vendorId: 'vendor-123',
            zusatzleistungen: {
              lagerservice: true,
              versandservice: true
            },
            packages: [
              {
                _id: 'package-1',
                id: 'package-1',
                package_typ: 'lagerservice',
                status: 'eingelagert',
                notizen: 'Test package',
                einlagerung_datum: '2025-01-03T10:00:00Z',
                ankunft_datum: '2025-01-02T10:00:00Z'
              }
            ]
          }
        ]
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockData);

    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Lagerservice/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Paket ist eingelagert/i)).toBeInTheDocument();
  });

  it('should show error when authentication token is missing', async () => {
    localStorage.removeItem('vendorToken');

    render(
      <BrowserRouter>
        <VendorAuthStateContext.Provider value={mockVendorAuthState}>
          <VendorAuthActionsContext.Provider value={mockVendorAuthActions}>
            <PackageTrackingWidget />
          </VendorAuthActionsContext.Provider>
        </VendorAuthStateContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Authentifizierung erforderlich/i)).toBeInTheDocument();
    });

    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});