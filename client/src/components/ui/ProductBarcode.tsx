/**
 * @file ProductBarcode.tsx
 * @purpose Renders a product EAN-13 as scannable SVG barcode (jsbarcode)
 * @created 2026-06-10
 */

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface ProductBarcodeProps {
  /** Complete EAN-13 (13 digits incl. check digit) */
  ean: string;
  /** Module (bar) width in px — controls overall barcode width */
  width?: number;
  /** Bar height in px */
  height?: number;
  /** Show the human-readable digits below the bars */
  displayValue?: boolean;
  className?: string;
}

const ProductBarcode: React.FC<ProductBarcodeProps> = ({
  ean,
  width = 2,
  height = 60,
  displayValue = true,
  className
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !/^\d{13}$/.test(ean)) return;
    try {
      JsBarcode(svgRef.current, ean, {
        format: 'EAN13',
        width,
        height,
        displayValue,
        margin: 0,
        fontSize: 14
      });
    } catch {
      // Ungültige EAN (z. B. falsche Prüfziffer) — nichts rendern statt crashen
    }
  }, [ean, width, height, displayValue]);

  if (!/^\d{13}$/.test(ean)) {
    return null;
  }

  return <svg ref={svgRef} className={className} role="img" aria-label={`EAN ${ean}`} />;
};

export default ProductBarcode;
