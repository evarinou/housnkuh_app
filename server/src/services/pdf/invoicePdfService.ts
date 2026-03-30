/**
 * @file invoicePdfService.ts
 * @purpose PDF generation service for invoices using puppeteer with professional layouts
 * @created 2025-09-03
 * @modified 2025-09-03
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice';
import { IUser } from '../../types/modelTypes';
import logger from '../../utils/logger';

export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface InvoiceData {
  invoice: any; // Invoice document
  vendor: IUser; // Populated vendor data
  companyInfo: {
    name: string;
    address: string;
    email: string;
    phone?: string;
    website?: string;
    taxId?: string;
    logo?: string;
  };
}

export interface PdfResult {
  buffer: Buffer;
  filename: string;
  path?: string;
}

class InvoicePdfService {
  private browser: Browser | null = null;
  private readonly storageDir = 'storage/invoices';

  /**
   * Initialize puppeteer browser instance
   * @private
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Close browser instance
   * @private
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate PDF for invoice
   * @param invoiceId - Invoice document ID
   * @param options - PDF generation options
   * @returns Promise<PdfResult>
   */
  async generateInvoicePdf(
    invoiceId: string | mongoose.Types.ObjectId,
    options: PdfGenerationOptions = {}
  ): Promise<PdfResult> {
    try {
      await this.initBrowser();

      // Fetch invoice with populated vendor data
      const invoiceData = await this.getInvoiceData(invoiceId);
      if (!invoiceData) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      // Generate HTML content
      const htmlContent = await this.generateHtmlContent(invoiceData);

      // Generate PDF
      const pdfBuffer = await this.htmlToPdf(htmlContent, options);

      // Generate filename
      const filename = this.generateFilename(invoiceData.invoice);

      // Store PDF if storage is enabled
      const storagePath = await this.storePdf(pdfBuffer, filename);

      return {
        buffer: pdfBuffer,
        filename,
        path: storagePath
      };
    } finally {
      // Clean up browser resources
      await this.closeBrowser();
    }
  }

  /**
   * Get invoice data with populated vendor information
   * @param invoiceId - Invoice ID
   * @returns Promise<InvoiceData | null>
   * @private
   */
  private async getInvoiceData(invoiceId: string | mongoose.Types.ObjectId): Promise<InvoiceData | null> {
    const invoice = await Invoice.findById(invoiceId).populate('vendor').lean();
    if (!invoice) {
      return null;
    }

    const vendor = invoice.vendor as unknown as IUser;
    if (!vendor) {
      throw new Error('Vendor data not found for invoice');
    }

    // Company information (can be configured via environment or database)
    const companyInfo = {
      name: process.env.COMPANY_NAME || 'housnkuh GmbH',
      address: process.env.COMPANY_ADDRESS || 'Musterstraße 1, 12345 Musterstadt',
      email: process.env.COMPANY_EMAIL || 'info@housnkuh.de',
      phone: process.env.COMPANY_PHONE || '+49 123 456 789',
      website: process.env.COMPANY_WEBSITE || 'www.housnkuh.de',
      taxId: process.env.COMPANY_TAX_ID || 'DE123456789',
      logo: process.env.COMPANY_LOGO_PATH
    };

    return {
      invoice,
      vendor,
      companyInfo
    };
  }

  /**
   * Generate HTML content for invoice
   * @param data - Invoice data
   * @returns Promise<string>
   * @private
   */
  private async generateHtmlContent(data: InvoiceData): Promise<string> {
    const { invoice, vendor, companyInfo } = data;
    
    // Get vendor address (prefer billing address, fallback to first address)
    const vendorAddress = vendor.adressen?.find(addr => 
      addr.adresstyp === 'Rechnungsadresse'
    ) || vendor.adressen?.[0];

    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(amount);

    const formatDate = (date: Date) => 
      new Intl.DateTimeFormat('de-DE').format(new Date(date));

    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${invoice.invoiceNumber}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 11pt;
                line-height: 1.4;
                color: #333;
            }
            
            .invoice {
                max-width: 210mm;
                margin: 0 auto;
                padding: 20mm;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
                border-bottom: 2px solid #2c5530;
                padding-bottom: 20px;
            }
            
            .company-info {
                flex: 1;
            }
            
            .company-logo {
                max-width: 150px;
                max-height: 80px;
                margin-bottom: 15px;
            }
            
            .company-name {
                font-size: 24pt;
                font-weight: bold;
                color: #2c5530;
                margin-bottom: 5px;
            }
            
            .company-details {
                font-size: 10pt;
                color: #666;
                line-height: 1.3;
            }
            
            .invoice-info {
                text-align: right;
                min-width: 200px;
            }
            
            .invoice-title {
                font-size: 28pt;
                font-weight: bold;
                color: #2c5530;
                margin-bottom: 10px;
            }
            
            .invoice-number {
                font-size: 14pt;
                font-weight: bold;
                margin-bottom: 15px;
            }
            
            .invoice-dates {
                font-size: 10pt;
                color: #666;
            }
            
            .addresses {
                display: flex;
                justify-content: space-between;
                margin: 40px 0;
            }
            
            .address-block {
                flex: 1;
                margin-right: 40px;
            }
            
            .address-block:last-child {
                margin-right: 0;
            }
            
            .address-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c5530;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            
            .address-content {
                font-size: 10pt;
                line-height: 1.4;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            
            .items-table th {
                background-color: #2c5530;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            
            .items-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #ddd;
            }
            
            .items-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            
            .text-right {
                text-align: right;
            }
            
            .totals {
                width: 300px;
                margin-left: auto;
                margin-top: 20px;
            }
            
            .totals table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .totals td {
                padding: 8px 12px;
                border-bottom: 1px solid #ddd;
            }
            
            .totals .total-row {
                font-weight: bold;
                background-color: #f5f5f5;
                border-top: 2px solid #2c5530;
            }
            
            .payment-terms {
                margin-top: 40px;
                padding: 20px;
                background-color: #f9f9f9;
                border-left: 4px solid #2c5530;
            }
            
            .payment-title {
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c5530;
            }
            
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 9pt;
                color: #666;
                text-align: center;
            }
            
            .period-info {
                background-color: #f0f8f0;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
                border-left: 4px solid #2c5530;
            }
            
            @media print {
                .invoice {
                    margin: 0;
                    padding: 15mm;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice">
            <div class="header">
                <div class="company-info">
                    ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo" class="company-logo">` : ''}
                    <div class="company-name">${companyInfo.name}</div>
                    <div class="company-details">
                        ${companyInfo.address}<br>
                        E-Mail: ${companyInfo.email}<br>
                        ${companyInfo.phone ? `Tel: ${companyInfo.phone}<br>` : ''}
                        ${companyInfo.website ? `Web: ${companyInfo.website}<br>` : ''}
                        ${companyInfo.taxId ? `USt-IdNr: ${companyInfo.taxId}` : ''}
                    </div>
                </div>
                <div class="invoice-info">
                    <div class="invoice-title">RECHNUNG</div>
                    <div class="invoice-number">${invoice.invoiceNumber}</div>
                    <div class="invoice-dates">
                        <div>Rechnungsdatum: ${formatDate(invoice.createdAt)}</div>
                        <div>Fälligkeitsdatum: ${formatDate(invoice.dueDate)}</div>
                    </div>
                </div>
            </div>
            
            <div class="period-info">
                <strong>Abrechnungszeitraum:</strong> 
                ${String(invoice.period.month).padStart(2, '0')}/${invoice.period.year}
            </div>
            
            <div class="addresses">
                <div class="address-block">
                    <div class="address-title">Rechnungsempfänger</div>
                    <div class="address-content">
                        ${vendor.vendorProfile?.unternehmen || vendor.kontakt.name}<br>
                        ${vendor.kontakt.name}<br>
                        ${vendorAddress ? `
                            ${vendorAddress.strasse} ${vendorAddress.hausnummer}<br>
                            ${vendorAddress.plz} ${vendorAddress.ort}<br>
                            ${vendorAddress.email ? `E-Mail: ${vendorAddress.email}<br>` : ''}
                            ${vendorAddress.telefon ? `Tel: ${vendorAddress.telefon}` : ''}
                        ` : 'Keine Adresse hinterlegt'}
                    </div>
                </div>
                <div class="address-block">
                    <div class="address-title">Rechnungssteller</div>
                    <div class="address-content">
                        ${companyInfo.name}<br>
                        ${companyInfo.address}<br>
                        E-Mail: ${companyInfo.email}<br>
                        ${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}
                    </div>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Pos.</th>
                        <th>Beschreibung</th>
                        <th>Zeitraum</th>
                        <th class="text-right">Menge</th>
                        <th class="text-right">Einzelpreis</th>
                        <th class="text-right">Gesamtpreis</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map((item: any, index: number) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>
                                ${item.description}
                                ${item.type === 'mietfach' ? '<br><small style="color: #666;">Mietfach</small>' : ''}
                                ${item.type === 'zusatzleistung' ? '<br><small style="color: #666;">Zusatzleistung</small>' : ''}
                                ${item.type === 'sonstiges' ? '<br><small style="color: #666;">Sonstiges</small>' : ''}
                            </td>
                            <td>
                                ${item.period?.from && item.period?.to 
                                    ? `${formatDate(item.period.from)} - ${formatDate(item.period.to)}`
                                    : '–'
                                }
                            </td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                            <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals">
                <table>
                    <tr>
                        <td>Zwischensumme (netto):</td>
                        <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
                    </tr>
                    <tr>
                        <td>Umsatzsteuer (${Math.round(invoice.tax * 100)}%):</td>
                        <td class="text-right">${formatCurrency(invoice.subtotal * invoice.tax)}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Gesamtbetrag (brutto):</strong></td>
                        <td class="text-right"><strong>${formatCurrency(invoice.totalAmount)}</strong></td>
                    </tr>
                </table>
            </div>
            
            <div class="payment-terms">
                <div class="payment-title">Zahlungsbedingungen</div>
                <div>
                    Der Rechnungsbetrag ist bis zum ${formatDate(invoice.dueDate)} 
                    ohne Abzug zur Zahlung fällig.<br>
                    Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9% über dem Basiszinssatz berechnet.
                </div>
            </div>
            
            <div class="footer">
                <div>
                    ${companyInfo.name} • ${companyInfo.address} • ${companyInfo.email}
                    ${companyInfo.taxId ? ` • USt-IdNr: ${companyInfo.taxId}` : ''}
                </div>
                <div style="margin-top: 10px; font-size: 8pt;">
                    Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.
                </div>
            </div>
        </div>
    </body>
    </html>`;

    return html;
  }

  /**
   * Convert HTML to PDF using puppeteer
   * @param html - HTML content
   * @param options - PDF options
   * @returns Promise<Buffer>
   * @private
   */
  private async htmlToPdf(html: string, options: PdfGenerationOptions): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page: Page = await this.browser.newPage();
    
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfOptions = {
        format: options.format || 'A4' as const,
        printBackground: options.printBackground !== false,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '15mm',
          left: '10mm',
          ...options.margin
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate filename for PDF
   * @param invoice - Invoice data
   * @returns string
   * @private
   */
  private generateFilename(invoice: any): string {
    const sanitizedNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    return `${sanitizedNumber}.pdf`;
  }

  /**
   * Store PDF to filesystem
   * @param buffer - PDF buffer
   * @param filename - PDF filename
   * @returns Promise<string | undefined>
   * @private
   */
  private async storePdf(buffer: Buffer, filename: string): Promise<string | undefined> {
    try {
      // Create directory structure: storage/invoices/YYYY/MM/
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      const fullPath = path.join(process.cwd(), this.storageDir, year, month);
      await fs.mkdir(fullPath, { recursive: true });
      
      const filePath = path.join(fullPath, filename);
      await fs.writeFile(filePath, buffer);
      
      // Return relative path
      return path.join(this.storageDir, year, month, filename);
    } catch (error) {
      logger.error('Failed to store PDF', { error });
      return undefined;
    }
  }

  /**
   * Generate PDF buffer only (no storage)
   * @param invoiceId - Invoice ID
   * @param options - PDF options
   * @returns Promise<Buffer>
   */
  async generatePdfBuffer(
    invoiceId: string | mongoose.Types.ObjectId,
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const result = await this.generateInvoicePdf(invoiceId, options);
    return result.buffer;
  }

  /**
   * Generate PDF as base64 string
   * @param invoiceId - Invoice ID
   * @param options - PDF options
   * @returns Promise<string>
   */
  async generatePdfBase64(
    invoiceId: string | mongoose.Types.ObjectId,
    options: PdfGenerationOptions = {}
  ): Promise<string> {
    const buffer = await this.generatePdfBuffer(invoiceId, options);
    return buffer.toString('base64');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}

export const invoicePdfService = new InvoicePdfService();
export default invoicePdfService;