/**
 * @file invoiceGenerationService.provision.test.ts
 * @purpose Integrationstest der Provisions-Integration (F2c) in die Monatsrechnung:
 *          Provisionsposition wird ergänzt, Summen/USt korrekt neu berechnet,
 *          Verkäufe als provisioniert markiert. Miet-Berechnung wird gestubbt.
 */

// Mongo-Verbindung & Cleanup global aus tests/setup.ts.
import mongoose from 'mongoose';
import invoiceGenerationService from './invoiceGenerationService';
import { invoiceCalculationService } from './invoiceCalculationService';
import User from '../models/User';
import { VendorSale } from '../models/VendorSale';

const makeVendor = (provisionssatz: number): Promise<any> =>
  User.create({
    isVendor: true,
    isFullAccount: true,
    username: `vendor-${new mongoose.Types.ObjectId()}`,
    password: 'pw',
    kontakt: { name: 'Test Vendor', email: `v-${new mongoose.Types.ObjectId()}@x.de`, mailNewsletter: false, status: 'aktiv' },
    vendorProfile: { provisionssatz, modelltyp: provisionssatz === 7 ? 'Premium' : 'Basic', steuerstatus: 'kleinunternehmer' }
  } as any) as Promise<any>;

let n = 0;
const makeSale = (vendorId: mongoose.Types.ObjectId, netAmount: number) => {
  n++;
  return VendorSale.create({
    vendorId,
    flourioDocument: new mongoose.Types.ObjectId(),
    flourioDocumentFlourioId: `DOC-${n}`,
    lineIndex: n,
    flourioArticleId: `ART-${n}`,
    quantity: 1, unitPrice: netAmount, taxRate: 7,
    netAmount, grossAmount: netAmount,
    saleDate: new Date('2026-07-01'), currency: 'EUR'
  } as any);
};

describe('generateMonthlyInvoice – Provision (F2c)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('ergänzt die Provisionsposition und markiert die Verkäufe', async () => {
    const vendor = await makeVendor(7);
    await makeSale(vendor._id, 100);
    await makeSale(vendor._id, 200); // Netto-Umsatz 300 → Provision 7% = 21,00 €

    // Miete stubben: 50 € netto + 19% USt
    jest.spyOn(invoiceCalculationService, 'calculateInvoiceForPeriod').mockResolvedValue({
      items: [{ description: 'Mietfach', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
      subtotal: 50, tax: 9.5, totalAmount: 59.5
    } as any);

    const invoice: any = await invoiceGenerationService.generateMonthlyInvoice(String(vendor._id), 2026, 7);

    expect(invoice).not.toBeNull();
    const provItem = invoice.items.find((i: any) => i.type === 'provision');
    expect(provItem).toBeDefined();
    expect(provItem.unitPrice).toBe(21); // 300 × 7% = 21,00 €
    // Subtotal wird vom Invoice-Hook aus den Positionen gebildet: 50 (Miete) + 21.
    expect(invoice.subtotal).toBe(71);

    // Alle Verkäufe tragen jetzt die Rechnungs-Id als Provisions-Marker
    const sales = await VendorSale.find({ vendorId: vendor._id });
    expect(sales.every((s: any) => String(s.provisionInvoice) === String(invoice._id))).toBe(true);
  });

  it('erzeugt keine Provisionsposition ohne offene Verkäufe', async () => {
    const vendor = await makeVendor(4);
    jest.spyOn(invoiceCalculationService, 'calculateInvoiceForPeriod').mockResolvedValue({
      items: [{ description: 'Mietfach', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
      subtotal: 50, tax: 9.5, totalAmount: 59.5
    } as any);

    const invoice: any = await invoiceGenerationService.generateMonthlyInvoice(String(vendor._id), 2026, 7);
    expect(invoice.items.some((i: any) => i.type === 'provision')).toBe(false);
    expect(invoice.subtotal).toBe(50);
  });
});
