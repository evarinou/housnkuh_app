/**
 * @file vendorSalesInvoiceController.test.ts
 * @purpose Sichert Ownership-Filter der Verkaufsrechnungs-Liste und die
 *          Reporting-Aggregation (F3). Mongo/Cleanup global aus tests/setup.ts.
 */

import mongoose from 'mongoose';
import { SalesInvoice } from '../../models/SalesInvoice';
import { VendorSale } from '../../models/VendorSale';
import {
  getVendorSalesInvoices,
  getVendorSalesReport
} from './vendorSalesInvoiceController';

const vendorA = new mongoose.Types.ObjectId();
const vendorB = new mongoose.Types.ObjectId();

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeInvoice = (vendor: mongoose.Types.ObjectId, number: string) =>
  SalesInvoice.create({
    vendor, invoiceNumber: number, issueDate: new Date('2026-07-07'),
    salePeriod: { from: new Date('2026-07-01'), to: new Date('2026-07-07') },
    items: [{ vendorSale: new mongoose.Types.ObjectId(), description: 'X', quantity: 1, unitPrice: 10, taxRate: 7, netAmount: 10, grossAmount: 10.7, saleDate: new Date('2026-07-01') }],
    vendorTaxSnapshot: { steuerstatus: 'kleinunternehmer' },
    netTotal: 10, taxTotal: 0, grossTotal: 10, taxBreakdown: []
  } as any);

let n = 0;
const makeSale = (vendorId: mongoose.Types.ObjectId, net: number, saleDate: Date) => {
  n++;
  return VendorSale.create({
    vendorId, flourioDocument: new mongoose.Types.ObjectId(), flourioDocumentFlourioId: `D${n}`,
    lineIndex: n, flourioArticleId: `A${n}`, quantity: 1, unitPrice: net, taxRate: 7,
    netAmount: net, grossAmount: Math.round(net * 1.07 * 100) / 100, saleDate, currency: 'EUR'
  } as any);
};

describe('vendorSalesInvoiceController', () => {
  it('getVendorSalesInvoices liefert nur die Rechnungen des eingeloggten Vendors', async () => {
    await makeInvoice(vendorA, 'VK-2026-00001');
    await makeInvoice(vendorA, 'VK-2026-00002');
    await makeInvoice(vendorB, 'VK-2026-00001');

    const req: any = { user: { id: String(vendorA) }, query: {} };
    const res = mockRes();
    await getVendorSalesInvoices(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.pagination.total).toBe(2);
    expect(payload.data.invoices).toHaveLength(2);
    expect(payload.data.invoices.every((i: any) => String(i.vendor) === String(vendorA))).toBe(true);
  });

  it('getVendorSalesReport aggregiert Summen und Monatsverlauf des Vendors', async () => {
    await makeSale(vendorA, 100, new Date('2026-07-10'));
    await makeSale(vendorA, 200, new Date('2026-08-05'));
    await makeSale(vendorB, 999, new Date('2026-07-10')); // fremd → darf nicht zählen

    const req: any = { user: { id: String(vendorA) }, query: {} };
    const res = mockRes();
    await getVendorSalesReport(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.totals.net).toBe(300);
    expect(payload.data.totals.count).toBe(2);
    expect(payload.data.byMonth).toEqual([
      expect.objectContaining({ period: '2026-07', net: 100 }),
      expect.objectContaining({ period: '2026-08', net: 200 })
    ]);
  });

  it('getVendorSalesInvoices lehnt ohne Auth ab', async () => {
    const req: any = { query: {} };
    const res = mockRes();
    await getVendorSalesInvoices(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
