/**
 * @file salesInvoiceService.test.ts
 * @purpose Sichert die kritischen Eigenschaften der Verkaufsrechnung (F2a):
 *          USt je Steuerstatus, eingefrorener Steuer-Snapshot, „genau einmal"
 *          (claim-first), Vendor-Trennung, Leerfall.
 */

// Mongo-Verbindung & Cleanup global aus tests/setup.ts.
import mongoose from 'mongoose';
import { VendorSale } from '../models/VendorSale';
import { SalesInvoice } from '../models/SalesInvoice';
import User from '../models/User';
import { SalesInvoiceService } from './salesInvoiceService';

const makeVendor = (steuerstatus: 'kleinunternehmer' | 'regelbesteuert'): Promise<any> =>
  User.create({
    isVendor: true,
    isFullAccount: true,
    username: `vendor-${new mongoose.Types.ObjectId()}`,
    password: 'hashed-test-pw',
    kontakt: { name: 'Test Vendor', email: `v-${new mongoose.Types.ObjectId()}@x.de`, mailNewsletter: false, status: 'aktiv' },
    vendorProfile: { steuerstatus, steuernummer: '231/123/12345', ustIdNr: 'DE123456789' }
  } as any) as Promise<any>;

let lineCounter = 0;
const makeSale = (vendorId: mongoose.Types.ObjectId, netAmount: number, taxRate: number) => {
  lineCounter++;
  return VendorSale.create({
    vendorId,
    flourioDocument: new mongoose.Types.ObjectId(),
    flourioDocumentFlourioId: `DOC-${lineCounter}`,
    lineIndex: lineCounter,
    flourioArticleId: `ART-${lineCounter}`,
    quantity: 1,
    unitPrice: netAmount,
    taxRate,
    netAmount,
    grossAmount: Math.round(netAmount * (1 + taxRate / 100) * 100) / 100,
    saleDate: new Date('2026-07-01T10:00:00Z'),
    currency: 'EUR'
  } as any);
};

describe('SalesInvoiceService.generateForVendor', () => {
  it('Kleinunternehmer: keine USt, Brutto = Netto, kein taxBreakdown', async () => {
    const vendor = await makeVendor('kleinunternehmer');
    await makeSale(vendor._id, 20, 7);
    await makeSale(vendor._id, 10, 7);

    const invoice: any = await SalesInvoiceService.generateForVendor(vendor._id);

    expect(invoice).not.toBeNull();
    expect(invoice.netTotal).toBe(30);
    expect(invoice.taxTotal).toBe(0);
    expect(invoice.grossTotal).toBe(30);
    expect(invoice.taxBreakdown).toHaveLength(0);
    expect(invoice.vendorTaxSnapshot.steuerstatus).toBe('kleinunternehmer');
    expect(invoice.invoiceNumber).toMatch(/^VK-2026-\d{5}$/);
    expect(invoice.items).toHaveLength(2);
  });

  it('Regelbesteuert: USt je Satz, Brutto = Netto + USt', async () => {
    const vendor = await makeVendor('regelbesteuert');
    await makeSale(vendor._id, 100, 7);  // 7 € USt
    await makeSale(vendor._id, 200, 19); // 38 € USt

    const invoice: any = await SalesInvoiceService.generateForVendor(vendor._id);

    expect(invoice.netTotal).toBe(300);
    expect(invoice.taxTotal).toBe(45);
    expect(invoice.grossTotal).toBe(345);
    expect(invoice.taxBreakdown.map((t: any) => ({ rate: t.rate, net: t.net, tax: t.tax }))).toEqual([
      { rate: 7, net: 100, tax: 7 },
      { rate: 19, net: 200, tax: 38 }
    ]);
  });

  it('rechnet jeden Verkauf genau einmal ab (claim-first)', async () => {
    const vendor = await makeVendor('kleinunternehmer');
    await makeSale(vendor._id, 20, 7);

    const first: any = await SalesInvoiceService.generateForVendor(vendor._id);
    expect(first).not.toBeNull();

    // Zweiter Lauf: nichts mehr offen
    const second = await SalesInvoiceService.generateForVendor(vendor._id);
    expect(second).toBeNull();

    // Genau eine Rechnung, Ledger-Zeile trägt deren Id
    const invoices = await SalesInvoice.find({ vendor: vendor._id });
    expect(invoices).toHaveLength(1);
    const sale: any = await VendorSale.findOne({ vendorId: vendor._id });
    expect(String(sale.salesInvoice)).toBe(String(first._id));
  });

  it('friert die Steuerdaten des Vendors zum Ausstellungszeitpunkt ein', async () => {
    const vendor = await makeVendor('kleinunternehmer');
    await makeSale(vendor._id, 20, 7);
    const invoice: any = await SalesInvoiceService.generateForVendor(vendor._id);

    // Vendor wechselt später den Steuerstatus
    await User.updateOne({ _id: vendor._id }, { $set: { 'vendorProfile.steuerstatus': 'regelbesteuert' } });

    const reloaded: any = await SalesInvoice.findById(invoice._id);
    expect(reloaded.vendorTaxSnapshot.steuerstatus).toBe('kleinunternehmer');
  });

  it('rechnet nur die Verkäufe des jeweiligen Vendors ab', async () => {
    const vendorA = await makeVendor('kleinunternehmer');
    const vendorB = await makeVendor('kleinunternehmer');
    await makeSale(vendorA._id, 20, 7);
    await makeSale(vendorB._id, 50, 7);

    const invoiceA: any = await SalesInvoiceService.generateForVendor(vendorA._id);
    expect(invoiceA.netTotal).toBe(20);

    // Vendor B bleibt offen
    const openB = await VendorSale.countDocuments({ vendorId: vendorB._id, salesInvoice: null });
    expect(openB).toBe(1);
  });

  it('gibt null zurück, wenn nichts abzurechnen ist', async () => {
    const vendor = await makeVendor('kleinunternehmer');
    const invoice = await SalesInvoiceService.generateForVendor(vendor._id);
    expect(invoice).toBeNull();
  });
});
