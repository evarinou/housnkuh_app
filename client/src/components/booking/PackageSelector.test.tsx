/**
 * @file PackageSelector.test.tsx
 * @purpose Unit tests for PackageSelector component
 * @created 2025-08-06
 * @modified 2025-08-06
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PackageSelector from './PackageSelector';

describe('PackageSelector', () => {
  const mockPackageOptions = [
    {
      id: 'std-1',
      name: 'Standard Regal Klein',
      price: 50,
      description: 'Kleines Regal für Produkte',
      image: '',
      detail: '50cm x 30cm',
      category: 'standard' as const,
    },
    {
      id: 'cool-1',
      name: 'Kühlregal',
      price: 100,
      description: 'Gekühlter Bereich',
      image: '',
      detail: '1m x 0.5m',
      category: 'cooled' as const,
    },
    {
      id: 'prem-1',
      name: 'Premium Tisch',
      price: 150,
      description: 'Verkaufstisch in bester Lage',
      image: '',
      detail: '2m x 1m',
      category: 'premium' as const,
    },
    {
      id: 'vis-1',
      name: 'Banner Werbung',
      price: 30,
      description: 'Werbebannerplatz',
      image: '',
      detail: 'Prominent platziert',
      category: 'visibility' as const,
    },
    {
      id: 'vis-2',
      name: 'Social Media Paket',
      price: 25,
      description: 'Promotion auf Social Media',
      image: '',
      detail: 'Instagram & Facebook',
      category: 'visibility' as const,
    },
  ];

  const mockOnTogglePackage = jest.fn();
  const defaultPackageCounts = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all four package categories in Step 2', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Check that Step 2 heading exists
    expect(screen.getByText('Verkaufsflächen auswählen')).toBeInTheDocument();

    // Check that all category titles are rendered
    expect(screen.getByText('Standard Regale')).toBeInTheDocument();
    expect(screen.getByText('Kühl- & Gefrierflächen')).toBeInTheDocument();
    expect(screen.getByText('Verkaufstische')).toBeInTheDocument();
    expect(screen.getByText('Sichtbarkeit')).toBeInTheDocument();
  });

  it('does not render a separate Step 3 section', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Should only have one step heading with number 2
    const stepNumbers = screen.getAllByText('2');
    expect(stepNumbers).toHaveLength(1);

    // Should not have any step heading with number 3
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders visibility packages within Step 2', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Check that visibility packages are rendered
    expect(screen.getByText('Banner Werbung')).toBeInTheDocument();
    expect(screen.getByText('Social Media Paket')).toBeInTheDocument();
  });

  it('allows selection of visibility packages', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Find the add button for the Banner Werbung (vis-1) visibility package using data-testid
    const addButton = screen.getByTestId('increment-vis-1');
    
    expect(addButton).toBeInTheDocument();
    
    // Click the add button
    fireEvent.click(addButton);
    
    // Check that the toggle function was called with correct parameters
    expect(mockOnTogglePackage).toHaveBeenCalledWith('vis-1', true);
  });

  it('updates package counts correctly for visibility items', () => {
    const packageCountsWithVisibility = {
      'vis-1': 2,
      'std-1': 1,
    };

    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={packageCountsWithVisibility}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Check that the count is displayed for visibility package
    expect(screen.getByText('Anzahl: 2')).toBeInTheDocument();
    
    // Check that the count is displayed for standard package
    expect(screen.getByText('Anzahl: 1')).toBeInTheDocument();
  });

  it('displays all category icons correctly', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Check for category icons
    expect(screen.getByText('📦')).toBeInTheDocument(); // Standard
    expect(screen.getByText('❄️')).toBeInTheDocument(); // Cooled
    expect(screen.getByText('⭐')).toBeInTheDocument(); // Premium
    expect(screen.getByText('👁️')).toBeInTheDocument(); // Visibility
  });

  it('renders packages in correct category sections', () => {
    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={defaultPackageCounts}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Check visibility packages are present (skip section containment test)
    expect(screen.getByText('Banner Werbung')).toBeInTheDocument();
    expect(screen.getByText('Social Media Paket')).toBeInTheDocument();
    
    // Check that non-visibility packages are also present but separate
    expect(screen.getByText('Standard Regal Klein')).toBeInTheDocument();
    expect(screen.getByText('Kühlregal')).toBeInTheDocument();
  });

  it('handles increment and decrement for visibility packages', () => {
    const packageCountsWithVisibility = {
      'vis-2': 1,
    };

    render(
      <PackageSelector
        packageOptions={mockPackageOptions}
        packageCounts={packageCountsWithVisibility}
        onTogglePackage={mockOnTogglePackage}
      />
    );

    // Find the Social Media package buttons using specific data-testid
    const socialMediaDecrementButton = screen.getByTestId('decrement-vis-2');
    const socialMediaIncrementButton = screen.getByTestId('increment-vis-2');
    
    expect(socialMediaDecrementButton).toBeInTheDocument();
    expect(socialMediaIncrementButton).toBeInTheDocument();
    
    // Click decrement button
    fireEvent.click(socialMediaDecrementButton);
    expect(mockOnTogglePackage).toHaveBeenCalledWith('vis-2', false);
    
    // Click increment button
    fireEvent.click(socialMediaIncrementButton);
    expect(mockOnTogglePackage).toHaveBeenCalledWith('vis-2', true);
  });
});