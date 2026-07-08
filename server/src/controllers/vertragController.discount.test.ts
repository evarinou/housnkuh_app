/**
 * @file vertragController.discount.test.ts
 * @purpose Sichert den BUG-DISCOUNT-TRUST-Fix: der Vertragsrabatt wird serverseitig
 *          aus der Laufzeit abgeleitet (10 % ab 12, 5 % ab 6 Monaten) — ein vom
 *          Client mitgeschickter packageData.discount wird ignoriert.
 * @created 2026-07-08
 */

import mongoose from 'mongoose';
import { createVertragFromPendingBooking } from './vertragController';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';

const makeVendor = () =>
  User.create({
    username: `vendor-${new mongoose.Types.ObjectId().toString().slice(-8)}`,
    password: 'Test1234!',
    isFullAccount: true,
    isVendor: true,
    registrationStatus: 'active',
    kontakt: {
      name: 'Test Vendor',
      email: `vendor-${new mongoose.Types.ObjectId()}@test.de`,
      mailNewsletter: false,
      status: 'aktiv'
    },
    adressen: []
  });

const makeMietfach = () =>
  Mietfach.create({
    bezeichnung: `MF-${new mongoose.Types.ObjectId().toString().slice(-6)}`,
    typ: 'regal',
    verfuegbar: true
  });

const makePackageData = (rentalDuration: number, clientDiscount?: number) => ({
  rentalDuration,
  ...(clientDiscount !== undefined && { discount: clientDiscount }),
  packageCounts: { 'block-a': 1 },
  packageOptions: [{ id: 'block-a', name: 'Regal Typ A', price: 35 }],
  totalCost: { monthly: 35, provision: 4 },
  selectedProvisionType: 'basic'
});

describe('createVertragFromPendingBooking – Rabatt (BUG-DISCOUNT-TRUST)', () => {
  it('ignoriert einen manipulierten Client-Discount (3 Monate → 0 %)', async () => {
    const vendor = await makeVendor();
    const mietfach = await makeMietfach();

    const result = await createVertragFromPendingBooking(
      String(vendor._id),
      makePackageData(3, 0.9), // Client behauptet 90 % Rabatt
      [String(mietfach._id)],
      undefined,
      new Date('2026-08-01')
    );

    expect(result.success).toBe(true);
    const vertrag = await Vertrag.findById(result.vertragId).lean();
    expect(vertrag).toBeTruthy();
    expect(vertrag!.discount).toBe(0); // Server-Staffel: < 6 Monate = kein Rabatt
    expect(vertrag!.totalMonthlyPrice).toBe(35); // voller Preis, kein 90%-Geschenk
  });

  it('leitet den Rabatt aus der Laufzeit ab (12 Monate → 10 %)', async () => {
    const vendor = await makeVendor();
    const mietfach = await makeMietfach();

    const result = await createVertragFromPendingBooking(
      String(vendor._id),
      makePackageData(12), // Client schickt gar keinen discount
      [String(mietfach._id)],
      undefined,
      new Date('2026-08-01')
    );

    expect(result.success).toBe(true);
    const vertrag = await Vertrag.findById(result.vertragId).lean();
    expect(vertrag!.discount).toBe(0.1);
    expect(vertrag!.totalMonthlyPrice).toBeCloseTo(31.5, 2); // 35 € − 10 %
  });
});
