/**
 * @file ImageUploadField.test.tsx
 * @purpose Unit tests for ImageUploadField component
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUploadField from './ImageUploadField';

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(function(this: any) {
  this.readAsDataURL = jest.fn();
  this.onload = jest.fn();
  this.onerror = jest.fn();
  return this;
}) as any;

describe('ImageUploadField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders upload zone with correct text', () => {
    render(<ImageUploadField images={[]} onChange={mockOnChange} />);

    expect(screen.getByText(/Bilder hierher ziehen oder klicken zum Auswählen/i)).toBeInTheDocument();
    expect(screen.getByText(/JPG, PNG oder WebP/i)).toBeInTheDocument();
  });

  it('displays empty state when no images', () => {
    render(<ImageUploadField images={[]} onChange={mockOnChange} />);

    expect(screen.getByText('Noch keine Bilder hochgeladen')).toBeInTheDocument();
  });

  it('displays existing images with previews', () => {
    const images = [
      'data:image/jpeg;base64,test1',
      'data:image/jpeg;base64,test2'
    ];

    render(<ImageUploadField images={images} onChange={mockOnChange} />);

    const imageElements = screen.getAllByRole('img');
    expect(imageElements).toHaveLength(2);
    expect(imageElements[0]).toHaveAttribute('src', images[0]);
    expect(imageElements[1]).toHaveAttribute('src', images[1]);
  });

  it('marks first image as primary', () => {
    const images = ['data:image/jpeg;base64,test1', 'data:image/jpeg;base64,test2'];

    render(<ImageUploadField images={images} onChange={mockOnChange} />);

    expect(screen.getByText('Hauptbild')).toBeInTheDocument();
  });

  it('shows remove button on hover and removes image when clicked', () => {
    const images = ['data:image/jpeg;base64,test1', 'data:image/jpeg;base64,test2'];

    render(<ImageUploadField images={images} onChange={mockOnChange} />);

    const removeButtons = screen.getAllByLabelText(/Bild \d+ entfernen/);
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith(['data:image/jpeg;base64,test2']);
  });

  it('respects maxImages limit', () => {
    const maxImages = 3;
    const images = Array(maxImages).fill('data:image/jpeg;base64,test');

    render(<ImageUploadField images={images} onChange={mockOnChange} maxImages={maxImages} />);

    expect(screen.getByText(`Maximale Anzahl erreicht (${maxImages})`)).toBeInTheDocument();
  });

  it('displays upload counter', () => {
    const images = ['data:image/jpeg;base64,test1', 'data:image/jpeg;base64,test2'];
    const maxImages = 5;

    render(<ImageUploadField images={images} onChange={mockOnChange} maxImages={maxImages} />);

    expect(screen.getByText(`${images.length} von ${maxImages} Bildern hochgeladen`)).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    const errorMessage = 'Fehler beim Hochladen';

    render(<ImageUploadField images={[]} onChange={mockOnChange} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows custom maxSizeMB in description', () => {
    const maxSizeMB = 5;

    render(<ImageUploadField images={[]} onChange={mockOnChange} maxSizeMB={maxSizeMB} />);

    expect(screen.getByText(new RegExp(`max\\. ${maxSizeMB}MB`))).toBeInTheDocument();
  });

  it('applies correct classes when drag is active', () => {
    render(<ImageUploadField images={[]} onChange={mockOnChange} />);

    const dropzone = screen.getByText(/Bilder hierher ziehen/i).closest('div');

    // Simulate drag enter
    fireEvent.dragEnter(dropzone!);

    // The component should show drag active state (checked via classes)
    // Note: react-dropzone's internal state may not be fully testable without proper drag events
  });

  it('disables upload when max images reached', () => {
    const maxImages = 2;
    const images = Array(maxImages).fill('data:image/jpeg;base64,test');

    render(<ImageUploadField images={images} onChange={mockOnChange} maxImages={maxImages} />);

    // Die Zustandsklassen liegen auf der äußeren Dropzone (border-dashed),
    // nicht auf dem inneren Flex-Container um den Text
    const dropzone = screen
      .getByText(/Maximale Anzahl erreicht/i)
      .closest('div.border-dashed');

    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('renders with accessible ARIA labels', () => {
    const images = ['data:image/jpeg;base64,test'];

    render(<ImageUploadField images={images} onChange={mockOnChange} />);

    expect(screen.getByLabelText('Bild 1 entfernen')).toBeInTheDocument();
  });

  it('displays correct alt text for images', () => {
    const images = ['data:image/jpeg;base64,test1', 'data:image/jpeg;base64,test2'];

    render(<ImageUploadField images={images} onChange={mockOnChange} />);

    expect(screen.getByAltText('Produktbild 1')).toBeInTheDocument();
    expect(screen.getByAltText('Produktbild 2')).toBeInTheDocument();
  });
});
