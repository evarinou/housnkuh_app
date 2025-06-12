// client/src/components/VendorRegistrationModal.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VendorRegistrationModal from '../../components/VendorRegistrationModal';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// StoreSettingsContext removed - no longer needed

// Mock VendorAuthContext
jest.mock('../../contexts/VendorAuthContext', () => ({
  useVendorAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn().mockResolvedValue({ success: true })
  })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('VendorRegistrationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockPackageData = {
    selectedProvisionType: 'standard',
    selectedPackages: ['basic'],
    packageCounts: { basic: 1 },
    packageOptions: [{
      id: 'basic',
      name: 'Basic Package',
      price: 100,
      description: 'Basic rental package',
      image: '/placeholder.jpg',
      detail: 'Basic details'
    }],
    selectedAddons: [],
    rentalDuration: 12,
    totalCost: {
      monthly: 100,
      oneTime: 50,
      provision: 200
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockClear();
  });

  describe('Modal Display', () => {
    test('should render modal when isOpen is true', () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText(/Paket buchen/i)).toBeInTheDocument();
      expect(screen.getByText(/Schritt 1 von 4/i)).toBeInTheDocument();
    });

    test('should not render modal when isOpen is false', () => {
      renderWithRouter(<VendorRegistrationModal isOpen={false} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      expect(screen.queryByText(/Paket buchen/i)).not.toBeInTheDocument();
    });

    test('should call onClose when close button is clicked', () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      const closeButtons = screen.getAllByRole('button', { name: '' });
      fireEvent.click(closeButtons[0]); // First unnamed button is the close button
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pre-Registration Flow (Store Closed)', () => {
    test('should display pre-registration message when store is closed', () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      expect(screen.getByText(/Vor-Registrierung vor Store-Eröffnung/i)).toBeInTheDocument();
      expect(screen.getByText(/Ihr kostenloser Probemonat startet automatisch/i)).toBeInTheDocument();
    });

    test('should complete pre-registration successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Erfolgreich registriert',
          vendor: { id: '123', email: 'test@vendor.com' }
        }
      });

      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Step 1: Fill personal data
      await userEvent.type(screen.getByLabelText(/Name \*/i), 'Test Vendor');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'test@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      
      fireEvent.click(screen.getByText(/Weiter/i));
      
      // Step 2: Fill address data
      await waitFor(() => {
        expect(screen.getByText(/Schritt 2 von 4/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Straße \*/i), 'Teststraße');
      await userEvent.type(screen.getByLabelText(/Hausnummer \*/i), '123');
      await userEvent.type(screen.getByLabelText(/PLZ \*/i), '12345');
      await userEvent.type(screen.getByLabelText(/Ort \*/i), 'Teststadt');
      
      fireEvent.click(screen.getByText(/Weiter/i));
      
      // Step 3: Fill company data
      await waitFor(() => {
        expect(screen.getByText(/Schritt 3 von 4/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Unternehmen/i), 'Test GmbH');
      await userEvent.type(screen.getByLabelText(/Beschreibung/i), 'Test description');
      
      // Submit registration
      fireEvent.click(screen.getByText(/Registrieren/i));
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
      
      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/Erfolgreich registriert/i)).toBeInTheDocument();
      });
    });

    test('should show validation errors for required fields', async () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Try to proceed without filling required fields
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Dieses Feld ist erforderlich/i)).toBeInTheDocument();
      });
    });

    test('should validate email format', async () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'invalid-email');
      fireEvent.blur(screen.getByLabelText(/E-Mail \*/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Bitte geben Sie eine gültige E-Mail-Adresse ein/i)).toBeInTheDocument();
      });
    });

    test('should validate password confirmation', async () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'DifferentPass123!');
      fireEvent.blur(screen.getByLabelText(/Passwort bestätigen \*/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Die Passwörter stimmen nicht überein/i)).toBeInTheDocument();
      });
    });
  });

  describe('Regular Registration Flow (Store Open)', () => {
    beforeEach(() => {
      // Store is always open - no pre-launch functionality
    });

    test('should show booking options when store is open', async () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Should show booking checkbox on step 3
      // Navigate to step 3
      await userEvent.type(screen.getByLabelText(/Name \*/i), 'Test Vendor');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'test@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 2 von 4/i));
      
      await userEvent.type(screen.getByLabelText(/Straße \*/i), 'Teststraße');
      await userEvent.type(screen.getByLabelText(/Hausnummer \*/i), '123');
      await userEvent.type(screen.getByLabelText(/PLZ \*/i), '12345');
      await userEvent.type(screen.getByLabelText(/Ort \*/i), 'Teststadt');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Möchten Sie direkt ein Mietfach buchen/i)).toBeInTheDocument();
      });
    });

    test('should submit with booking request when selected', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Erfolgreich registriert',
          vendor: { id: '123', email: 'test@vendor.com' }
        }
      });

      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Fill all steps
      await userEvent.type(screen.getByLabelText(/Name \*/i), 'Test Vendor');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'test@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 2 von 4/i));
      
      await userEvent.type(screen.getByLabelText(/Straße \*/i), 'Teststraße');
      await userEvent.type(screen.getByLabelText(/Hausnummer \*/i), '123');
      await userEvent.type(screen.getByLabelText(/PLZ \*/i), '12345');
      await userEvent.type(screen.getByLabelText(/Ort \*/i), 'Teststadt');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 3 von 4/i));
      
      // Select booking option
      const bookingCheckbox = screen.getByRole('checkbox', { name: /Möchten Sie direkt ein Mietfach buchen/i });
      fireEvent.click(bookingCheckbox);
      
      // Fill booking details
      await waitFor(() => {
        expect(screen.getByLabelText(/Mietfachgröße/i)).toBeInTheDocument();
      });
      
      await userEvent.selectOptions(screen.getByLabelText(/Mietfachgröße/i), '10qm');
      await userEvent.type(screen.getByLabelText(/Anzahl der Mietfächer/i), '2');
      
      // Submit
      fireEvent.click(screen.getByText(/Registrieren/i));
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/vendor-auth/register'),
          expect.objectContaining({
            bookingRequest: expect.objectContaining({
              mietfachGroesse: '10qm',
              menge: 2
            })
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when registration fails', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Ein Account mit dieser E-Mail existiert bereits.'
          }
        }
      });

      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Fill and submit form
      await userEvent.type(screen.getByLabelText(/Name \*/i), 'Test Vendor');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'existing@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'SecurePass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 2 von 4/i));
      
      await userEvent.type(screen.getByLabelText(/Straße \*/i), 'Teststraße');
      await userEvent.type(screen.getByLabelText(/Hausnummer \*/i), '123');
      await userEvent.type(screen.getByLabelText(/PLZ \*/i), '12345');
      await userEvent.type(screen.getByLabelText(/Ort \*/i), 'Teststadt');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 3 von 4/i));
      
      fireEvent.click(screen.getByText(/Registrieren/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Ein Account mit dieser E-Mail existiert bereits/i)).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Quick fill form
      await userEvent.type(screen.getByLabelText(/Name \*/i), 'Test');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'test@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'Pass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'Pass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 2 von 4/i));
      
      await userEvent.type(screen.getByLabelText(/Straße \*/i), 'Test');
      await userEvent.type(screen.getByLabelText(/Hausnummer \*/i), '1');
      await userEvent.type(screen.getByLabelText(/PLZ \*/i), '12345');
      await userEvent.type(screen.getByLabelText(/Ort \*/i), 'Test');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => screen.getByText(/Schritt 3 von 4/i));
      
      fireEvent.click(screen.getByText(/Registrieren/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('should navigate between steps correctly', async () => {
      renderWithRouter(<VendorRegistrationModal isOpen={true} onClose={mockOnClose} packageData={mockPackageData} onSuccess={mockOnSuccess} />);
      
      // Start at step 1
      expect(screen.getByText(/Schritt 1 von 4/i)).toBeInTheDocument();
      
      // Fill step 1 and go to step 2
      await userEvent.type(screen.getByLabelText(/Vollständiger Name \*/i), 'Test');
      await userEvent.type(screen.getByLabelText(/E-Mail \*/i), 'test@vendor.com');
      await userEvent.type(screen.getByLabelText(/Passwort \*/i), 'Pass123!');
      await userEvent.type(screen.getByLabelText(/Passwort bestätigen \*/i), 'Pass123!');
      await userEvent.type(screen.getByLabelText(/Telefon \*/i), '+49123456789');
      fireEvent.click(screen.getByText(/Weiter/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Schritt 2 von 4/i)).toBeInTheDocument();
      });
      
      // Go back to step 1
      fireEvent.click(screen.getByText(/Zurück/i));
      
      await waitFor(() => {
        expect(screen.getByText(/Schritt 1 von 4/i)).toBeInTheDocument();
      });
      
      // Data should be preserved
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@vendor.com')).toBeInTheDocument();
    });
  });
});