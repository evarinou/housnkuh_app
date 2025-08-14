/**
 * @file VendorRegistrationModal.test.tsx
 * @purpose Unit tests for VendorRegistrationModal password validation
 * @created 2025-08-06
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VendorRegistrationModal from './VendorRegistrationModal';

// Mock PackageData for tests
const mockPackageData = {
  selectedProvisionType: 'standard',
  selectedPackages: ['basic'],
  packageCounts: { 'basic': 1 },
  packageOptions: [{
    id: 'basic',
    name: 'Basic Package',
    price: 29.99,
    description: 'Basic package for testing',
    image: '',
    detail: 'Test details'
  }],
  rentalDuration: 12,
  totalCost: {
    monthly: 29.99,
    oneTime: 0,
    provision: 4
  },
  discount: 0,
  zusatzleistungen: {
    lagerservice: false,
    versandservice: false
  }
};

// Mock the VendorAuthContext
jest.mock('../contexts/VendorAuthContext', () => ({
  useVendorAuth: () => ({
    isAuthenticated: false,
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    registerWithBooking: jest.fn(),
    preRegisterVendor: jest.fn(),
    getTrialStatus: jest.fn(),
    cancelTrialBooking: jest.fn(),
    fetchBookings: jest.fn(),
    refreshBookings: jest.fn(),
    isLoading: false,
    bookings: [],
    isBookingsLoading: false,
  }),
}));

// Mock the useVendorRegistration hook
jest.mock('../hooks/useVendorRegistration', () => ({
  useVendorRegistration: () => ({
    registerWithBooking: jest.fn(),
    preRegisterVendor: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('VendorRegistrationModal Password Complexity Validation', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reject passwords with 7 characters', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    // Fill email field
    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Fill password with 7 characters
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: '1234567' } });

    // Fill confirm password
    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: '1234567' } });

    // Try to proceed to next step
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    
    // Button should be disabled for 7-character password
    expect(nextButton).toBeDisabled();

    // Check error message appears
    await waitFor(() => {
      expect(screen.getByText(/Fehlend:.*Mindestens 8 Zeichen/i)).toBeInTheDocument();
    });
  });

  test('should accept passwords with 8 characters', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    // Fill email field
    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Fill password with 8 characters that meets complexity requirements
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Test123!' } });

    // Fill confirm password
    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'Test123!' } });

    // Button should be enabled for 8-character password
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).not.toBeDisabled();

    // No error message should be present
    expect(screen.queryByText(/Fehlend:/i)).not.toBeInTheDocument();
  });

  test('should accept passwords with more than 8 characters', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    // Fill email field
    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Fill password with 10 characters that meets complexity requirements
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Testing123!' } });

    // Fill confirm password
    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'Testing123!' } });

    // Button should be enabled for 10-character password
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).not.toBeDisabled();

    // No error message should be present
    expect(screen.queryByText(/Fehlend:/i)).not.toBeInTheDocument();
  });

  test('should show password validation error immediately when typing', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    // Fill password with less than 8 characters
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/Fehlend:/i)).toBeInTheDocument();
    });
  });

  test('should not show password validation in login mode', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    // Switch to login mode by clicking the login toggle
    const loginToggle = screen.getByRole('button', { name: /Bereits registriert\? Hier anmelden/i });
    fireEvent.click(loginToggle);

    // In login mode, any password should be accepted (backend validates)
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // No length validation error should be shown in login mode
    expect(screen.queryByText(/Fehlend:/i)).not.toBeInTheDocument();
  });

  test('should reject password without uppercase letter', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'password123!' } });

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123!' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Fehlend:.*Großbuchstabe/i)).toBeInTheDocument();
    });
  });

  test('should reject password without lowercase letter', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } });

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'PASSWORD123!' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Fehlend:.*Kleinbuchstabe/i)).toBeInTheDocument();
    });
  });

  test('should reject password without number', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Password!' } });

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password!' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Fehlend:.*Zahl/i)).toBeInTheDocument();
    });
  });

  test('should reject password without special character', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/Fehlend:.*Sonderzeichen/i)).toBeInTheDocument();
    });
  });

  test('should accept valid complex password', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).not.toBeDisabled();

    expect(screen.queryByText(/Fehlend:/i)).not.toBeInTheDocument();
  });

  test('should show multiple missing requirements', async () => {
    render(
      <VendorRegistrationModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess}
        packageData={mockPackageData}
      />
    );

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'pass' } }); // Missing: uppercase, number, special char, length

    const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'pass' } });

    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();

    await waitFor(() => {
      const errorText = screen.getByText(/Fehlend:/i);
      expect(errorText).toBeInTheDocument();
      expect(errorText.textContent).toContain('Großbuchstabe');
      expect(errorText.textContent).toContain('Zahl');
      expect(errorText.textContent).toContain('Sonderzeichen');
      expect(errorText.textContent).toContain('Mindestens 8 Zeichen');
    });
  });

  test('should accept password with all allowed special characters', async () => {
    const specialChars = ['@', '$', '!', '%', '*', '?', '&'];
    
    for (const char of specialChars) {
      const { unmount } = render(
        <VendorRegistrationModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          packageData={mockPackageData}
        />
      );

      const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const passwordInput = screen.getByLabelText(/^Passwort \*/);
      fireEvent.change(passwordInput, { target: { value: `Password123${char}` } });

      const confirmPasswordInput = screen.getByLabelText(/Passwort bestätigen/i);
      fireEvent.change(confirmPasswordInput, { target: { value: `Password123${char}` } });

      const nextButton = screen.getByRole('button', { name: /weiter/i });
      expect(nextButton).not.toBeDisabled();

      // Clean up for next iteration
      unmount();
    }
  });
});