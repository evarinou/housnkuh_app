/**
 * @file storeLayout.ts
 * @purpose Static store footprint and color configuration for the 3D map and the admin editor.
 *          Single source of truth — derived once from the 3D scan (3d mesh/11.6.2026.glb).
 * @created 2026-06-11
 */

import { MietfachTyp } from './types';

/**
 * Grundriss-Umriss in Metern, gegen den Uhrzeigersinn, Ursprung = linke hintere Ecke.
 * TODO(Scan-Kalibrierung): Werte sind ein grobes Rechteck als Platzhalter —
 * nach dem Blender-Top-Down-Export anhand eines realen Maßes (z. B. Türbreite) verfeinern.
 */
export const FLOOR_POLYGON: Array<[number, number]> = [
  [0, 0],
  [10, 0],
  [10, 8],
  [0, 8]
];

export const WALL_HEIGHT = 3; // Meter
export const WALL_THICKNESS = 0.15; // Meter

/** Türöffnung als Segment auf dem Grundriss-Umriss (Bodenmarkierung) */
export const DOOR: { from: [number, number]; to: [number, number] } = {
  from: [4.5, 8],
  to: [5.5, 8]
};

/** Mitte des Ladens — Kamera-Target für die 3D-Ansicht */
export const STORE_CENTER: [number, number] = [
  FLOOR_POLYGON.reduce((s, p) => s + p[0], 0) / FLOOR_POLYGON.length,
  FLOOR_POLYGON.reduce((s, p) => s + p[1], 0) / FLOOR_POLYGON.length
];

/** Farben pro Mietfach-Typ (frei) und Belegt-Variante, abgestimmt auf primary/secondary */
export const TYP_COLORS: Record<MietfachTyp, { frei: string; belegt: string; label: string }> = {
  regal: { frei: '#d8c3a5', belegt: '#b08968', label: 'Regal' },
  kuehl: { frei: '#bcd8e8', belegt: '#5c9ec7', label: 'Kühlregal' },
  gefrier: { frei: '#cfe7f0', belegt: '#3a7ca5', label: 'Gefrierfach' },
  schaufenster: { frei: '#f3d9a4', belegt: '#e0a93e', label: 'Schaufenster' },
  sonstiges: { frei: '#d9d9d9', belegt: '#9a9a9a', label: 'Sonstiges' }
};

export const FLOOR_COLOR = '#f5f0e8';
export const WALL_COLOR = '#e8e2d6';
export const HIGHLIGHT_COLOR = '#e17564'; // housnkuh primary
export const SELECTED_EMISSIVE = '#e17564';
