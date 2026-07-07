/**
 * @file storeMapAdminController.test.ts
 * @purpose Unit tests for admin store map endpoints (validation, batch updates, cache invalidation)
 * @created 2026-06-11
 */

import { Request, Response, NextFunction } from 'express';
import { getStoreMapAdmin, updateStoreMapPositions } from './storeMapAdminController';
import Mietfach from '../../models/Mietfach';
import { getActiveOccupancyMap } from '../../services/storeMapService';
import { invalidateCache } from '../../middleware/cacheMiddleware';

jest.mock('../../models/Mietfach', () => ({
  find: jest.fn(),
  bulkWrite: jest.fn()
}));
jest.mock('../../services/storeMapService', () => ({
  getActiveOccupancyMap: jest.fn()
}));
jest.mock('../../middleware/cacheMiddleware', () => ({
  invalidateCache: jest.fn()
}));

const VALID_ID = '507f1f77bcf86cd799439011';
const VALID_POSITION = { x: 1, y: 2, w: 1, d: 0.5, h: 2, rotation: 0 };

function mockResponse(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('getStoreMapAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all Mietfächer including unpositioned with occupancy info', async () => {
    (Mietfach.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'm1', bezeichnung: 'R1', typ: 'regal', position: VALID_POSITION },
        { _id: 'm2', bezeichnung: 'R2', typ: 'kuehl' }
      ])
    });
    (getActiveOccupancyMap as jest.Mock).mockResolvedValue(
      new Map([['m1', { kontakt: { name: 'Eva' }, vendorProfile: { unternehmen: 'Imkerei' } }]])
    );

    const res = mockResponse();
    const next = jest.fn();
    await getStoreMapAdmin({} as Request, res, next as unknown as NextFunction);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.mietfaecher).toHaveLength(2);
    expect(payload.mietfaecher[0]).toMatchObject({
      id: 'm1', belegt: true, vendorName: 'Imkerei', position: VALID_POSITION
    });
    expect(payload.mietfaecher[1]).toMatchObject({ id: 'm2', belegt: false, position: null });
  });
});

describe('updateStoreMapPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Mietfach.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
  });

  const call = async (body: any) => {
    const res = mockResponse();
    const next = jest.fn();
    await updateStoreMapPositions({ body } as Request, res, next as unknown as NextFunction);
    return res;
  };

  it('rejects empty or missing positions array with 400', async () => {
    let res = await call({});
    expect(res.status).toHaveBeenCalledWith(400);

    res = await call({ positions: [] });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Mietfach.bulkWrite).not.toHaveBeenCalled();
  });

  it('rejects invalid mietfachId with 400', async () => {
    const res = await call({ positions: [{ mietfachId: 'nicht-gültig', position: VALID_POSITION }] });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Mietfach.bulkWrite).not.toHaveBeenCalled();
  });

  it('rejects non-finite numbers and non-positive dimensions with 400', async () => {
    for (const bad of [
      { ...VALID_POSITION, x: NaN },
      { ...VALID_POSITION, w: 0 },
      { ...VALID_POSITION, d: -1 },
      { ...VALID_POSITION, h: 'hoch' },
      { ...VALID_POSITION, x: 1000 }
    ]) {
      const res = await call({ positions: [{ mietfachId: VALID_ID, position: bad }] });
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(Mietfach.bulkWrite).not.toHaveBeenCalled();
  });

  it('updates positions via bulkWrite with $set (whitelisted fields only)', async () => {
    const res = await call({
      positions: [{ mietfachId: VALID_ID, position: { ...VALID_POSITION, extra: 'feld' } }]
    });

    expect(Mietfach.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: VALID_ID },
          update: { $set: { position: VALID_POSITION } }
        }
      }
    ]);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('removes position via $unset when position is null', async () => {
    await call({ positions: [{ mietfachId: VALID_ID, position: null }] });

    expect(Mietfach.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: VALID_ID },
          update: { $unset: { position: '' } }
        }
      }
    ]);
  });

  it('invalidates the public store-map cache after saving', async () => {
    await call({ positions: [{ mietfachId: VALID_ID, position: VALID_POSITION }] });
    expect(invalidateCache).toHaveBeenCalledWith('/api/public/store-map');
  });
});
