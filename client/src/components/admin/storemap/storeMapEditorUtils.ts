/**
 * @file storeMapEditorUtils.ts
 * @purpose Pure geometry helpers for the 2D store map editor (snapping, clamping, bounds)
 * @created 2026-06-11
 */

import { MietfachPosition } from '../../storemap/types';
import { FLOOR_POLYGON } from '../../storemap/storeLayout';

export const GRID_SNAP = 0.1; // Meter
export const ROTATION_SNAP = 15; // Grad

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Achsenparallele Bounding-Box des Grundriss-Polygons */
export function getFloorBounds(polygon: Array<[number, number]> = FLOOR_POLYGON): FloorBounds {
  return {
    minX: Math.min(...polygon.map((p) => p[0])),
    minY: Math.min(...polygon.map((p) => p[1])),
    maxX: Math.max(...polygon.map((p) => p[0])),
    maxY: Math.max(...polygon.map((p) => p[1]))
  };
}

/** Rundet einen Wert auf das Raster (Standard 0,1 m) */
export function snapToGrid(value: number, grid: number = GRID_SNAP): number {
  // Gleitkomma-Artefakte vermeiden (0.30000000000000004 → 0.3)
  return Math.round(Math.round(value / grid) * grid * 1000) / 1000;
}

/** Rundet eine Drehung auf 15°-Schritte und normalisiert auf [0, 360) */
export function snapRotation(degrees: number, step: number = ROTATION_SNAP): number {
  const snapped = Math.round(degrees / step) * step;
  return ((snapped % 360) + 360) % 360;
}

/** Hält ein Fach innerhalb der Grundriss-Bounding-Box */
export function clampToFloor(
  position: MietfachPosition,
  bounds: FloorBounds = getFloorBounds()
): MietfachPosition {
  const w = Math.min(position.w, bounds.maxX - bounds.minX);
  const d = Math.min(position.d, bounds.maxY - bounds.minY);
  return {
    ...position,
    w,
    d,
    x: Math.min(Math.max(position.x, bounds.minX), bounds.maxX - w),
    y: Math.min(Math.max(position.y, bounds.minY), bounds.maxY - d)
  };
}

/** Standardposition für ein neu platziertes Fach: mittig im Laden */
export function defaultPosition(bounds: FloorBounds = getFloorBounds()): MietfachPosition {
  const w = 1;
  const d = 0.5;
  return clampToFloor({
    x: snapToGrid((bounds.minX + bounds.maxX) / 2 - w / 2),
    y: snapToGrid((bounds.minY + bounds.maxY) / 2 - d / 2),
    w,
    d,
    h: 2,
    rotation: 0
  });
}
