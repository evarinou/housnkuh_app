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

    // Fill password with 7 characters to trigger the length requirement
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Test12!' } }); // 7 characters: fails length requirement

    // Check that the password requirements checklist shows the length requirement as unmet
    await waitFor(() => {
      const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
      expect(lengthRequirement).toBeInTheDocument();
    });
    
    // The requirement should be styled as unmet (gray text for unmet requirement)
    const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement).toHaveClass('text-gray-500');

    // Button should be disabled for invalid password
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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

    // Fill password with less than 8 characters to trigger live validation
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // Check that multiple requirements appear as unmet (live validation)
    await waitFor(() => {
      const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
      expect(lengthRequirement).toBeInTheDocument();
    });
    
    // Length requirement should be unmet (gray)
    const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement).toHaveClass('text-gray-500');

    // Other requirements should also be unmet due to missing complexity
    const uppercaseRequirement = screen.getByText(/Mindestens ein Großbuchstabe/i);
    expect(uppercaseRequirement).toHaveClass('text-gray-500');
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

    // Fill password that meets most requirements but lacks uppercase
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'password123!' } }); // 12 chars, has lower, number, special - missing upper

    // Check that uppercase requirement shows as unmet in live validation
    await waitFor(() => {
      const uppercaseRequirement = screen.getByText(/Mindestens ein Großbuchstabe/i);
      expect(uppercaseRequirement).toBeInTheDocument();
    });
    
    const uppercaseRequirement = screen.getByText(/Mindestens ein Großbuchstabe/i);
    expect(uppercaseRequirement).toHaveClass('text-gray-500');

    // Length should be met (green)
    const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement).toHaveClass('text-green-700');

    // Button should be disabled due to missing uppercase
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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

    // Fill password that meets most requirements but lacks lowercase
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } }); // has upper, number, special - missing lower

    // Check that lowercase requirement shows as unmet in live validation
    await waitFor(() => {
      const lowercaseRequirement = screen.getByText(/Mindestens ein Kleinbuchstabe/i);
      expect(lowercaseRequirement).toBeInTheDocument();
    });
    
    const lowercaseRequirement = screen.getByText(/Mindestens ein Kleinbuchstabe/i);
    expect(lowercaseRequirement).toHaveClass('text-gray-500');

    // Length should be met (green)
    const lengthRequirement2 = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement2).toHaveClass('text-green-700');

    // Button should be disabled due to missing lowercase
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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

    // Fill password that meets most requirements but lacks number
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Password!' } }); // has upper, lower, special - missing number

    // Check that number requirement shows as unmet in live validation
    await waitFor(() => {
      const numberRequirement = screen.getByText(/Mindestens eine Zahl/i);
      expect(numberRequirement).toBeInTheDocument();
    });
    
    const numberRequirement = screen.getByText(/Mindestens eine Zahl/i);
    expect(numberRequirement).toHaveClass('text-gray-500');

    // Length should be met (green)
    const lengthRequirement3 = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement3).toHaveClass('text-green-700');

    // Button should be disabled due to missing number
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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

    // Fill password that meets most requirements but lacks special character
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'Password123' } }); // has upper, lower, number - missing special

    // Check that special character requirement shows as unmet in live validation
    await waitFor(() => {
      const specialRequirement = screen.getByText(/Mindestens ein Sonderzeichen/i);
      expect(specialRequirement).toBeInTheDocument();
    });
    
    const specialRequirement = screen.getByText(/Mindestens ein Sonderzeichen/i);
    expect(specialRequirement).toHaveClass('text-gray-500');

    // Length should be met (green)
    const lengthRequirement4 = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement4).toHaveClass('text-green-700');

    // Button should be disabled due to missing special character
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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

    // Fill password that fails multiple requirements
    const passwordInput = screen.getByLabelText(/^Passwort \*/);
    fireEvent.change(passwordInput, { target: { value: 'pass' } }); // Missing: uppercase, number, special char, length

    // Check that multiple requirements show as unmet in live validation
    await waitFor(() => {
      const lengthRequirement = screen.getByText(/Mindestens 8 Zeichen/i);
      expect(lengthRequirement).toBeInTheDocument();
    });
    
    // All requirements should be unmet (gray)
    const lengthRequirement5 = screen.getByText(/Mindestens 8 Zeichen/i);
    expect(lengthRequirement5).toHaveClass('text-gray-500');

    const uppercaseRequirement2 = screen.getByText(/Mindestens ein Großbuchstabe/i);
    expect(uppercaseRequirement2).toHaveClass('text-gray-500');

    const numberRequirement2 = screen.getByText(/Mindestens eine Zahl/i);
    expect(numberRequirement2).toHaveClass('text-gray-500');

    const specialRequirement2 = screen.getByText(/Mindestens ein Sonderzeichen/i);
    expect(specialRequirement2).toHaveClass('text-gray-500');

    // Only lowercase should be met (green) since 'pass' has lowercase letters
    const lowercaseRequirement2 = screen.getByText(/Mindestens ein Kleinbuchstabe/i);
    expect(lowercaseRequirement2).toHaveClass('text-green-700');

    // Button should be disabled due to multiple missing requirements
    const nextButton = screen.getByRole('button', { name: /weiter/i });
    expect(nextButton).toBeDisabled();
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