/**
 * @file uuidStub.ts
 * @purpose CJS-kompatibler Jest-Ersatz für das ESM-only uuid-Paket (v13+)
 *
 * uuid ≥ 13 liefert nur noch ESM; ts-jest im CJS-Modus kann es nicht laden.
 * Dieser Stub bildet die im Code genutzte v4-API über node:crypto ab
 * (gemappt via moduleNameMapper in jest.config.js).
 */

import { randomUUID } from 'crypto';

export const v4 = (): string => randomUUID();
export default { v4 };
