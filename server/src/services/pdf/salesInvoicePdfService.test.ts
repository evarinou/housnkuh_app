/**
 * @file salesInvoicePdfService.test.ts
 * @purpose Sichert die inhaltliche Verzweigung des Verkaufsrechnungs-HTML
 *          (Kleinunternehmer §19 vs. Regelbesteuerung mit USt-Aufschlüsselung).
 *          Reine HTML-Logik, ohne Puppeteer/DB.
 */

import { SalesInvoicePdfService } from './salesInvoicePdfService';

const vendor = {
  kontakt: { name: 'Hof Müller' },
  vendorProfile: { unternehmen: 'Hof Müller GbR' },
  adressen: [{ strasse: 'Dorfstr.', hausnummer: '3', plz: '96317', ort: 'Kronach' }]
};

const baseInvoice = {
  invoiceNumber: 'VK-2026-00001',
  issueDate: new Date('2026-07-07T10:00:00Z'),
  salePeriod: { from: new Date('2026-07-01'), to: new Date('2026-07-07') },
  items: [
    { description: 'Bio-Apfelsaft', quantity: 2, unitPrice: 3.5, taxRate: 7, netAmount: 7, grossAmount: 7.49 }
  ]
};

describe('SalesInvoicePdfService.buildHtml', () => {
  it('Kleinunternehmer: §19-Hinweis, keine USt-Zeile', () => {
    const html = SalesInvoicePdfService.buildHtml({
      ...baseInvoice,
      vendorTaxSnapshot: { steuerstatus: 'kleinunternehmer', steuernummer: '231/123/12345' },
      netTotal: 7, taxTotal: 0, grossTotal: 7, taxBreakdown: []
    }, vendor);

    expect(html).toContain('§ 19 UStG');
    expect(html).toContain('Hof Müller GbR');
    expect(html).toContain('VK-2026-00001');
    expect(html).toContain('Steuernr.: 231/123/12345');
    expect(html).not.toContain('zzgl. USt');
    // Gutschrift-Hinweis immer vorhanden
    expect(html).toContain('§ 14 Abs. 2 UStG');
  });

  it('Regelbesteuert: USt-Aufschlüsselung, kein §19-Hinweis', () => {
    const html = SalesInvoicePdfService.buildHtml({
      ...baseInvoice,
      vendorTaxSnapshot: { steuerstatus: 'regelbesteuert', ustIdNr: 'DE123456789' },
      netTotal: 7, taxTotal: 0.49, grossTotal: 7.49,
      taxBreakdown: [{ rate: 7, net: 7, tax: 0.49 }]
    }, vendor);

    expect(html).toContain('zzgl. USt 7 %');
    expect(html).toContain('USt-IdNr.: DE123456789');
    expect(html).toContain('brutto');
    expect(html).not.toContain('§ 19 UStG');
  });
});
