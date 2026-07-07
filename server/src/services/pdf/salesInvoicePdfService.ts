/**
 * @file salesInvoicePdfService.ts
 * @purpose PDF-Erzeugung für Vendor-Verkaufsrechnungen (F2a, Gutschrift).
 * @created 2026-07-07
 *
 * Aussteller ist der Vendor (nicht housnkuh) — daher eigener Service statt des
 * housnkuh-invoicePdfService. Nutzt denselben Puppeteer-Ansatz. Ein Browser kann
 * von außen übergeben werden (Batch im 5-Min-Job), sonst wird er pro Aufruf
 * gestartet/geschlossen.
 */

import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import { promises as fs } from 'fs';
import mongoose from 'mongoose';
import { SalesInvoice } from '../../models/SalesInvoice';
import User from '../../models/User';
import logger from '../../utils/logger';

const PUPPETEER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
  '--single-process', '--disable-gpu'
];

const STORAGE_DIR = 'storage/sales-invoices';

const euro = (n: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const dt = (d: Date): string =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
const esc = (s: string): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export class SalesInvoicePdfService {
  /**
   * Erzeugt das PDF einer Verkaufsrechnung, legt es ab und setzt pdfPath.
   * @returns relativer Speicherpfad oder undefined bei Ablage-Fehler.
   */
  static async generate(
    salesInvoiceId: mongoose.Types.ObjectId | string,
    opts?: { browser?: Browser }
  ): Promise<string | undefined> {
    const invoice: any = await SalesInvoice.findById(salesInvoiceId).lean();
    if (!invoice) throw new Error(`SalesInvoice ${salesInvoiceId} nicht gefunden`);

    const vendor: any = await User.findById(invoice.vendor)
      .select('kontakt vendorProfile.unternehmen adressen')
      .lean();

    const html = SalesInvoicePdfService.buildHtml(invoice, vendor);

    // In Produktion/Kiosk kann ein System-Chromium via PUPPETEER_EXECUTABLE_PATH
    // gesetzt werden, statt sich auf das gebündelte Chrome zu verlassen (Deployment).
    const browser = opts?.browser ?? await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = Buffer.from(await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' }
      }));
      await page.close();

      const storagePath = await SalesInvoicePdfService.store(buffer, invoice);
      if (storagePath) {
        await SalesInvoice.updateOne({ _id: invoice._id }, { $set: { pdfPath: storagePath } });
      }
      return storagePath;
    } finally {
      if (!opts?.browser) await browser.close();
    }
  }

  private static async store(buffer: Buffer, invoice: any): Promise<string | undefined> {
    try {
      const issue = new Date(invoice.issueDate);
      const year = issue.getFullYear().toString();
      const month = (issue.getMonth() + 1).toString().padStart(2, '0');
      const fullPath = path.join(process.cwd(), STORAGE_DIR, year, month);
      await fs.mkdir(fullPath, { recursive: true });
      // Nummer ist nur pro Vendor eindeutig → Vendor-Kürzel in den Dateinamen.
      const num = String(invoice.invoiceNumber).replace(/[^a-zA-Z0-9-]/g, '_');
      const filename = `${String(invoice.vendor).slice(-6)}_${num}.pdf`;
      await fs.writeFile(path.join(fullPath, filename), buffer);
      return path.join(STORAGE_DIR, year, month, filename);
    } catch (error) {
      logger.error('[SalesInvoicePdf] Ablage fehlgeschlagen', { error });
      return undefined;
    }
  }

  /** Baut das Rechnungs-HTML (rein, ohne DB/Puppeteer) — öffentlich für Tests. */
  static buildHtml(invoice: any, vendor: any): string {
    const isKlein = invoice.vendorTaxSnapshot?.steuerstatus === 'kleinunternehmer';
    const issuerName = esc(vendor?.vendorProfile?.unternehmen || vendor?.kontakt?.name || 'Direktvermarkter');
    const addr = (vendor?.adressen && vendor.adressen[0]) || {};
    const issuerAddr = esc([
      [addr.strasse, addr.hausnummer].filter(Boolean).join(' '),
      [addr.plz, addr.ort].filter(Boolean).join(' ')
    ].filter(Boolean).join(', '));
    const tax = invoice.vendorTaxSnapshot || {};
    const taxLine = [
      tax.steuernummer ? `Steuernr.: ${esc(tax.steuernummer)}` : '',
      tax.ustIdNr ? `USt-IdNr.: ${esc(tax.ustIdNr)}` : ''
    ].filter(Boolean).join(' &middot; ');

    const rows = (invoice.items || []).map((it: any, idx: number) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${esc(it.description)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${euro(it.unitPrice)}</td>
        ${isKlein ? '' : `<td class="num">${it.taxRate} %</td>`}
        <td class="num">${euro(it.netAmount)}</td>
      </tr>`).join('');

    const taxRows = isKlein ? '' : (invoice.taxBreakdown || []).map((t: any) => `
      <tr><td colspan="2">zzgl. USt ${t.rate} % auf ${euro(t.net)}</td><td class="num">${euro(t.tax)}</td></tr>`).join('');

    const totalsBlock = isKlein
      ? `<tr class="grand"><td colspan="2">Gesamtbetrag</td><td class="num">${euro(invoice.grossTotal)}</td></tr>`
      : `<tr><td colspan="2">Zwischensumme (netto)</td><td class="num">${euro(invoice.netTotal)}</td></tr>
         ${taxRows}
         <tr class="grand"><td colspan="2">Gesamtbetrag (brutto)</td><td class="num">${euro(invoice.grossTotal)}</td></tr>`;

    const kleinNote = isKlein
      ? `<p class="note">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>`
      : '';

    const colCount = isKlein ? 5 : 6;

    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; font-size: 12px; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
      .issuer { font-size: 12px; line-height: 1.5; }
      .issuer .name { font-weight: 700; font-size: 15px; }
      .doc { text-align: right; }
      .doc .title { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
      .doc .meta { margin-top: 6px; line-height: 1.6; color: #444; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { padding: 7px 8px; text-align: left; }
      thead th { border-bottom: 2px solid #333; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
      tbody td { border-bottom: 1px solid #eee; }
      .num { text-align: right; white-space: nowrap; }
      .totals { margin-top: 14px; width: 55%; margin-left: auto; }
      .totals td { border: none; padding: 5px 8px; }
      .totals .grand td { border-top: 2px solid #333; font-weight: 700; font-size: 14px; }
      .note { margin-top: 22px; color: #555; }
      .gutschrift-hint { margin-top: 34px; color: #888; font-size: 10px; border-top: 1px solid #eee; padding-top: 8px; }
    </style></head><body>
      <div class="head">
        <div class="issuer">
          <div class="name">${issuerName}</div>
          <div>${issuerAddr}</div>
          ${taxLine ? `<div>${taxLine}</div>` : ''}
        </div>
        <div class="doc">
          <div class="title">Gutschrift</div>
          <div class="meta">
            <div>Nr. ${esc(invoice.invoiceNumber)}</div>
            <div>Datum: ${dt(invoice.issueDate)}</div>
            <div>Zeitraum: ${dt(invoice.salePeriod.from)} – ${dt(invoice.salePeriod.to)}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="num">Pos.</th>
            <th>Bezeichnung</th>
            <th class="num">Menge</th>
            <th class="num">Einzel (netto)</th>
            ${isKlein ? '' : '<th class="num">USt</th>'}
            <th class="num">Netto</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${colCount}">Keine Positionen</td></tr>`}</tbody>
      </table>

      <table class="totals">${totalsBlock}</table>
      ${kleinNote}
      <p class="gutschrift-hint">Diese Gutschrift wird von housnkuh im Namen und für Rechnung des oben genannten Direktvermarkters ausgestellt (Gutschriftsverfahren gemäß § 14 Abs. 2 UStG).</p>
    </body></html>`;
  }
}

export default SalesInvoicePdfService;
