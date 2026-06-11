/**
 * @file ProductBarcode.test.tsx
 * @purpose Tests for the EAN-13 SVG barcode component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ProductBarcode from './ProductBarcode';
import JsBarcode from 'jsbarcode';

jest.mock('jsbarcode', () => jest.fn());

describe('ProductBarcode', () => {
  beforeEach(() => {
    (JsBarcode as jest.Mock).mockClear();
  });

  it('renders an SVG and calls jsbarcode with EAN13 format for a valid EAN', () => {
    render(<ProductBarcode ean="2200000000019" />);

    expect(screen.getByRole('img', { name: 'EAN 2200000000019' })).toBeInTheDocument();
    expect(JsBarcode).toHaveBeenCalledWith(
      expect.anything(),
      '2200000000019',
      expect.objectContaining({ format: 'EAN13' })
    );
  });

  it('renders nothing for invalid EAN input', () => {
    const { container } = render(<ProductBarcode ean="nicht-numerisch" />);
    expect(container.firstChild).toBeNull();
    expect(JsBarcode).not.toHaveBeenCalled();
  });

  it('renders nothing for wrong-length digits', () => {
    const { container } = render(<ProductBarcode ean="12345" />);
    expect(container.firstChild).toBeNull();
  });
});
