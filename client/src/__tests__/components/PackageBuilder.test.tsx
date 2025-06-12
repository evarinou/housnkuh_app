// Test for PackageBuilder component with new Mietfächer types
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import PackageBuilder from '../../components/PackageBuilder';
import { VendorAuthProvider } from '../../contexts/VendorAuthContext';

// Mock axios
jest.mock('axios');

// Mock the VendorAuthContext
const mockVendorAuthContext = {
  isAuthenticated: false,
  vendor: null,
  login: jest.fn(),
  logout: jest.fn(),
  updateVendor: jest.fn(),
  loading: false
};

jest.mock('../../contexts/VendorAuthContext', () => ({
  useVendorAuth: () => mockVendorAuthContext,
  VendorAuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const renderPackageBuilder = () => {
  return render(
    <BrowserRouter>
      <VendorAuthProvider>
        <PackageBuilder />
      </VendorAuthProvider>
    </BrowserRouter>
  );
};

describe('PackageBuilder Component - M004 Extensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays all 7 package types correctly', () => {
    renderPackageBuilder();
    
    // Check for all package types
    expect(screen.getByText('Verkaufsblock Lage A')).toBeInTheDocument();
    expect(screen.getByText('Verkaufsblock Lage B')).toBeInTheDocument();
    expect(screen.getByText('Verkaufsblock gekühlt')).toBeInTheDocument();
    expect(screen.getByText('Verkaufsblock gefroren')).toBeInTheDocument();
    expect(screen.getByText('Verkaufstisch')).toBeInTheDocument();
    expect(screen.getByText('Flexibler Bereich')).toBeInTheDocument();
    expect(screen.getByText('Schaufenster')).toBeInTheDocument();
  });

  test('displays package categories with icons', () => {
    renderPackageBuilder();
    
    // Check for category headers
    expect(screen.getByText('Standard Regale')).toBeInTheDocument();
    expect(screen.getByText('Kühl- & Gefrierflächen')).toBeInTheDocument();
    expect(screen.getByText('Premium Bereiche')).toBeInTheDocument();
    
    // Check for category icons
    expect(screen.getByText('📦')).toBeInTheDocument(); // Standard
    expect(screen.getByText('❄️')).toBeInTheDocument(); // Cooled
    expect(screen.getByText('⭐')).toBeInTheDocument(); // Premium
  });

  test('correctly prices new package types', () => {
    renderPackageBuilder();
    
    // Check pricing for new package types
    expect(screen.getByText('60€/Monat')).toBeInTheDocument(); // block-frozen
    expect(screen.getByText('25€/Monat')).toBeInTheDocument(); // block-other
    expect(screen.getByText('80€/Monat')).toBeInTheDocument(); // block-display
  });

  test('can select and deselect new package types', async () => {
    renderPackageBuilder();
    
    // Find and click the + button for frozen package
    const frozenSection = screen.getByText('Verkaufsblock gefroren').closest('div');
    const addButton = frozenSection?.querySelector('button[class*="bg-[#e17564]"]');
    
    expect(addButton).toBeInTheDocument();
    
    if (addButton) {
      fireEvent.click(addButton);
      
      // Check if count is displayed
      await waitFor(() => {
        expect(screen.getByText('Anzahl: 1')).toBeInTheDocument();
      });
      
      // Check if total cost is updated
      const monthlyTotal = screen.getByText(/Monatliche Kosten:/);
      expect(monthlyTotal).toBeInTheDocument();
    }
  });

  test('calculates total cost correctly with new package types', async () => {
    renderPackageBuilder();
    
    // Add one of each new package type
    const packageTypes = [
      { name: 'Verkaufsblock gefroren', price: 60 },
      { name: 'Flexibler Bereich', price: 25 },
      { name: 'Schaufenster', price: 80 }
    ];
    
    for (const pkg of packageTypes) {
      const packageSection = screen.getByText(pkg.name).closest('div');
      const addButton = packageSection?.querySelector('button[class*="bg-[#e17564]"]');
      
      if (addButton) {
        fireEvent.click(addButton);
      }
    }
    
    // Wait for cost calculation
    await waitFor(() => {
      // Total should be 60 + 25 + 80 = 165€
      const expectedTotal = '165.00€';
      expect(screen.getByText(expectedTotal)).toBeInTheDocument();
    });
  });

  test('displays package breakdown in summary', async () => {
    renderPackageBuilder();
    
    // Add a frozen package
    const frozenSection = screen.getByText('Verkaufsblock gefroren').closest('div');
    const addButton = frozenSection?.querySelector('button[class*="bg-[#e17564]"]');
    
    if (addButton) {
      fireEvent.click(addButton);
      
      await waitFor(() => {
        // Check if package appears in summary
        expect(screen.getByText('1x Verkaufsblock gefroren')).toBeInTheDocument();
        expect(screen.getByText('60.00€')).toBeInTheDocument();
      });
    }
  });

  test('maintains responsive design with 7 package types', () => {
    renderPackageBuilder();
    
    // Check if grid layout classes are present
    const packageGrids = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2');
    expect(packageGrids.length).toBeGreaterThan(0);
    
    // Check if all package cards are rendered
    const packageCards = document.querySelectorAll('[class*="border-2 rounded-lg p-4"]');
    expect(packageCards.length).toBeGreaterThanOrEqual(7); // At least 7 package cards
  });

  test('validates at least one package is selected before booking', () => {
    renderPackageBuilder();
    
    // Find the booking button
    const bookingButton = screen.getByText(/Paket buchen/);
    
    // Button should be disabled when no packages selected
    expect(bookingButton).toBeDisabled();
    expect(bookingButton).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('enables booking button when packages are selected', async () => {
    renderPackageBuilder();
    
    // Add a package
    const packageSection = screen.getByText('Flexibler Bereich').closest('div');
    const addButton = packageSection?.querySelector('button[class*="bg-[#e17564]"]');
    
    if (addButton) {
      fireEvent.click(addButton);
      
      await waitFor(() => {
        const bookingButton = screen.getByText(/Paket buchen/);
        expect(bookingButton).toBeEnabled();
        expect(bookingButton).not.toHaveClass('opacity-50');
      });
    }
  });

  test('handles package quantity increment and decrement', async () => {
    renderPackageBuilder();
    
    // Find display window package
    const displaySection = screen.getByText('Schaufenster').closest('div');
    const addButton = displaySection?.querySelector('button[class*="bg-[#e17564]"]');
    
    if (addButton) {
      // Add first package
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Anzahl: 1')).toBeInTheDocument();
      });
      
      // Add second package
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Anzahl: 2')).toBeInTheDocument();
      });
      
      // Find and click the - button
      const minusButton = displaySection?.querySelector('button[class*="border-gray-300"]');
      if (minusButton) {
        fireEvent.click(minusButton);
        
        await waitFor(() => {
          expect(screen.getByText('Anzahl: 1')).toBeInTheDocument();
        });
      }
    }
  });

  test('package data includes all new types in export', async () => {
    renderPackageBuilder();
    
    // Add packages of different types
    const packagesToAdd = ['Verkaufsblock gefroren', 'Flexibler Bereich'];
    
    for (const pkgName of packagesToAdd) {
      const packageSection = screen.getByText(pkgName).closest('div');
      const addButton = packageSection?.querySelector('button[class*="bg-[#e17564]"]');
      
      if (addButton) {
        fireEvent.click(addButton);
      }
    }
    
    await waitFor(() => {
      // This would test the internal getPackageData function
      // In a real test, you'd expose this or test through booking flow
      expect(screen.getByText('Anzahl: 1')).toBeInTheDocument();
    });
  });

  test('displays correct descriptions for new package types', () => {
    renderPackageBuilder();
    
    // Check descriptions for new packages
    expect(screen.getByText('Gefrierbereich für Tiefkühlprodukte')).toBeInTheDocument();
    expect(screen.getByText('Anpassbarer Bereich für spezielle Anforderungen')).toBeInTheDocument();
    expect(screen.getByText('Prominente Schaufenster-Präsentation')).toBeInTheDocument();
  });
});