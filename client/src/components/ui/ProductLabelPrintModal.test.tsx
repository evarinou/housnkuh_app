/**
 * @file ProductLabelPrintModal.test.tsx
 * @purpose Tests for the label print modal (preview, copies, missing EAN hint)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductLabelPrintModal from './ProductLabelPrintModal';

jest.mock('jsbarcode', () => jest.fn());

const product = {
  name: 'Bio-Äpfel Elstar',
  price: 4.5,
  priceUnit: 'kg',
  ean: '2200000000019'
};

describe('ProductLabelPrintModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ProductLabelPrintModal isOpen={false} onClose={jest.fn()} product={product} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows product name, formatted price and barcode in the preview', () => {
    render(<ProductLabelPrintModal isOpen={true} onClose={jest.fn()} product={product} />);

    expect(screen.getAllByText('Bio-Äpfel Elstar').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4,50\s*€\s*\/\s*kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'EAN 2200000000019', hidden: true }).length).toBeGreaterThan(0);
  });

  it('renders one print label per copy', () => {
    const { container } = render(
      <ProductLabelPrintModal isOpen={true} onClose={jest.fn()} product={product} />
    );

    const copiesInput = screen.getByLabelText('Anzahl');
    fireEvent.change(copiesInput, { target: { value: '3' } });

    expect(container.querySelectorAll('#label-print-area .print-label')).toHaveLength(3);
  });

  it('explains how to get an EAN when the product has none', () => {
    render(
      <ProductLabelPrintModal
        isOpen={true}
        onClose={jest.fn()}
        product={{ ...product, ean: undefined }}
      />
    );

    expect(screen.getByText(/noch keine EAN/i)).toBeInTheDocument();
  });

  it('calls window.print when clicking Drucken', () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    render(<ProductLabelPrintModal isOpen={true} onClose={jest.fn()} product={product} />);

    fireEvent.click(screen.getByRole('button', { name: /drucken/i }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
