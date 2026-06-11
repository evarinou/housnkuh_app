/**
 * @file ean.test.ts
 * @purpose Tests for internal EAN-13 generation (check digit, format, uniqueness)
 */

import {
  computeEan13CheckDigit,
  isValidEan13,
  generateProductEan,
  EAN_INSTORE_PREFIX
} from './ean';
import Counter from '../models/Counter';

describe('computeEan13CheckDigit', () => {
  it('computes the correct check digit for known real-world EANs', () => {
    // 4006381333931 — Stabilo Boss (classic EAN-13 reference value)
    expect(computeEan13CheckDigit('400638133393')).toBe('1');
    // 4012345678901 — common GS1 example
    expect(computeEan13CheckDigit('401234567890')).toBe('1');
    // 2200000000019 — our own in-store range, seq 1 (sum 2·1 + 2·3 + 1·3 = 11 → check 9)
    expect(computeEan13CheckDigit('220000000001')).toBe('9');
  });

  it('rejects input that is not exactly 12 digits', () => {
    expect(() => computeEan13CheckDigit('12345')).toThrow();
    expect(() => computeEan13CheckDigit('1234567890123')).toThrow();
    expect(() => computeEan13CheckDigit('12345678901a')).toThrow();
  });
});

describe('isValidEan13', () => {
  it('accepts valid EAN-13 values', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('2200000000019')).toBe(true);
  });

  it('rejects wrong check digit, wrong length and non-digits', () => {
    expect(isValidEan13('4006381333930')).toBe(false);
    expect(isValidEan13('400638133393')).toBe(false);
    expect(isValidEan13('400638133393a')).toBe(false);
    expect(isValidEan13('')).toBe(false);
  });
});

describe('generateProductEan', () => {
  it('produces a valid EAN-13 with the in-store prefix', async () => {
    const ean = await generateProductEan();
    expect(ean).toMatch(/^22\d{11}$/);
    expect(ean.startsWith(EAN_INSTORE_PREFIX)).toBe(true);
    expect(isValidEan13(ean)).toBe(true);
  });

  it('generates strictly unique values under parallel load', async () => {
    const eans = await Promise.all(
      Array.from({ length: 50 }, () => generateProductEan())
    );
    expect(new Set(eans).size).toBe(50);
    eans.forEach(ean => expect(isValidEan13(ean)).toBe(true));
  });

  it('continues the sequence from the persisted counter', async () => {
    await Counter.getNext('productEan'); // ensure counter exists
    const before = await Counter.findById('productEan').lean();
    const ean = await generateProductEan();
    const expectedBody = '22' + String((before!.seq as number) + 1).padStart(10, '0');
    expect(ean.slice(0, 12)).toBe(expectedBody);
  });
});
