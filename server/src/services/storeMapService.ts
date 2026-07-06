/**
 * @file storeMapService.ts
 * @purpose Public store map data: positioned Mietfächer with public-safe occupancy info
 * @created 2026-06-11
 */

import mongoose from 'mongoose';
import { IMietfachPosition } from '../types/modelTypes';

export interface StoreMapVendor {
  id: string;
  name: string;
  unternehmen: string;
  profilBild: string;
  tags: Array<{ name: string; color?: string; icon?: string }>;
}

export interface StoreMapEntry {
  id: string;
  bezeichnung: string;
  typ: string;
  position: IMietfachPosition;
  belegt: boolean;
  vendor: StoreMapVendor | null;
}

/**
 * Maps a populated user document to the public-safe vendor shape.
 * Strict whitelist: never expose prices, contracts, emails or other private data.
 */
function toPublicVendor(user: any): StoreMapVendor | null {
  if (!user || !user.isPubliclyVisible) {
    return null;
  }
  return {
    id: String(user._id),
    name: user.kontakt?.name || '',
    unternehmen: user.vendorProfile?.unternehmen || '',
    profilBild: user.vendorProfile?.profilBild || '',
    tags: (user.vendorProfile?.tags || [])
      .filter((tag: any) => tag && tag.name)
      .map((tag: any) => ({ name: tag.name, color: tag.color, icon: tag.icon }))
  };
}

/**
 * Checks whether a contract service occupies the Mietfach at the given time.
 * Services carry their own rental period (mietbeginn/mietende).
 */
function serviceActiveAt(service: any, now: Date): boolean {
  if (service.mietbeginn && new Date(service.mietbeginn) > now) {
    return false;
  }
  if (service.mietende && new Date(service.mietende) <= now) {
    return false;
  }
  return true;
}

/**
 * Resolves the current occupancy from active contracts.
 * @returns Map of mietfachId -> populated user of the currently active contract
 */
export async function getActiveOccupancyMap(now: Date = new Date()): Promise<Map<string, any>> {
  const Vertrag = mongoose.model('Vertrag');

  const vertraege: any[] = await Vertrag.find({
    status: 'active',
    'availabilityImpact.from': { $lte: now },
    $or: [{ 'availabilityImpact.to': { $gt: now } }, { 'availabilityImpact.to': null }]
  })
    .populate({
      path: 'user',
      select: 'kontakt.name vendorProfile.unternehmen vendorProfile.profilBild vendorProfile.tags isPubliclyVisible',
      populate: { path: 'vendorProfile.tags', select: 'name color icon' }
    })
    .lean();

  const occupancy = new Map<string, any>();
  for (const vertrag of vertraege) {
    for (const service of vertrag.services || []) {
      if (service.mietfach && serviceActiveAt(service, now)) {
        occupancy.set(String(service.mietfach), vertrag.user);
      }
    }
  }
  return occupancy;
}

/**
 * Returns all Mietfächer that have a physical position, each with its current
 * occupancy (vendor) resolved from active contracts.
 */
export async function getStoreMapData(now: Date = new Date()): Promise<StoreMapEntry[]> {
  const Mietfach = mongoose.model('Mietfach');

  const mietfaecher: any[] = await Mietfach.find({ position: { $exists: true } }).lean();
  if (mietfaecher.length === 0) {
    return [];
  }

  const occupancy = await getActiveOccupancyMap(now);

  return mietfaecher.map((mf) => {
    const key = String(mf._id);
    const belegt = occupancy.has(key);
    return {
      id: key,
      bezeichnung: mf.bezeichnung,
      typ: mf.typ,
      position: mf.position,
      belegt,
      vendor: belegt ? toPublicVendor(occupancy.get(key)) : null
    };
  });
}
