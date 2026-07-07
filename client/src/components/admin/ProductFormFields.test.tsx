/**
 * @file ProductFormFields.test.tsx
 * @purpose Unit tests for ProductFormFields component
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductFormFields, { ProductFormValues, Tag, Vendor } from './ProductFormFields';

describe('ProductFormFields', () => {
  const mockHandleChange = jest.fn();
  const mockHandleBlur = jest.fn();
  const mockSetFieldValue = jest.fn();
  const mockSetFieldTouched = jest.fn();
  const mockOnVendorChange = jest.fn();

  const defaultValues: ProductFormValues = {
    name: '',
    description: '',
    price: '',
    priceUnit: '',
    tags: [],
    images: [],
    availability: 'available',
    minimumQuantity: '',
    taxRate: '19'
  };

  const mockTags: Tag[] = [
    { _id: 'tag1', name: 'Bio', category: 'Qualität' },
    { _id: 'tag2', name: 'Regional', category: 'Herkunft' },
    { _id: 'tag3', name: 'Obst', category: 'Kategorie' }
  ];

  const mockVendors: Vendor[] = [
    { _id: 'vendor1', businessName: 'Biohof Müller' },
    { _id: 'vendor2', businessName: 'Obsthof Schmidt' }
  ];

  const defaultProps = {
    isVendor: false,
    availableTags: mockTags,
    availableVendors: mockVendors,
    values: defaultValues,
    errors: {},
    touched: {},
    handleChange: mockHandleChange,
    handleBlur: mockHandleBlur,
    setFieldValue: mockSetFieldValue,
    setFieldTouched: mockSetFieldTouched
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all required form fields', () => {
      render(<ProductFormFields {...defaultProps} />);

      expect(screen.getByLabelText(/Produktname/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Preis \(EUR\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Einheit/i)).toBeInTheDocument();
      expect(screen.getByText(/Kategorien\/Tags/i)).toBeInTheDocument();
      expect(screen.getByText(/Produktbilder/i)).toBeInTheDocument();
      // Verfügbarkeit-Feld wurde bewusst entfernt (Bestand läuft über flour.io)
      expect(screen.queryByLabelText(/Verfügbarkeit/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Mindestmenge/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/MwSt.-Satz/i)).toBeInTheDocument();
    });

    it('renders vendor selection for admin users', () => {
      render(<ProductFormFields {...defaultProps} isVendor={false} />);

      expect(screen.getByLabelText(/Vendor auswählen/i)).toBeInTheDocument();
    });

    it('hides vendor selection for vendor users', () => {
      render(<ProductFormFields {...defaultProps} isVendor={true} />);

      expect(screen.queryByLabelText(/Vendor auswählen/i)).not.toBeInTheDocument();
    });

    it('renders all available tags as buttons', () => {
      render(<ProductFormFields {...defaultProps} />);

      expect(screen.getByText('Bio')).toBeInTheDocument();
      expect(screen.getByText('Regional')).toBeInTheDocument();
      expect(screen.getByText('Obst')).toBeInTheDocument();
    });

    // Hinweis: "shows tag categories in parentheses" wurde entfernt —
    // Tag-Kategorien gibt es seit dem Unified-Tag-Pool nicht mehr
    // (Commit e794394 "feat(tags): unified tag pool, remove categories").

    it('renders all vendor options', () => {
      render(<ProductFormFields {...defaultProps} />);

      expect(screen.getByText('Biohof Müller')).toBeInTheDocument();
      expect(screen.getByText('Obsthof Schmidt')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('calls handleChange when name input changes', () => {
      render(<ProductFormFields {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Produktname/i);
      fireEvent.change(nameInput, { target: { value: 'Bio-Äpfel' } });

      expect(mockHandleChange).toHaveBeenCalled();
    });

    it('calls handleBlur when input loses focus', () => {
      render(<ProductFormFields {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Produktname/i);
      fireEvent.blur(nameInput);

      expect(mockHandleBlur).toHaveBeenCalled();
    });

    it('calls onVendorChange when vendor is selected', () => {
      render(<ProductFormFields {...defaultProps} onVendorChange={mockOnVendorChange} />);

      const vendorSelect = screen.getByLabelText(/Vendor auswählen/i);
      fireEvent.change(vendorSelect, { target: { value: 'vendor1' } });

      expect(mockHandleChange).toHaveBeenCalled();
      expect(mockOnVendorChange).toHaveBeenCalledWith('vendor1');
    });

    it('toggles tag selection when tag button is clicked', () => {
      render(<ProductFormFields {...defaultProps} />);

      const bioTag = screen.getByText('Bio');
      fireEvent.click(bioTag);

      expect(mockSetFieldValue).toHaveBeenCalledWith('tags', ['tag1']);
    });

    it('removes tag when clicking selected tag', () => {
      const valuesWithTags = { ...defaultValues, tags: ['tag1', 'tag2'] };
      render(<ProductFormFields {...defaultProps} values={valuesWithTags} />);

      const bioTag = screen.getByText('Bio');
      fireEvent.click(bioTag);

      expect(mockSetFieldValue).toHaveBeenCalledWith('tags', ['tag2']);
    });

    it('shows selected tags with different styling', () => {
      const valuesWithTags = { ...defaultValues, tags: ['tag1'] };
      render(<ProductFormFields {...defaultProps} values={valuesWithTags} />);

      // Ausgewählte Tags werden über TagBadge mit Ring markiert
      const bioTag = screen.getByText('Bio');
      expect(bioTag).toHaveClass('ring-2', 'ring-offset-1');

      const unselectedTag = screen.getByText('Regional');
      expect(unselectedTag).not.toHaveClass('ring-2');
    });
  });

  describe('Validation and Errors', () => {
    it('displays error message for name field', () => {
      const propsWithError = {
        ...defaultProps,
        errors: { name: 'Name ist erforderlich' },
        touched: { name: true }
      };

      render(<ProductFormFields {...propsWithError} />);

      expect(screen.getByText('Name ist erforderlich')).toBeInTheDocument();
    });

    it('applies error styling to fields with errors', () => {
      const propsWithError = {
        ...defaultProps,
        errors: { name: 'Name ist erforderlich' },
        touched: { name: true }
      };

      render(<ProductFormFields {...propsWithError} />);

      const nameInput = screen.getByLabelText(/Produktname/i);
      expect(nameInput).toHaveClass('border-red-300');
    });

    it('only shows error when field is touched', () => {
      const propsWithError = {
        ...defaultProps,
        errors: { name: 'Name ist erforderlich' },
        touched: { name: false }
      };

      render(<ProductFormFields {...propsWithError} />);

      expect(screen.queryByText('Name ist erforderlich')).not.toBeInTheDocument();
    });

    it('displays error icons with error messages', () => {
      const propsWithError = {
        ...defaultProps,
        errors: { name: 'Name ist erforderlich' },
        touched: { name: true }
      };

      render(<ProductFormFields {...propsWithError} />);

      // Fehlertext und Icon liegen zusammen im selben <p> mit Flex-Layout
      const errorText = screen.getByText('Name ist erforderlich');

      expect(errorText).toHaveClass('flex', 'items-center');
      expect(errorText.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering for Vendors', () => {
    it('limits image count to 5 for vendors', () => {
      render(<ProductFormFields {...defaultProps} isVendor={true} />);

      expect(screen.getByText(/\(max\. 5\)/)).toBeInTheDocument();
    });

    it('allows more images for admins', () => {
      render(<ProductFormFields {...defaultProps} isVendor={false} />);

      // Vendor-specific text should not appear
      expect(screen.queryByText(/\(max\. 5\)/)).not.toBeInTheDocument();
    });
  });

  describe('Price Units', () => {
    it('renders all price unit options', () => {
      render(<ProductFormFields {...defaultProps} />);

      const unitSelect = screen.getByLabelText(/Einheit/i);
      expect(unitSelect).toBeInTheDocument();

      // Check for some key units
      expect(screen.getByText('Kilogramm (kg)')).toBeInTheDocument();
      expect(screen.getByText('Stück')).toBeInTheDocument();
      expect(screen.getByText('Liter (l)')).toBeInTheDocument();
    });
  });

  // Hinweis: "Availability Options" wurde entfernt — das Verfügbarkeits-Feld
  // wurde bewusst aus dem Formular genommen (Commit 6701684
  // "feat(vendor): product edit, taxRate field, remove availability/initial-stock UI");
  // Bestand wird über flour.io verwaltet.

  describe('Tax Rate', () => {
    it('renders tax rate options', () => {
      render(<ProductFormFields {...defaultProps} />);

      expect(screen.getByText('19% (Standard)')).toBeInTheDocument();
      expect(screen.getByText('7% (Ermäßigt)')).toBeInTheDocument();
    });

    it('shows helpful tax rate hint', () => {
      render(<ProductFormFields {...defaultProps} />);

      expect(screen.getByText(/Lebensmittel haben meist 7% MwSt./)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows message when no tags available', () => {
      render(<ProductFormFields {...defaultProps} availableTags={[]} />);

      expect(screen.getByText('Keine Tags verfügbar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('marks required fields with asterisk', () => {
      render(<ProductFormFields {...defaultProps} />);

      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });

    it('associates labels with form inputs', () => {
      render(<ProductFormFields {...defaultProps} />);

      const nameInput = screen.getByLabelText(/Produktname/i);
      expect(nameInput).toHaveAttribute('id', 'name');
    });
  });
});
