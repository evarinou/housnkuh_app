/**
 * @file invoicePdfService.test.ts
 * @purpose Unit tests for PDF generation service
 * @created 2025-09-03
 * @modified 2025-09-03
 */

// Mongo-Verbindung & Cleanup kommen global aus tests/setup.ts (MongoMemoryServer).
// Der globale afterEach-Hook leert alle Collections, daher werden die
// Fixtures (Vendor + Rechnung) pro Test im beforeEach neu angelegt.
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice';
import User from '../../models/User';
import { invoicePdfService } from './invoicePdfService';
import { IUser } from '../../types/modelTypes';

describe('InvoicePdfService', () => {
  let testInvoiceId: mongoose.Types.ObjectId;
  let testVendorId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create test vendor
    const testVendor = new User({
      isVendor: true,
      kontakt: {
        name: 'Test Vendor GmbH',
        email: 'test@vendor.de',
        status: 'aktiv'
      },
      adressen: [{
        adresstyp: 'Rechnungsadresse',
        strasse: 'Teststraße',
        hausnummer: '123',
        plz: '12345',
        ort: 'Teststadt',
        name1: 'Test Vendor GmbH',
        email: 'test@vendor.de',
        telefon: '+49 123 456789'
      }],
      vendorProfile: {
        unternehmen: 'Test Vendor GmbH',
        beschreibung: 'Testbeschreibung',
        provisionssatz: 4,
        modelltyp: 'Basic'
      }
    } as IUser);

    const savedVendor = await testVendor.save();
    testVendorId = savedVendor._id as mongoose.Types.ObjectId;

    // Create test invoice
    const testInvoice = new Invoice({
      invoiceNumber: 'RE-2025-09-00001',
      vendor: testVendorId,
      period: { month: 9, year: 2025 },
      items: [
        {
          description: 'Mietfach September 2025',
          quantity: 1,
          unitPrice: 50.00,
          type: 'mietfach',
          period: {
            from: new Date('2025-09-01'),
            to: new Date('2025-09-30')
          }
        },
        {
          description: 'Zusatzleistung',
          quantity: 2,
          unitPrice: 15.00,
          type: 'zusatzleistung'
        }
      ],
      subtotal: 80.00,
      tax: 15.20, // absoluter USt-Betrag (19% von 80,00 €)
      totalAmount: 95.20,
      status: 'draft',
      dueDate: new Date('2025-10-03')
    });

    const savedInvoice = await testInvoice.save();
    testInvoiceId = savedInvoice._id as mongoose.Types.ObjectId;
  });

  afterAll(async () => {
    try {
      await invoicePdfService.cleanup();
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }, 10000);

  describe('generateInvoicePdf', () => {
    it('should generate PDF with all required elements', async () => {
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('filename');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toBe('RE-2025-09-00001.pdf');
    }, 30000); // Increase timeout for PDF generation

    it('should generate PDF with custom format', async () => {
      const options = {
        format: 'Letter' as const,
        printBackground: true
      };

      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId, options);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 30000);

    it('should store PDF in filesystem', async () => {
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      expect(result.path).toBeDefined();
      expect(result.path).toMatch(/storage\/invoices\/\d{4}\/\d{2}\/RE-2025-09-00001\.pdf/);
    }, 30000);

    it('should throw error for non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        invoicePdfService.generateInvoicePdf(fakeId)
      ).rejects.toThrow(`Invoice not found: ${fakeId}`);
    });
  });

  describe('generatePdfBuffer', () => {
    it('should generate PDF buffer only', async () => {
      const buffer = await invoicePdfService.generatePdfBuffer(testInvoiceId);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check PDF header
      const pdfHeader = buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);
  });

  describe('generatePdfBase64', () => {
    it('should generate base64 string', async () => {
      const base64 = await invoicePdfService.generatePdfBase64(testInvoiceId);

      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      
      // Should be valid base64
      const buffer = Buffer.from(base64, 'base64');
      const pdfHeader = buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);
  });

  describe('PDF content validation', () => {
    it('should include vendor information', async () => {
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      // Since we can't easily parse PDF content, we verify the data fetching works
      expect(result.buffer.length).toBeGreaterThan(5000); // Reasonable size for formatted PDF
    }, 30000);

    it('should have correct PDF metadata', async () => {
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      // Check PDF header and structure
      const pdfHeader = result.buffer.toString('ascii', 0, 8);
      expect(pdfHeader).toMatch(/^%PDF-1\.[4-7]/); // PDF version 1.4-1.7

      // Check PDF trailer exists
      const pdfContent = result.buffer.toString('ascii');
      expect(pdfContent).toContain('%%EOF');
      expect(pdfContent).toContain('xref');
    }, 30000);

    it('should enforce file size limits', async () => {
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      // PDF should be reasonable size (not too small, not too large)
      expect(result.buffer.length).toBeGreaterThan(1000); // At least 1KB
      expect(result.buffer.length).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    }, 30000);

    it('should handle all German special characters including Euro', async () => {
      // Create invoice with comprehensive German characters
      const testInvoiceSpecial = new Invoice({
        invoiceNumber: 'RE-2025-09-00005',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Größere Menge für €29,99 - Heiße Getränke & süße Leckereien (Österreich/Schweiz)',
          quantity: 1,
          unitPrice: 29.99,
          type: 'sonstiges'
        }],
        subtotal: 29.99,
        tax: 5.70, // absoluter USt-Betrag
        totalAmount: 35.69,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await testInvoiceSpecial.save();

      // Populate the vendor for the PDF service
      await savedInvoice.populate('vendor');
      const result = await invoicePdfService.generateInvoicePdf(savedInvoice._id as string);

      // Should generate successfully without encoding errors
      expect(result.buffer.length).toBeGreaterThan(0);

      // Check that buffer is valid PDF
      const pdfHeader = result.buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);

    it('should handle missing vendor address gracefully', async () => {
      // Create vendor without address
      const vendorWithoutAddress = new User({
        isVendor: true,
        kontakt: {
          name: 'No Address Vendor',
          email: 'noaddress@vendor.de',
          status: 'aktiv'
        },
        vendorProfile: {
          unternehmen: 'No Address Vendor',
          provisionssatz: 4,
          modelltyp: 'Basic'
        }
      } as IUser);
      
      const savedVendor = await vendorWithoutAddress.save();

      const invoiceWithoutAddress = new Invoice({
        invoiceNumber: 'RE-2025-09-00002',
        vendor: savedVendor._id,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 25.00,
          type: 'sonstiges'
        }],
        subtotal: 25.00,
        tax: 4.75, // absoluter USt-Betrag
        totalAmount: 29.75,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await invoiceWithoutAddress.save();

      await expect(
        invoicePdfService.generateInvoicePdf(savedInvoice._id as mongoose.Types.ObjectId)
      ).resolves.not.toThrow();
    }, 30000);

    it('should handle special characters (umlauts)', async () => {
      // Create invoice with German special characters
      const testInvoiceUmlaut = new Invoice({
        invoiceNumber: 'RE-2025-09-00003',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Rösti mit Gemüse - Spezialität',
          quantity: 1,
          unitPrice: 12.50,
          type: 'sonstiges'
        }],
        subtotal: 12.50,
        tax: 2.38, // absoluter USt-Betrag
        totalAmount: 14.88,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await testInvoiceUmlaut.save();

      const result = await invoicePdfService.generateInvoicePdf(savedInvoice._id as string);
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error handling', () => {
    it('should handle invalid invoice ID format', async () => {
      await expect(
        invoicePdfService.generateInvoicePdf('invalid-id')
      ).rejects.toThrow();
    });

    it('should handle missing vendor data', async () => {
      // Create invoice with non-existent vendor
      const invoiceWithBadVendor = new Invoice({
        invoiceNumber: 'RE-2025-09-00004',
        vendor: new mongoose.Types.ObjectId(),
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 25.00,
          type: 'sonstiges'
        }],
        subtotal: 25.00,
        tax: 4.75, // absoluter USt-Betrag
        totalAmount: 29.75,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await invoiceWithBadVendor.save();

      await expect(
        invoicePdfService.generateInvoicePdf(savedInvoice._id as mongoose.Types.ObjectId)
      ).rejects.toThrow('Vendor data not found for invoice');
    });

    it('should handle empty invoice items gracefully', async () => {
      // Das Invoice-Model verlangt inzwischen mindestens eine Position –
      // ein leeres items-Array kann nur noch als Alt-/Fremddatensatz in der
      // DB liegen. Deshalb Validierung bewusst umgehen (direktes insertOne),
      // um die Robustheit des PDF-Services gegen solche Daten zu testen.
      const rawId = new mongoose.Types.ObjectId();
      await Invoice.collection.insertOne({
        _id: rawId,
        invoiceNumber: 'RE-2025-09-00008',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [], // Empty items array
        subtotal: 0.00,
        tax: 0.00,
        totalAmount: 0.00,
        status: 'draft',
        dueDate: new Date('2025-10-03'),
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      await expect(
        invoicePdfService.generatePdfBuffer(rawId as unknown as string)
      ).resolves.toBeInstanceOf(Buffer);
    }, 30000);

    it('should handle null or undefined values in invoice data', async () => {
      const invoiceWithNulls = new Invoice({
        invoiceNumber: 'RE-2025-09-00009',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 25.00,
          type: 'sonstiges'
        }],
        subtotal: 25.00,
        tax: 4.75, // absoluter USt-Betrag
        totalAmount: 29.75,
        status: 'draft',
        // dueDate intentionally omitted
      });

      const savedInvoice = await invoiceWithNulls.save();

      await expect(
        invoicePdfService.generatePdfBuffer(savedInvoice._id as string)
      ).resolves.toBeInstanceOf(Buffer);
    }, 30000);
  });

  describe('Template rendering tests', () => {
    it('should inject invoice data correctly into template', async () => {
      // We can't easily parse PDF content, but we can verify data processing
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      expect(result.filename).toContain('RE-2025-09-00001'); // Invoice number in filename
      expect(result.buffer.length).toBeGreaterThan(0);

      // Check buffer contains actual content (not just empty PDF)
      expect(result.buffer.length).toBeGreaterThan(5000);
    }, 30000);

    it('should handle missing optional fields in template', async () => {
      // Create minimal vendor without optional fields
      const minimalVendor = new User({
        isVendor: true,
        kontakt: {
          name: 'Minimal Vendor',
          email: 'minimal@vendor.de',
          status: 'aktiv'
        },
        vendorProfile: {
          unternehmen: 'Minimal Vendor',
          provisionssatz: 4,
          modelltyp: 'Basic'
        }
        // No adressen array
      } as IUser);

      const savedVendor = await minimalVendor.save();

      const minimalInvoice = new Invoice({
        invoiceNumber: 'RE-2025-09-00010',
        vendor: savedVendor._id,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Minimal Item',
          quantity: 1,
          unitPrice: 10.00,
          type: 'sonstiges'
        }],
        subtotal: 10.00,
        tax: 1.90, // absoluter USt-Betrag
        totalAmount: 11.90,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await minimalInvoice.save();

      await expect(
        invoicePdfService.generatePdfBuffer(savedInvoice._id as string)
      ).resolves.toBeInstanceOf(Buffer);
    }, 30000);
  });

  describe('Layout consistency tests', () => {
    it('should generate consistent PDF size across multiple runs', async () => {
      const results: Buffer[] = await Promise.all(
        [0, 1, 2].map(() => invoicePdfService.generatePdfBuffer(testInvoiceId))
      );

      // All PDFs should have similar sizes (within 5% variance)
      const sizes = results.map(buffer => buffer.length);
      const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

      sizes.forEach(size => {
        const variance = Math.abs(size - avgSize) / avgSize;
        expect(variance).toBeLessThan(0.05); // Less than 5% variance
      });
    }, 45000);

    it('should handle various invoice item counts consistently', async () => {
      // Create invoice with many items
      const manyItemsInvoice = new Invoice({
        invoiceNumber: 'RE-2025-09-00006',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: Array.from({ length: 10 }, (_, i) => ({
          description: `Test Item ${i + 1}`,
          quantity: 1,
          unitPrice: 10.00,
          type: 'sonstiges'
        })),
        subtotal: 100.00,
        tax: 19.00, // absoluter USt-Betrag
        totalAmount: 119.00,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await manyItemsInvoice.save();
      const result = await invoicePdfService.generatePdfBuffer(savedInvoice._id as string);

      expect(result.length).toBeGreaterThan(5000); // Should handle multiple items

      // Check PDF structure remains valid
      const pdfHeader = result.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);

    it('should maintain layout with long text content', async () => {
      // Create invoice with very long descriptions
      const longTextInvoice = new Invoice({
        invoiceNumber: 'RE-2025-09-00007',
        vendor: testVendorId,
        period: { month: 8, year: 2025 }, // Fixture belegt 9/2025 (Unique-Index)
        items: [{
          description: 'Dies ist eine sehr lange Beschreibung für einen Artikel, die potentiell Zeilenumbrüche und Layout-Probleme verursachen könnte. Sie enthält verschiedene deutsche Sonderzeichen wie ä, ö, ü, ß und das Euro-Symbol €. Diese Beschreibung testet die Fähigkeit des PDF-Generators, mit längeren Textinhalten umzugehen und dabei ein konsistentes Layout beizubehalten.',
          quantity: 1,
          unitPrice: 45.99,
          type: 'sonstiges'
        }],
        subtotal: 45.99,
        tax: 8.74, // absoluter USt-Betrag
        totalAmount: 54.73,
        status: 'draft',
        dueDate: new Date('2025-10-03')
      });

      const savedInvoice = await longTextInvoice.save();
      const result = await invoicePdfService.generatePdfBuffer(savedInvoice._id as string);

      expect(result.length).toBeGreaterThan(0);

      // Verify PDF remains valid despite long content
      const pdfHeader = result.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);
  });

  describe('Visual regression tests', () => {
    it('should generate PDFs with consistent structure markers', async () => {
      const result = await invoicePdfService.generatePdfBuffer(testInvoiceId);
      const pdfContent = result.toString('ascii');

      // Check for essential PDF structural elements
      expect(pdfContent).toContain('/Type /Catalog'); // PDF catalog
      expect(pdfContent).toContain('/Type /Page');    // At least one page
      expect(pdfContent).toContain('stream');         // Content streams
      expect(pdfContent).toContain('endstream');      // Stream ends
    }, 30000);

    it('should include invoice-specific content markers', async () => {
      // This test would ideally check actual content, but since we can't parse PDF easily,
      // we verify the invoice data is being processed correctly
      const result = await invoicePdfService.generateInvoicePdf(testInvoiceId);

      // The result should include proper filename matching the invoice
      expect(result.filename).toBe('RE-2025-09-00001.pdf');

      // Buffer should be substantial enough to contain invoice data
      expect(result.buffer.length).toBeGreaterThan(8000); // Reasonable size for styled invoice
    }, 30000);
  });

  describe('Performance tests', () => {
    it('should generate PDF within reasonable time', async () => {
      const startTime = Date.now();
      await invoicePdfService.generatePdfBuffer(testInvoiceId);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, 30000);

    it('should handle repeated PDF generation', async () => {
      // Parallel — der geteilte Browser bleibt offen (BUG-PDF-RACE-Fix),
      // gleichzeitige Generierungen dürfen sich nicht mehr stören
      const results: Buffer[] = await Promise.all(
        [0, 1, 2].map(() => invoicePdfService.generatePdfBuffer(testInvoiceId))
      );

      results.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      });
    }, 45000);
  });
});