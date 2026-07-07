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

// Echter flour.io-Vertrag (2026-07-08 verifiziert): type 'R' = Kassenbon,
// Items mit netTotal/grossTotal (aus totalExVat/totalIncVat)
const makeSalesDoc = (flourioId: string, items: any[], overrides: any = {}) =>
  FlourioDocument.create({
    flourioId,
    type: 'R',
    number: `RE-${flourioId}`,
    date: new Date('2026-07-01T10:00:00Z'),
    flourioBusinessPartnerId: 'customer-1',
    items,
    netTotal: 100,
    grossTotal: 107,
    currency: 'EUR',
    lastPulledAt: new Date(),
    flourioCreatedAt: new Date(),
    flourioUpdatedAt: new Date(),
    ...overrides
  } as any);

describe('VendorSaleProjectionService', () => {
  it('splittet einen gemischten Beleg pro Vendor und lässt unzuordenbare Zeilen aus', async () => {
    const pA = await makeProduct(vendorA, 'ART-A');
    const pB = await makeProduct(vendorB, 'ART-B');

    await makeSalesDoc('DOC-1', [
      { flourioArticleId: 'ART-A', productId: pA._id, quantity: 2, unitPrice: 10, taxRate: 7, netTotal: 20, grossTotal: 21.4 },
      { flourioArticleId: 'ART-B', productId: pB._id, quantity: 1, unitPrice: 30, taxRate: 7, netTotal: 30, grossTotal: 32.1 },
      // Zeile ohne productId → kein Vendor → wird übersprungen
      { flourioArticleId: 'ART-X', quantity: 1, unitPrice: 5, taxRate: 7, netTotal: 5, grossTotal: 5.35 }
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
    // Brutto kommt exakt aus dem Beleg (totalIncVat), keine Berechnung
    expect(salesA[0].grossAmount).toBeCloseTo(21.4, 2);
    expect(salesA[0].lineIndex).toBe(0);
    expect(salesB[0].lineIndex).toBe(1);
  });

  it('ist idempotent und erhält gesetzte Abrechnungs-Zustände über Läufe hinweg', async () => {
    const pA = await makeProduct(vendorA, 'ART-A');
    await makeSalesDoc('DOC-1', [
      { flourioArticleId: 'ART-A', productId: pA._id, quantity: 2, unitPrice: 10, taxRate: 7, netTotal: 20, grossTotal: 21.4 }
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

  it('überspringt Belegabbrüche, Stornos, Gutschriften und stornierte Positionen', async () => {
    const pA = await makeProduct(vendorA, 'ART-A');
    const item = { flourioArticleId: 'ART-A', productId: pA._id, quantity: 1, unitPrice: 10, taxRate: 7, netTotal: 10, grossTotal: 10.7 };

    await makeSalesDoc('DOC-ABBRUCH', [item], { type: 'Belegabbruch' });
    await makeSalesDoc('DOC-VOIDED', [item], { isVoided: true });
    await makeSalesDoc('DOC-CREDIT', [item], { credit: true });
    await makeSalesDoc('DOC-CANCELLED-ITEM', [{ ...item, cancelled: true }]);
    await makeSalesDoc('DOC-OK', [item]);

    const result = await VendorSaleProjectionService.project();

    // Nur der reguläre Beleg wird abrechenbar; die stornierte Position
    // des vierten Belegs zählt weder als Ledger-Zeile noch als "ohne Vendor"
    expect(result.documents).toBe(2); // DOC-CANCELLED-ITEM + DOC-OK (Typ R, nicht storniert)
    expect(result.created).toBe(1);
    expect(result.skippedNoVendor).toBe(0);

    const sales = await VendorSale.find({});
    expect(sales).toHaveLength(1);
    expect(sales[0].flourioDocumentFlourioId).toBe('DOC-OK');
  });
});
