/**
 * @file storeMapService.test.ts
 * @purpose Unit tests for the public store map service (occupancy mapping + field whitelist)
 * @created 2026-06-11
 */

import mongoose from 'mongoose';
import { getStoreMapData } from './storeMapService';

jest.mock('mongoose');

describe('getStoreMapData', () => {
  const now = new Date('2026-06-11T12:00:00Z');

  let mockMietfach: any;
  let mockVertrag: any;

  const mietfachDoc = (id: string, overrides: any = {}) => ({
    _id: id,
    bezeichnung: `Fach ${id}`,
    typ: 'regal',
    position: { x: 1, y: 2, w: 1, d: 0.5, h: 2, rotation: 0 },
    // private fields that must NEVER leak
    standort: 'intern',
    flourioWarehouseId: 'wh-123',
    ...overrides
  });

  const vendorUser = (id: string, overrides: any = {}) => ({
    _id: id,
    isPubliclyVisible: true,
    kontakt: { name: 'Eva Muster', email: 'privat@example.com' },
    vendorProfile: {
      unternehmen: 'Imkerei Muster',
      profilBild: '/uploads/bild.jpg',
      tags: [{ name: 'Honig', color: '#fc0', icon: '🍯' }]
    },
    ...overrides
  });

  const vertragDoc = (mietfachId: string, user: any, serviceOverrides: any = {}) => ({
    _id: `vertrag-${mietfachId}`,
    user,
    status: 'active',
    monatspreis: 49,
    provisionssatz: 4,
    services: [
      {
        mietfach: mietfachId,
        mietbeginn: new Date('2026-01-01'),
        monatspreis: 49,
        ...serviceOverrides
      }
    ]
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMietfach = { find: jest.fn() };
    mockVertrag = { find: jest.fn() };
    (mongoose.model as jest.Mock).mockImplementation((name: string) => {
      if (name === 'Mietfach') return mockMietfach;
      if (name === 'Vertrag') return mockVertrag;
      throw new Error(`Unknown model: ${name}`);
    });
  });

  const setupMocks = (mietfaecher: any[], vertraege: any[]) => {
    mockMietfach.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(mietfaecher) });
    mockVertrag.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(vertraege) })
    });
  };

  it('returns only Mietfächer with position (query filter)', async () => {
    setupMocks([mietfachDoc('m1')], []);
    await getStoreMapData(now);
    expect(mockMietfach.find).toHaveBeenCalledWith({ position: { $exists: true } });
  });

  it('returns empty array without querying contracts when nothing is positioned', async () => {
    setupMocks([], []);
    const result = await getStoreMapData(now);
    expect(result).toEqual([]);
    expect(mockVertrag.find).not.toHaveBeenCalled();
  });

  it('maps active contract to vendor on the right Mietfach', async () => {
    setupMocks(
      [mietfachDoc('m1'), mietfachDoc('m2')],
      [vertragDoc('m1', vendorUser('u1'))]
    );

    const result = await getStoreMapData(now);

    const m1 = result.find((e) => e.id === 'm1')!;
    const m2 = result.find((e) => e.id === 'm2')!;
    expect(m1.belegt).toBe(true);
    expect(m1.vendor).toEqual({
      id: 'u1',
      name: 'Eva Muster',
      unternehmen: 'Imkerei Muster',
      profilBild: '/uploads/bild.jpg',
      tags: [{ name: 'Honig', color: '#fc0', icon: '🍯' }]
    });
    expect(m2.belegt).toBe(false);
    expect(m2.vendor).toBeNull();
  });

  it('ignores services whose own period has ended', async () => {
    setupMocks(
      [mietfachDoc('m1')],
      [vertragDoc('m1', vendorUser('u1'), { mietende: new Date('2026-05-01') })]
    );

    const result = await getStoreMapData(now);
    expect(result[0].belegt).toBe(false);
    expect(result[0].vendor).toBeNull();
  });

  it('marks belegt but hides vendor when not publicly visible', async () => {
    setupMocks(
      [mietfachDoc('m1')],
      [vertragDoc('m1', vendorUser('u1', { isPubliclyVisible: false }))]
    );

    const result = await getStoreMapData(now);
    expect(result[0].belegt).toBe(true);
    expect(result[0].vendor).toBeNull();
  });

  it('NEVER leaks private fields (whitelist regression test)', async () => {
    setupMocks(
      [mietfachDoc('m1')],
      [vertragDoc('m1', vendorUser('u1'))]
    );

    const result = await getStoreMapData(now);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('monatspreis');
    expect(serialized).not.toContain('49');
    expect(serialized).not.toContain('provisionssatz');
    expect(serialized).not.toContain('privat@example.com');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('vertrag-');
    expect(serialized).not.toContain('flourio');
    expect(serialized).not.toContain('intern'); // standort

    // entry shape is exactly the whitelist
    expect(Object.keys(result[0]).sort()).toEqual(
      ['belegt', 'bezeichnung', 'id', 'position', 'typ', 'vendor'].sort()
    );
    expect(Object.keys(result[0].vendor!).sort()).toEqual(
      ['id', 'name', 'profilBild', 'tags', 'unternehmen'].sort()
    );
  });

  it('queries only active contracts covering the current date', async () => {
    setupMocks([mietfachDoc('m1')], []);
    await getStoreMapData(now);

    expect(mockVertrag.find).toHaveBeenCalledWith({
      status: 'active',
      'availabilityImpact.from': { $lte: now },
      $or: [{ 'availabilityImpact.to': { $gt: now } }, { 'availabilityImpact.to': null }]
    });
  });
});
