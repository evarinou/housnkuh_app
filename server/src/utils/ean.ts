/**
 * @file ean.ts
 * @purpose Internal EAN-13 generation for product labels (flour.io POS scanning)
 * @created 2026-06-10
 *
 * Nummernkreis: GS1-Präfix 20–29 ist für "In-Store"-Nutzung reserviert —
 * wir nutzen "22" und vergeben fortlaufende Nummern über einen atomaren
 * Counter. Die EAN wird beim Flourio-Sync ins ean-Feld des Artikels
 * geschrieben und auf Etiketten gedruckt.
 */

import Counter from '../models/Counter';

/** GS1 in-store prefix used for all housnkuh-generated EANs */
export const EAN_INSTORE_PREFIX = '22';

/** Counter document id for the product EAN sequence */
export const PRODUCT_EAN_COUNTER = 'productEan';

/**
 * Compute the EAN-13 check digit for the first 12 digits.
 * Weights alternate 1/3 from the left; check digit fills the sum to a multiple of 10.
 */
export function computeEan13CheckDigit(digits12: string): string {
  if (!/^\d{12}$/.test(digits12)) {
    throw new Error(`EAN-13 check digit requires exactly 12 digits, got "${digits12}"`);
  }
  const sum = digits12
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

/** Validate a complete EAN-13 (length, digits, check digit). */
export function isValidEan13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) {
    return false;
  }
  return computeEan13CheckDigit(ean.slice(0, 12)) === ean[12];
}

/**
 * Generate the next unique product EAN-13: "22" + 10-digit sequence + check digit.
 * Uniqueness is guaranteed by the atomic counter; the unique sparse index on
 * Product.ean acts as a safety net.
 */
export async function generateProductEan(): Promise<string> {
  const seq = await Counter.getNext(PRODUCT_EAN_COUNTER);
  if (seq > 9999999999) {
    throw new Error('Product EAN sequence exhausted (more than 10^10 products?)');
  }
  const body = EAN_INSTORE_PREFIX + String(seq).padStart(10, '0');
  return body + computeEan13CheckDigit(body);
}
