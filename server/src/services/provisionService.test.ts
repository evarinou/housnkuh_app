/**
 * @file provisionService.test.ts
 * @purpose Sichert die claim-first-Provisionsermittlung (F2c): Netto-Bemessung,
 *          „genau einmal", Rollback und Unabhängigkeit vom F2a-Zustand.
 */

// Mongo-Verbindung & Cleanup global aus tests/setup.ts.
import mongoose from 'mongoose';
import { VendorSale } from '../models/VendorSale';
import { ProvisionService } from './provisionService';

const vendorId = new mongoose.Types.ObjectId();

let n = 0;
const makeSale = (netAmount: number, extra: Record<string, unknown> = {}) => {
  n++;
  return VendorSale.create({
    vendorId,
    flourioDocument: new mongoose.Types.ObjectId(),
    flourioDocumentFlourioId: `DOC-${n}`,
    lineIndex: n,
    flourioArticleId: `ART-${n}`,
    quantity: 1,
    unitPrice: netAmount,
    taxRate: 7,
    netAmount,
    grossAmount: netAmount,
    saleDate: new Date('2026-07-01'),
    currency: 'EUR',
    ...extra
  } as any);
};

describe('ProvisionService', () => {
  it('claimt offene Verkäufe und summiert die Netto-Bemessung', async () => {
    await makeSale(100);
    await makeSale(50);
    const invoiceId = new mongoose.Types.ObjectId();

    const { base, count } = await ProvisionService.claimForInvoice(vendorId, invoiceId, '2026-07');

    expect(base).toBe(150);
    expect(count).toBe(2);
    const claimed = await VendorSale.countDocuments({ provisionInvoice: invoiceId });
    expect(claimed).toBe(2);
  });

  it('zählt jeden Verkauf nur einmal (claim-first)', async () => {
    await makeSale(100);
    const first = await ProvisionService.claimForInvoice(vendorId, new mongoose.Types.ObjectId(), '2026-07');
    expect(first.base).toBe(100);

    // Zweiter Lauf: nichts mehr offen
    const second = await ProvisionService.claimForInvoice(vendorId, new mongoose.Types.ObjectId(), '2026-08');
    expect(second.base).toBe(0);
    expect(second.count).toBe(0);
  });

  it('gibt die Reservierung per releaseClaim wieder frei', async () => {
    await makeSale(80);
    const invoiceId = new mongoose.Types.ObjectId();
    await ProvisionService.claimForInvoice(vendorId, invoiceId, '2026-07');

    await ProvisionService.releaseClaim(invoiceId);

    const open = await VendorSale.countDocuments({ vendorId, provisionInvoice: null });
    expect(open).toBe(1);
  });

  it('ist unabhängig vom F2a-Verkaufsrechnungs-Zustand', async () => {
    // Verkauf bereits in einer Verkaufsrechnung (F2a), aber noch nicht provisioniert
    const salesInvoiceId = new mongoose.Types.ObjectId();
    await makeSale(200, { salesInvoice: salesInvoiceId, salesInvoicedAt: new Date() });

    const { base } = await ProvisionService.claimForInvoice(vendorId, new mongoose.Types.ObjectId(), '2026-07');
    expect(base).toBe(200); // Provision greift trotzdem
  });
});
