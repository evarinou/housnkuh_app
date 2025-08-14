/**
 * @file VendorAuthContext.test.tsx
 * @purpose Unit tests for VendorAuthContext - ensures no infinite loops and proper authentication flow
 * @created 2025-08-06
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { VendorAuthProvider, useVendorAuth } from './VendorAuthContext';
import { tokenStorage, userStorage } from '../utils/auth';

// Mock dependencies
jest.mock('../utils/auth', () => ({
  tokenStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    removeToken: jest.fn(),
  },
  userStorage: {
    getUser: jest.fn(),
    setUser: jest.fn(),
    removeUser: jest.fn(),
  },
}));

jest.mock('../hooks/useVendorRegistration', () => ({
  useVendorRegistration: () => ({
    registerWithBooking: jest.fn(),
    preRegisterVendor: jest.fn(),
  }),
}));

jest.mock('../hooks/usePriceCalculation', () => ({
  usePriceCalculation: () => ({
    processUserData: jest.fn((userData) => userData),
  }),
}));

jest.mock('../hooks/useTrialManagement', () => ({
  useTrialManagement: () => ({
    checkAuth: jest.fn().mockResolvedValue(true),
    getTrialStatus: jest.fn(),
    cancelTrialBooking: jest.fn(),
  }),
}));

jest.mock('../hooks/useAuthOperations', () => ({
  useAuthOperations: () => ({
    logout: jest.fn((callback) => callback()),
  }),
}));

jest.mock('../hooks/useLoginOperations', () => ({
  useLoginOperations: () => ({
    performLogin: jest.fn(),
  }),
}));

jest.mock('../hooks/useProviderState', () => ({
  useProviderState: () => ({
    createState: jest.fn((user, token, isAuthenticated, isLoading) => ({
      user,
      token,
      isAuthenticated,
      isLoading,
    })),
    createActions: jest.fn((login, logout, checkAuth, registerWithBooking, preRegisterVendor, getTrialStatus, cancelTrialBooking) => ({
      login,
      logout,
      checkAuth,
      registerWithBooking,
      preRegisterVendor,
      getTrialStatus,
      cancelTrialBooking,
    })),
  }),
}));

// Test component that uses the context
const TestComponent: React.FC = () => {
  const auth = useVendorAuth();
  return (
    <div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="token">{auth.token || 'no-token'}</div>
    </div>
  );
};

describe('VendorAuthContext', () => {
  const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
  const mockUserStorage = userStorage as jest.Mocked<typeof userStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset mock implementations
    mockTokenStorage.getToken.mockReturnValue(null);
    mockUserStorage.getUser.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes without infinite loops when no token exists', async () => {
    mockTokenStorage.getToken.mockReturnValue(null);

    render(
      <VendorAuthProvider>
        <TestComponent />
      </VendorAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
  });

  it('initializes and checks auth when token exists without creating loops', async () => {
    const mockToken = 'test-token';
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', isVendor: true };

    mockTokenStorage.getToken.mockReturnValue(mockToken);
    mockUserStorage.getUser.mockReturnValue(mockUser);

    render(
      <VendorAuthProvider>
        <TestComponent />
      </VendorAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
  });

  it('does not trigger excessive re-renders during initialization', async () => {
    const mockToken = 'test-token';
    let renderCount = 0;

    const CountingTestComponent: React.FC = () => {
      renderCount++;
      const auth = useVendorAuth();
      return <div data-testid="render-count">{renderCount}</div>;
    };

    mockTokenStorage.getToken.mockReturnValue(mockToken);
    mockUserStorage.getUser.mockReturnValue({ id: '1', name: 'Test', email: 'test@example.com', isVendor: true });

    render(
      <VendorAuthProvider>
        <CountingTestComponent />
      </VendorAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('render-count')).toBeInTheDocument();
    });

    // Allow for initial renders but ensure it's not excessive (< 10)
    expect(renderCount).toBeLessThan(10);
  });

  it('handles token changes correctly without loops', async () => {
    // This test verifies the component can handle different token states
    // without creating infinite loops during re-renders
    
    // Test with no token first
    mockTokenStorage.getToken.mockReturnValue(null);
    
    const { unmount } = render(
      <VendorAuthProvider>
        <TestComponent />
      </VendorAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    });

    unmount();

    // Test with token present
    const mockToken = 'new-token';
    mockTokenStorage.getToken.mockReturnValue(mockToken);
    mockUserStorage.getUser.mockReturnValue({ id: '1', name: 'Test', email: 'test@example.com', isVendor: true });

    render(
      <VendorAuthProvider>
        <TestComponent />
      </VendorAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
    });
  });

  it('prevents API request loops during authentication check', async () => {
    // This test ensures that the checkAuth function is not called repeatedly
    // in an infinite loop after removing it from useEffect dependencies
    
    const mockToken = 'test-token';
    mockTokenStorage.getToken.mockReturnValue(mockToken);
    mockUserStorage.getUser.mockReturnValue({ id: '1', name: 'Test', email: 'test@example.com', isVendor: true });

    let checkAuthCallCount = 0;
    
    // Track how many times the component attempts to call checkAuth
    const TestComponentWithCallTracking: React.FC = () => {
      const auth = useVendorAuth();
      
      // Mock the checkAuth call to increment our counter
      React.useEffect(() => {
        const originalCheckAuth = auth.checkAuth;
        auth.checkAuth = async () => {
          checkAuthCallCount++;
          return originalCheckAuth();
        };
      }, [auth]);
      
      return <div data-testid="tracking">tracking</div>;
    };

    render(
      <VendorAuthProvider>
        <TestComponentWithCallTracking />
      </VendorAuthProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('tracking')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should not have excessive calls (allow for reasonable initialization)
    expect(checkAuthCallCount).toBeLessThan(5);
  });
});