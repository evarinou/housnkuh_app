/**
 * @file vendorSaleProjectionService.test.ts
 * @purpose Sichert die kritischen Eigenschaften der Verkaufs-Ledger-Projektion:
 *          Vendor-Zuordnung auf Zeilenebene, Aufteilung gemischter Belege,
 *          Idempotenz und Erhalt der Abrechnungs-Zustände.
 */

// Mongo-Verbindung & Collection-Cleanup kommen global aus tests/setup.ts
// (setupFilesAfterEnv) — hier NICHT erneut verbinden.
import mongoose from 'mongoose';
import { FlourioDocument } from '../models/FlourioDocument';
import { Product } from '../models/Product';
import { VendorSale } from '../models/VendorSale';
import { VendorSaleProjectionService } from './vendorSaleProjectionService';

const vendorA = new mongoose.Types.ObjectId();
const vendorB = new mongoose.Types.ObjectId();

const makeProduct = (vendorId: mongoose.Types.ObjectId, articleId: string) =>
  Product.create({
    name: `Produkt ${articleId}`,
    description: `Testprodukt ${articleId}`,
    slug: `produkt-${articleId}-${vendorId}`,
    vendorId,
    price: 10,
    unit: 'piece',
    minQuantity: 1,
    seasonStart: new Date('2026-01-01'),
    seasonEnd: new Date('2026-12-31'),
    availability: 'available',
    flourioSync: { articleId }
  } as any);

const makeSalesDoc = (flourioId: string, items: any[]) =>
  FlourioDocument.create({
    flourioId,
    type: 'invoice',
    number: `RE-${flourioId}`,
    date: new Date('2026-07-01T10:00:00Z'),
    flourioBusinessPartnerId: 'customer-1',
    items,
    subtotal: 100,
    taxTotal: 7,
    total: 107,
    currency: 'EUR',
    status: 'paid',
    lastPulledAt: new Date(),
    flourioCreatedAt: new Date(),
    flourioUpdatedAt: new Date()
  } as any);

describe('VendorSaleProjectionService', () => {
  it('splittet einen gemischten Beleg pro Vendor und lässt unzuordenbare Zeilen aus', async () => {
    const pA = await makeProduct(vendorA, 'ART-A');
    const pB = await makeProduct(vendorB, 'ART-B');

    await makeSalesDoc('DOC-1', [
      { flourioArticleId: 'ART-A', productId: pA._id, quantity: 2, unitPrice: 10, taxRate: 7, total: 20 },
      { flourioArticleId: 'ART-B', productId: pB._id, quantity: 1, unitPrice: 30, taxRate: 7, total: 30 },
      // Zeile ohne productId → kein Vendor → wird übersprungen
      { flourioArticleId: 'ART-X', quantity: 1, unitPrice: 5, taxRate: 7, total: 5 }
    ]);

    const result = await VendorSaleProjectionService.project();

    expect(result.processedLines).toBe(3);
    expect(result.created).toBe(2);
    expect(result.skippedNoVendor).toBe(1);

    const salesA = await VendorSale.find({ vendorId: vendorA });
    const salesB = await VendorSale.find({ vendorId: vendorB });
    expect(salesA).toHaveLength(1);
    expect(salesB).toHaveLength(1);
    expect(salesA[0].netAmount).toBe(20);
    // Brutto = netto * 1,07
    expect(salesA[0].grossAmount).toBeCloseTo(21.4, 2);
    expect(salesA[0].lineIndex).toBe(0);
    expect(salesB[0].lineIndex).toBe(1);
  });

  it('ist idempotent und erhält gesetzte Abrechnungs-Zustände über Läufe hinweg', async () => {
    const pA = await makeProduct(vendorA, 'ART-A');
    await makeSalesDoc('DOC-1', [
      { flourioArticleId: 'ART-A', productId: pA._id, quantity: 2, unitPrice: 10, taxRate: 7, total: 20 }
    ]);

    const first = await VendorSaleProjectionService.project();
    expect(first.created).toBe(1);

    // Simuliere eine bereits erfolgte Abrechnung (Zustand 1)
    const invoiceId = new mongoose.Types.ObjectId();
    await VendorSale.updateOne(
      { vendorId: vendorA },
      { $set: { salesInvoice: invoiceId, salesInvoicedAt: new Date() } }
    );

    // Zweiter Lauf über denselben Beleg
    const second = await VendorSaleProjectionService.project();
    expect(second.created).toBe(0);

    const all = await VendorSale.find({});
    expect(all).toHaveLength(1);
    // Abrechnungs-Zustand darf NICHT überschrieben worden sein
    expect(String(all[0].salesInvoice)).toBe(String(invoiceId));
  });
});
