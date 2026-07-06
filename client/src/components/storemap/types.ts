/**
 * @file types.ts
 * @purpose Shared client types for the interactive store map (3D view + admin editor)
 * @created 2026-06-11
 */

export type MietfachTyp = 'schaufenster' | 'kuehl' | 'gefrier' | 'regal' | 'sonstiges';

/** Physische Position im Laden, Meter, Ursprung = linke hintere Ecke */
export interface MietfachPosition {
  x: number;
  y: number; // Tiefenachse (im 3D = z)
  w: number;
  d: number;
  h: number;
  rotation: number; // Grad um die Hochachse
}

export interface StoreMapVendor {
  id: string;
  name: string;
  unternehmen: string;
  profilBild: string;
  tags: Array<{ name: string; color?: string; icon?: string }>;
}

export interface StoreMapMietfach {
  id: string;
  bezeichnung: string;
  typ: MietfachTyp;
  position: MietfachPosition;
  belegt: boolean;
  vendor: StoreMapVendor | null;
}
