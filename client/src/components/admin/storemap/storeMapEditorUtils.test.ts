/**
 * @file storeMapEditorUtils.test.ts
 * @purpose Tests for the pure editor geometry helpers
 * @created 2026-06-11
 */

import {
  snapToGrid,
  snapRotation,
  clampToFloor,
  getFloorBounds,
  defaultPosition
} from './storeMapEditorUtils';

const BOUNDS = { minX: 0, minY: 0, maxX: 10, maxY: 8 };
const basePos = { x: 1, y: 1, w: 1, d: 0.5, h: 2, rotation: 0 };

describe('snapToGrid', () => {
  it('snaps to 0.1m by default', () => {
    expect(snapToGrid(1.234)).toBe(1.2);
    expect(snapToGrid(1.25)).toBe(1.3);
    expect(snapToGrid(0.04)).toBe(0);
  });

  it('avoids floating point artifacts', () => {
    expect(snapToGrid(0.30000000000000004)).toBe(0.3);
  });

  it('supports custom grid size', () => {
    expect(snapToGrid(1.4, 0.5)).toBe(1.5);
  });
});

describe('snapRotation', () => {
  it('snaps to 15° steps', () => {
    expect(snapRotation(17)).toBe(15);
    expect(snapRotation(23)).toBe(30);
  });

  it('normalizes to [0, 360)', () => {
    expect(snapRotation(360)).toBe(0);
    expect(snapRotation(-15)).toBe(345);
    expect(snapRotation(375)).toBe(15);
  });
});

describe('clampToFloor', () => {
  it('keeps a valid position unchanged', () => {
    expect(clampToFloor(basePos, BOUNDS)).toEqual(basePos);
  });

  it('clamps positions outside the floor', () => {
    expect(clampToFloor({ ...basePos, x: -2, y: 100 }, BOUNDS)).toEqual({
      ...basePos,
      x: 0,
      y: 7.5 // maxY - d
    });
  });

  it('accounts for the item size at the far edge', () => {
    const clamped = clampToFloor({ ...basePos, x: 9.8 }, BOUNDS);
    expect(clamped.x).toBe(9); // maxX - w
  });

  it('shrinks items larger than the floor', () => {
    const clamped = clampToFloor({ ...basePos, w: 50 }, BOUNDS);
    expect(clamped.w).toBe(10);
    expect(clamped.x).toBe(0);
  });
});

describe('getFloorBounds', () => {
  it('computes the bounding box of a polygon', () => {
    expect(getFloorBounds([[1, 2], [5, 2], [5, 6], [1, 6]])).toEqual({
      minX: 1,
      minY: 2,
      maxX: 5,
      maxY: 6
    });
  });
});

describe('defaultPosition', () => {
  it('places a new item snapped near the store center', () => {
    const pos = defaultPosition(BOUNDS);
    expect(pos.x).toBe(4.5);
    expect(pos.y).toBe(3.8);
    expect(pos.w).toBe(1);
    expect(pos.h).toBe(2);
  });
});
