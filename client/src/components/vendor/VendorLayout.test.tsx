/**
 * @file VendorLayout.test.tsx
 * @purpose Unit tests for VendorLayout component with centralized bookings functionality
 * @created 2025-08-07
 * @modified 2025-08-07
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import { useVendorAuth } from '../../contexts/VendorAuthContext';

// Mock the VendorAuthContext
jest.mock('../../contexts/VendorAuthContext', () => ({
  useVendorAuth: jest.fn(),
}));

const mockUseVendorAuth = useVendorAuth as jest.MockedFunction<typeof useVendorAuth>;

// Mock child component to test layout rendering
const TestChild = () => <div data-testid="test-child">Test Content</div>;

const renderVendorLayout = (mockAuthData = {}) => {
  const defaultMockData = {
    user: {
      id: 'test-user-id',
      name: 'Test Vendor',
      email: 'test@vendor.com',
      isVendor: true,
      registrationStatus: 'active' as const,
    },
    token: 'mock-token',
    login: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    registerWithBooking: jest.fn(),
    preRegisterVendor: jest.fn(),
    getTrialStatus: jest.fn(),
    cancelTrialBooking: jest.fn(),
    fetchBookings: jest.fn(),
    refreshBookings: jest.fn(),
    isAuthenticated: true,
    isLoading: false,
    bookings: [],
    isBookingsLoading: false,
    ...mockAuthData,
  };

  mockUseVendorAuth.mockReturnValue(defaultMockData);

  return render(
    <BrowserRouter>
      <VendorLayout>
        <TestChild />
      </VendorLayout>
    </BrowserRouter>
  );
};

describe('VendorLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Layout Rendering', () => {
    it('should render the layout with user name and navigation', () => {
      renderVendorLayout();

      expect(screen.getByText('housnkuh')).toBeInTheDocument();
      expect(screen.getAllByText('Test Vendor')).toHaveLength(2); // Header and sidebar
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Mein Profil')).toBeInTheDocument();
      expect(screen.getByText('Meine Buchungen')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should render logout button', () => {
      renderVendorLayout();
      expect(screen.getByText('Abmelden')).toBeInTheDocument();
    });

    it('should render default name when user name is not available', () => {
      renderVendorLayout({
        user: {
          id: 'test-user-id',
          name: undefined,
          email: 'test@vendor.com',
          isVendor: true,
        },
      });

      expect(screen.getAllByText('Direktvermarkter')).toHaveLength(2); // Header badge and sidebar
    });
  });

  describe('Pending Bookings Count (Centralized Data)', () => {
    it('should not display count badge when no pending bookings', () => {
      renderVendorLayout({
        bookings: [
          { id: '1', status: 'confirmed', requestedAt: new Date() },
          { id: '2', status: 'active', requestedAt: new Date() },
        ],
      });

      const buchungenLink = screen.getByRole('link', { name: /meine buchungen/i });
      expect(buchungenLink).not.toHaveClass('bg-red-500');
    });

    it('should display correct count badge for pending bookings from centralized data', () => {
      renderVendorLayout({
        bookings: [
          { id: '1', status: 'pending', requestedAt: new Date() },
          { id: '2', status: 'confirmed', requestedAt: new Date() },
          { id: '3', status: 'pending', requestedAt: new Date() },
          { id: '4', status: 'active', requestedAt: new Date() },
        ],
      });

      expect(screen.getByText('2')).toBeInTheDocument();
      const badge = screen.getByText('2');
      expect(badge).toHaveClass('bg-red-500', 'text-white');
    });

    it('should display correct count with single pending booking', () => {
      renderVendorLayout({
        bookings: [
          { id: '1', status: 'pending', requestedAt: new Date() },
          { id: '2', status: 'confirmed', requestedAt: new Date() },
        ],
      });

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle empty bookings array', () => {
      renderVendorLayout({
        bookings: [],
      });

      const buchungenLink = screen.getByRole('link', { name: /meine buchungen/i });
      expect(buchungenLink).not.toHaveClass('bg-red-500');
    });

    it('should handle undefined bookings', () => {
      renderVendorLayout({
        bookings: undefined,
      });

      const buchungenLink = screen.getByRole('link', { name: /meine buchungen/i });
      expect(buchungenLink).not.toHaveClass('bg-red-500');
    });
  });

  describe('Trial Status Display', () => {
    it('should display trial status for trial_active users', () => {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 15); // 15 days from now

      renderVendorLayout({
        user: {
          id: 'test-user-id',
          name: 'Test Vendor',
          email: 'test@vendor.com',
          isVendor: true,
          registrationStatus: 'trial_active',
          trialEndDate: trialEndDate.toISOString(),
        },
      });

      expect(screen.getByText('Probemonat - 15 Tage')).toBeInTheDocument();
    });

    it('should not display trial status for non-trial users', () => {
      renderVendorLayout({
        user: {
          id: 'test-user-id',
          name: 'Test Vendor',
          email: 'test@vendor.com',
          isVendor: true,
          registrationStatus: 'active',
        },
      });

      expect(screen.queryByText(/Probemonat/)).not.toBeInTheDocument();
    });

    it('should handle trial with 1 day remaining', () => {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 1); // 1 day from now

      renderVendorLayout({
        user: {
          id: 'test-user-id',
          name: 'Test Vendor',
          email: 'test@vendor.com',
          isVendor: true,
          registrationStatus: 'trial_active',
          trialEndDate: trialEndDate.toISOString(),
        },
      });

      expect(screen.getByText('Probemonat - 1 Tag')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('should render navigation links correctly', () => {
      renderVendorLayout();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const profileLink = screen.getByRole('link', { name: /mein profil/i });
      const buchungenLink = screen.getByRole('link', { name: /meine buchungen/i });

      expect(dashboardLink).toHaveAttribute('href', '/vendor/dashboard');
      expect(profileLink).toHaveAttribute('href', '/vendor/profile');
      expect(buchungenLink).toHaveAttribute('href', '/vendor/meine-buchungen');
    });
  });

  describe('No Direct API Calls', () => {
    it('should not make direct fetch calls for bookings data', () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      renderVendorLayout({
        bookings: [
          { id: '1', status: 'pending', requestedAt: new Date() },
        ],
      });

      // Verify that no direct API calls are made by VendorLayout
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/vendor-auth/bookings/'),
        expect.anything()
      );

      fetchSpy.mockRestore();
    });
  });
});