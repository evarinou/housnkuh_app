/**
 * @file businessPartnerSyncService.registration.test.ts
 * @purpose Sichert die Sync-Verdrahtung nach der Registrierung: Erfolg zählt als
 *          synced, ein flour.io-Fehler markiert den Vendor als 'error' (ohne die
 *          Registrierung zu beeinflussen) — Validierung wird gestubbt.
 */

import mongoose from 'mongoose';
import { BusinessPartnerSyncService } from './businessPartnerSyncService';
import { BusinessPartnerMapper } from './businessPartnerMapping';
import User from '../../../models/User';

const makeVendor = (): Promise<any> =>
  User.create({
    isVendor: true, isFullAccount: true,
    username: `v-${new mongoose.Types.ObjectId()}`, password: 'pw',
    kontakt: { name: 'Test Vendor', email: `${new mongoose.Types.ObjectId()}@x.de`, mailNewsletter: false, status: 'aktiv' },
    vendorProfile: { unternehmen: 'Hof Test' }
  } as any) as Promise<any>;

describe('BusinessPartnerSyncService.syncVendorsByIds (Registrierungs-Hook)', () => {
  beforeEach(() => {
    jest.spyOn(BusinessPartnerMapper, 'validateVendorForSync').mockReturnValue([]);
    jest.spyOn(BusinessPartnerMapper, 'hasVendorChanged').mockReturnValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  it('zählt einen erfolgreichen Sync', async () => {
    const vendor = await makeVendor();
    const bpService: any = { syncVendor: jest.fn().mockResolvedValue(undefined) };
    const svc = new BusinessPartnerSyncService(bpService);

    const result = await svc.syncVendorsByIds([String(vendor._id)]);

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(bpService.syncVendor).toHaveBeenCalledTimes(1);
  });

  it('markiert den Vendor bei flour.io-Fehler als error (ohne zu werfen)', async () => {
    const vendor = await makeVendor();
    const bpService: any = { syncVendor: jest.fn().mockRejectedValue(new Error('flour.io down')) };
    const svc = new BusinessPartnerSyncService(bpService);

    const result = await svc.syncVendorsByIds([String(vendor._id)]);

    expect(result.failed).toBe(1);
    const reloaded: any = await User.findById(vendor._id).lean();
    expect(reloaded.flourioSyncStatus).toBe('error');
    expect(reloaded.flourioSyncError).toBe('flour.io down');
  });
});
