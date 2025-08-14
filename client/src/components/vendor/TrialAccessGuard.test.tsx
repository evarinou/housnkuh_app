/**
 * @file TrialAccessGuard.test.tsx
 * @purpose Unit tests for TrialAccessGuard component
 * @created 2025-08-05
 * @modified 2025-08-05
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TrialAccessGuard } from './TrialAccessGuard';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useTrialExpiration } from '../../hooks/useTrialExpiration';

// Mock the dependencies
jest.mock('../../contexts/VendorAuthContext');
jest.mock('../../hooks/useTrialExpiration');
jest.mock('../../utils/navigation');

const mockUseVendorAuth = useVendorAuth as jest.MockedFunction<typeof useVendorAuth>;
const mockUseTrialExpiration = useTrialExpiration as jest.MockedFunction<typeof useTrialExpiration>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('TrialAccessGuard', () => {
  const mockTrialState = {
    shouldShowModal: false,
    expirationDate: '2025-08-10',
    daysRemaining: 5,
    isExpired: false,
    isExpiringSoon: false,
    isUrgent: false,
  };

  const mockTrialHook = {
    trialState: mockTrialState,
    dismissModal: jest.fn(),
    handleUpgrade: jest.fn(),
    handleCancelTrial: jest.fn(),
  };

  const mockVendorAuthBase = {
    login: jest.fn().mockResolvedValue(true),
    logout: jest.fn(),
    checkAuth: jest.fn().mockResolvedValue(true),
    registerWithBooking: jest.fn().mockResolvedValue({}),
    preRegisterVendor: jest.fn().mockResolvedValue({}),
    getTrialStatus: jest.fn().mockResolvedValue({ success: true }),
    cancelTrialBooking: jest.fn().mockResolvedValue({ success: true }),
    fetchBookings: jest.fn().mockResolvedValue(undefined),
    refreshBookings: jest.fn().mockResolvedValue(undefined),
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    bookings: [],
    isBookingsLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrialExpiration.mockReturnValue(mockTrialHook);
  });

  it('renders children for non-trial users', () => {
    mockUseVendorAuth.mockReturnValue({
      ...mockVendorAuthBase,
      user: { 
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com',
        isVendor: true,
        registrationStatus: 'active' as const 
      },
    });

    render(
      <TestWrapper>
        <TrialAccessGuard>
          <div>Protected Content</div>
        </TrialAccessGuard>
      </TestWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children for users without trial status', () => {
    mockUseVendorAuth.mockReturnValue({
      ...mockVendorAuthBase,
      user: null,
    });

    render(
      <TestWrapper>
        <TrialAccessGuard>
          <div>Protected Content</div>
        </TrialAccessGuard>
      </TestWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children and modal for trial users when modal should show', () => {
    mockUseVendorAuth.mockReturnValue({
      ...mockVendorAuthBase,
      user: { 
        id: 'test-user-trial',
        name: 'Trial User',
        email: 'trial@example.com',
        isVendor: true,
        registrationStatus: 'trial_active' as const 
      },
    });

    mockUseTrialExpiration.mockReturnValue({
      ...mockTrialHook,
      trialState: { ...mockTrialState, shouldShowModal: true },
    });

    render(
      <TestWrapper>
        <TrialAccessGuard>
          <div>Protected Content</div>
        </TrialAccessGuard>
      </TestWrapper>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders fallback component when provided and access is denied', () => {
    mockUseVendorAuth.mockReturnValue({
      ...mockVendorAuthBase,
      user: { 
        id: 'test-user-trial',
        name: 'Trial User',
        email: 'trial@example.com',
        isVendor: true,
        registrationStatus: 'trial_active' as const 
      },
    });

    const FallbackComponent = () => <div>Access Denied</div>;

    render(
      <TestWrapper>
        <TrialAccessGuard 
          requiresFullAccess={true}
          fallbackComponent={<FallbackComponent />}
        >
          <div>Protected Content</div>
        </TrialAccessGuard>
      </TestWrapper>
    );

    // Should render children since trial users can access non-full access features
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});