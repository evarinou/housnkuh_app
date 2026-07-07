/**
 * @file storeMapAdminController.ts
 * @purpose Admin endpoints for the store map position editor (list + batch position updates)
 * @created 2026-06-11
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';
import mongoose from 'mongoose';
import Mietfach from '../../models/Mietfach';
import { getActiveOccupancyMap } from '../../services/storeMapService';
import { invalidateCache } from '../../middleware/cacheMiddleware';

const MAX_COORD = 100; // Meter — Plausibilitätsgrenze für Ladenmaße

/**
 * Validates a single position payload. Returns an error message or null.
 */
function validatePosition(position: any): string | null {
  if (typeof position !== 'object' || position === null) {
    return 'position muss ein Objekt sein';
  }
  const numericFields = ['x', 'y', 'w', 'd', 'h', 'rotation'] as const;
  for (const field of numericFields) {
    const value = position[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `position.${field} muss eine endliche Zahl sein`;
    }
  }
  if (position.w <= 0 || position.d <= 0 || position.h <= 0) {
    return 'w, d und h müssen größer als 0 sein';
  }
  if (
    position.x < -MAX_COORD || position.x > MAX_COORD ||
    position.y < -MAX_COORD || position.y > MAX_COORD ||
    position.w > MAX_COORD || position.d > MAX_COORD || position.h > MAX_COORD
  ) {
    return `Koordinaten müssen zwischen -${MAX_COORD} und ${MAX_COORD} Metern liegen`;
  }
  return null;
}

/**
 * GET /api/admin/store-map
 * All Mietfächer (positioned and unpositioned) with occupancy info for the editor.
 */
export const getStoreMapAdmin = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [mietfaecher, occupancy] = await Promise.all([
      Mietfach.find().lean(),
      getActiveOccupancyMap()
    ]);

    const result = (mietfaecher as any[]).map((mf) => {
      const user = occupancy.get(String(mf._id));
      return {
        id: String(mf._id),
        bezeichnung: mf.bezeichnung,
        typ: mf.typ,
        beschreibung: mf.beschreibung,
        position: mf.position || null,
        belegt: !!user,
        vendorName: user ? user.vendorProfile?.unternehmen || user.kontakt?.name || '' : null
      };
    });

    res.json({ success: true, mietfaecher: result });
  } catch (err) {
    next(new AppError('Serverfehler beim Laden der Ladenkarte', 500, err));
  }
};

/**
 * PATCH /api/admin/store-map/positions
 * Batch update of Mietfach positions from the editor.
 * Body: { positions: [{ mietfachId, position: {x,y,w,d,h,rotation} | null }] }
 * position === null removes the Mietfach from the map ($unset).
 * Uses bulkWrite to bypass the post('save') FlourIO sync hook.
 */
export const updateStoreMapPositions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { positions } = req.body;

    if (!Array.isArray(positions) || positions.length === 0) {
      res.status(400).json({ success: false, message: 'positions muss ein nicht-leeres Array sein' });
      return;
    }

    const operations: any[] = [];
    for (const entry of positions) {
      if (!entry || !mongoose.Types.ObjectId.isValid(entry.mietfachId)) {
        res.status(400).json({ success: false, message: `Ungültige mietfachId: ${entry?.mietfachId}` });
        return;
      }
      if (entry.position === null) {
        operations.push({
          updateOne: {
            filter: { _id: entry.mietfachId },
            update: { $unset: { position: '' } }
          }
        });
        continue;
      }
      const error = validatePosition(entry.position);
      if (error) {
        res.status(400).json({ success: false, message: `${entry.mietfachId}: ${error}` });
        return;
      }
      const { x, y, w, d, h, rotation } = entry.position;
      operations.push({
        updateOne: {
          filter: { _id: entry.mietfachId },
          update: { $set: { position: { x, y, w, d, h, rotation } } }
        }
      });
    }

    const result = await Mietfach.bulkWrite(operations);

    // Public-Karte sofort aktualisieren (sonst bis zu 5 Minuten Cache-TTL)
    invalidateCache('/api/public/store-map');

    res.json({
      success: true,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Speichern der Positionen', 500, err));
  }
};
