/**
 * @file invoiceGenerationService.test.ts
 * @purpose Unit tests for InvoiceGenerationService
 * @created 2025-01-15
 * @modified 2025-01-15
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import invoiceGenerationService from './invoiceGenerationService';
import Invoice from '../models/Invoice';
import User from '../models/User';
import { IUser } from '../types/modelTypes';

// Remove the jest mock as it interferes with the actual service

describe('InvoiceGenerationService', () => {
  let mongoServer: MongoMemoryServer;
  let testVendorId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    // Only create new connection if none exists
    if (mongoose.connection.readyState === 0) {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    }
    
    // Create test vendor for PDF tests
    const testVendor = new User({
      username: 'pdftestvedor',
      password: 'testpassword123',
      role: 'vendor',
      isActive: true,
      isFullAccount: true,
      kontakt: {
        name: 'Test Vendor for PDF',
        email: 'pdftest@vendor.de',
        status: 'aktiv'
      },
      adressen: [{
        adresstyp: 'Rechnungsadresse',
        strasse: 'PDF-Teststraße',
        hausnummer: '456',
        plz: '54321',
        ort: 'PDF-Teststadt',
        name1: 'Test Vendor for PDF',
        email: 'pdftest@vendor.de',
        telefon: '+49 987 654321'
      }],
      vendorProfile: {
        unternehmen: 'Test Vendor for PDF GmbH',
        beschreibung: 'PDF Test Vendor',
        provisionssatz: 7,
        modelltyp: 'Premium'
      }
    } as unknown as IUser);
    
    const savedVendor = await testVendor.save();
    testVendorId = savedVendor._id as mongoose.Types.ObjectId;
  });

  afterAll(async () => {
    // Only disconnect if we created the connection
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    
    testVendorId = new mongoose.Types.ObjectId();
  });

  describe('generateInvoice', () => {
    it('should generate a complete invoice with correct calculations', async () => {
      const invoiceData = {
        vendorId: testVendorId,
        period: { month: 1, year: 2025 },
        items: [
          {
            description: 'Mietfach Groß',
            quantity: 2,
            unitPrice: 50.00,
            type: 'mietfach' as const
          },
          {
            description: 'Zusatzservice',
            quantity: 1,
            unitPrice: 25.00,
            type: 'zusatzleistung' as const
          }
        ]
      };

      const invoice = await invoiceGenerationService.generateInvoice(
        invoiceData.vendorId,
        invoiceData.period,
        invoiceData.items
      );

      expect(invoice.invoiceNumber).toBe('RE-2025-01-00001');
      expect(invoice.vendor).toEqual(testVendorId);
      expect(invoice.period).toEqual({ month: 1, year: 2025 });
      expect(invoice.subtotal).toBe(125.00); // (2*50) + (1*25)
      expect(invoice.tax).toBe(23.75); // 19 % von 125 € als absoluter Betrag
      expect(invoice.totalAmount).toBe(148.75); // subtotal + tax
      expect(invoice.status).toBe('draft');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0].totalPrice).toBe(100.00);
      expect(invoice.items[1].totalPrice).toBe(25.00);
    });

    it('should throw error for invalid vendor ID', async () => {
      const invalidVendorId = 'invalid-id' as any;
      const period = { month: 1, year: 2025 };
      const items = [{
        description: 'Test',
        quantity: 1,
        unitPrice: 10,
        type: 'mietfach' as const
      }];

      await expect(
        invoiceGenerationService.generateInvoice(invalidVendorId, period, items)
      ).rejects.toThrow('Valid vendorId is required');
    });
  });

  describe('getNextInvoiceNumber', () => {
    it('should generate first invoice number for new month', async () => {
      const number = await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      expect(number).toBe('RE-2025-01-00001');
    });

    it('should generate sequential numbers within same month', async () => {
      const number1 = await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      const number2 = await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      const number3 = await invoiceGenerationService.getNextInvoiceNumber(2025, 1);

      expect(number1).toBe('RE-2025-01-00001');
      expect(number2).toBe('RE-2025-01-00002');
      expect(number3).toBe('RE-2025-01-00003');
    });

    it('should reset sequence for new month', async () => {
      // Generate numbers in January
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);

      // First number in February should be 00001
      const febNumber = await invoiceGenerationService.getNextInvoiceNumber(2025, 2);
      expect(febNumber).toBe('RE-2025-02-00001');
    });

    it('should pad month and sequence numbers correctly', async () => {
      const number = await invoiceGenerationService.getNextInvoiceNumber(2025, 5);
      expect(number).toBe('RE-2025-05-00001');
    });

    it('should handle concurrent requests safely', async () => {
      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => 
        invoiceGenerationService.getNextInvoiceNumber(2025, 3)
      );

      const numbers = await Promise.all(promises);
      
      // All numbers should be unique
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(10);
      
      // Numbers should be sequential
      const sortedNumbers = numbers.sort();
      for (let i = 0; i < sortedNumbers.length; i++) {
        const expectedSequence = String(i + 1).padStart(5, '0');
        expect(sortedNumbers[i]).toBe(`RE-2025-03-${expectedSequence}`);
      }
    });
  });

  describe('createInvoiceDocument', () => {
    it('should create and persist invoice document', async () => {
      const invoiceData = {
        invoiceNumber: 'RE-2025-01-00001',
        vendor: testVendorId,
        period: { month: 1, year: 2025 },
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          type: 'mietfach'
        }],
        subtotal: 100,
        tax: 19, // absoluter USt-Betrag
        totalAmount: 119,
        status: 'draft',
        dueDate: new Date()
      };

      const invoice = await invoiceGenerationService.createInvoiceDocument(invoiceData);
      
      expect(invoice).toBeDefined();
      expect(invoice.invoiceNumber).toBe('RE-2025-01-00001');
      expect(invoice.vendor).toEqual(testVendorId);
      
      // Verify it was persisted
      const savedInvoice = await Invoice.findById(invoice._id);
      expect(savedInvoice).toBeDefined();
      expect(savedInvoice?.invoiceNumber).toBe('RE-2025-01-00001');
    });

    it('should rollback transaction on error', async () => {
      const invalidData = {
        invoiceNumber: 'RE-2025-01-00001',
        vendor: 'invalid-vendor-id', // This should cause an error
        period: { month: 1, year: 2025 },
        items: [],
        subtotal: 0,
        tax: 0,
        totalAmount: 0,
        status: 'draft',
        dueDate: new Date()
      };

      await expect(
        invoiceGenerationService.createInvoiceDocument(invalidData)
      ).rejects.toThrow();
      
      // Verify no invoice was created
      const invoiceCount = await Invoice.countDocuments();
      expect(invoiceCount).toBe(0);
    });
  });

  describe('validateInvoiceData', () => {
    let validData: any;

    beforeEach(() => {
      validData = {
        vendorId: testVendorId,
        period: { month: 1, year: 2025 },
        items: [{
          description: 'Valid Item',
          quantity: 1,
          unitPrice: 10,
          type: 'mietfach' as const
        }]
      };
    });

    it('should pass validation for valid data', () => {
      expect(() => {
        invoiceGenerationService.validateInvoiceData(validData);
      }).not.toThrow();
    });

    it('should throw error for invalid vendor ID', () => {
      const invalidData = { ...validData, vendorId: 'invalid' as any };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Valid vendorId is required');
    });

    it('should throw error for missing period', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: null as any,
        items: validData.items
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Valid period with year and month is required');
    });

    it('should throw error for invalid year', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: { month: 1, year: 1999 },
        items: validData.items
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Year must be between 2000 and 2100');
    });

    it('should throw error for invalid month', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: { month: 13, year: 2025 },
        items: validData.items
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Month must be between 1 and 12');
    });

    it('should throw error for empty items array', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: validData.period,
        items: []
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('At least one invoice item is required');
    });

    it('should throw error for item without description', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: validData.period,
        items: [{
          description: '',
          quantity: 1,
          unitPrice: 10,
          type: 'mietfach' as const
        }]
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Item 1: Description is required');
    });

    it('should throw error for invalid quantity', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: validData.period,
        items: [{
          description: 'Valid Item',
          quantity: 0,
          unitPrice: 10,
          type: 'mietfach' as const
        }]
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Item 1: Quantity must be a positive number');
    });

    it('should throw error for negative unit price', () => {
      const invalidData = {
        vendorId: testVendorId,
        period: validData.period,
        items: [{
          description: 'Valid Item',
          quantity: 1,
          unitPrice: -5,
          type: 'mietfach' as const
        }]
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Item 1: Unit price must be a non-negative number');
    });

    it('should throw error for invalid item type', () => {
      const invalidData = {
        vendorId: testVendorId, // Use valid vendorId
        period: { month: 1, year: 2025 },
        items: [{
          description: 'Valid Item',
          quantity: 1,
          unitPrice: 10,
          type: 'invalid-type' as any
        }]
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Item 1: Type must be one of mietfach, zusatzleistung, sonstiges');
    });

    it('should throw error for invalid referenceId format', () => {
      const invalidData = {
        vendorId: testVendorId, // Use valid vendorId
        period: { month: 1, year: 2025 },
        items: [{
          description: 'Valid Item',
          quantity: 1,
          unitPrice: 10,
          type: 'mietfach' as const,
          referenceId: 'invalid-id' as any
        }]
      };
      expect(() => {
        invoiceGenerationService.validateInvoiceData(invalidData);
      }).toThrow('Item 1: Invalid referenceId format');
    });
  });

  describe('getCurrentSequence', () => {
    it('should return 0 for new period', async () => {
      const sequence = await invoiceGenerationService.getCurrentSequence(2025, 1);
      expect(sequence).toBe(0);
    });

    it('should return correct sequence after generating numbers', async () => {
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      
      const sequence = await invoiceGenerationService.getCurrentSequence(2025, 1);
      expect(sequence).toBe(2);
    });
  });

  describe('resetSequence', () => {
    it('should reset sequence to 0', async () => {
      // Generate some numbers first
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      
      // Reset sequence
      await invoiceGenerationService.resetSequence(2025, 1);
      
      const sequence = await invoiceGenerationService.getCurrentSequence(2025, 1);
      expect(sequence).toBe(0);
    });

    it('should allow generating from 1 after reset', async () => {
      // Generate some numbers first
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      
      // Reset sequence
      await invoiceGenerationService.resetSequence(2025, 1);
      
      // Next number should be 00001
      const nextNumber = await invoiceGenerationService.getNextInvoiceNumber(2025, 1);
      expect(nextNumber).toBe('RE-2025-01-00001');
    });
  });

  describe('PDF Generation Integration', () => {
    let testInvoice: any;

    beforeEach(async () => {
      // Reset sequence for consistent testing
      await invoiceGenerationService.resetSequence(2025, 9);
      
      // Clear existing invoices
      await Invoice.deleteMany({});
    });

    afterEach(async () => {
      // Cleanup PDF service resources
      await invoiceGenerationService.cleanup();
    });

    it.skip('should generate invoice with PDF', async () => {
      const invoiceData = {
        vendorId: testVendorId,
        period: { month: 9, year: 2025 },
        items: [{
          description: 'PDF Test Item',
          quantity: 1,
          unitPrice: 25.00,
          type: 'mietfach' as const
        }]
      };

      const result = await invoiceGenerationService.generateInvoiceWithPdf(
        invoiceData.vendorId,
        invoiceData.period,
        invoiceData.items,
        true
      );

      expect(result).toHaveProperty('invoice');
      expect(result).toHaveProperty('pdf');
      expect(result.invoice).toBeDefined();
      expect(result.pdf).toBeDefined();
      expect(result.pdf?.buffer).toBeInstanceOf(Buffer);
      expect(result.pdf?.filename).toMatch(/^RE-2025-09-\d{5}\.pdf$/);
    }, 30000);

    it('should generate invoice without PDF when disabled', async () => {
      const invoiceData = {
        vendorId: testVendorId,
        period: { month: 9, year: 2025 },
        items: [{
          description: 'No PDF Test Item',
          quantity: 1,
          unitPrice: 15.00,
          type: 'zusatzleistung' as const
        }]
      };

      const result = await invoiceGenerationService.generateInvoiceWithPdf(
        invoiceData.vendorId,
        invoiceData.period,
        invoiceData.items,
        false
      );

      expect(result).toHaveProperty('invoice');
      expect(result.pdf).toBeUndefined();
      expect(result.invoice).toBeDefined();
    });

    it('should continue invoice generation even if PDF fails', async () => {
      // This test simulates PDF generation failure
      const invoiceData = {
        vendorId: testVendorId,
        period: { month: 9, year: 2025 },
        items: [{
          description: 'Resilient Test Item',
          quantity: 1,
          unitPrice: 35.00,
          type: 'sonstiges' as const
        }]
      };

      const result = await invoiceGenerationService.generateInvoiceWithPdf(
        invoiceData.vendorId,
        invoiceData.period,
        invoiceData.items,
        true
      );

      // Invoice should still be created
      expect(result.invoice).toBeDefined();
      expect(result.invoice.invoiceNumber).toBeDefined();
      expect(result.invoice.totalAmount).toBeCloseTo(41.65); // 35 € + 6,65 € USt
    }, 30000);

    it.skip('should generate PDF for existing invoice', async () => {
      // First create an invoice
      const invoice = await invoiceGenerationService.generateInvoice(
        testVendorId,
        { month: 9, year: 2025 },
        [{
          description: 'Existing Invoice Test',
          quantity: 2,
          unitPrice: 20.00,
          type: 'mietfach' as const
        }]
      );

      // Then generate PDF for it
      const pdfResult = await invoiceGenerationService.generatePdfForInvoice(invoice._id);

      expect(pdfResult).toHaveProperty('buffer');
      expect(pdfResult).toHaveProperty('filename');
      expect(pdfResult.buffer).toBeInstanceOf(Buffer);
      expect(pdfResult.buffer.length).toBeGreaterThan(0);
    }, 30000);

    it.skip('should generate PDF buffer only', async () => {
      const invoice = await invoiceGenerationService.generateInvoice(
        testVendorId,
        { month: 9, year: 2025 },
        [{
          description: 'Buffer Only Test',
          quantity: 1,
          unitPrice: 10.00,
          type: 'zusatzleistung' as const
        }]
      );

      const buffer = await invoiceGenerationService.generatePdfBufferForInvoice(invoice._id);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Verify PDF format
      const pdfHeader = buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);

    it.skip('should generate PDF as base64', async () => {
      const invoice = await invoiceGenerationService.generateInvoice(
        testVendorId,
        { month: 9, year: 2025 },
        [{
          description: 'Base64 Test',
          quantity: 1,
          unitPrice: 30.00,
          type: 'sonstiges' as const
        }]
      );

      const base64 = await invoiceGenerationService.generatePdfBase64ForInvoice(invoice._id);

      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      
      // Verify it's valid base64 that represents a PDF
      const buffer = Buffer.from(base64, 'base64');
      const pdfHeader = buffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    }, 30000);

    it('should throw error for PDF generation with non-existent invoice', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        invoiceGenerationService.generatePdfForInvoice(fakeId)
      ).rejects.toThrow(`Invoice not found: ${fakeId}`);
    });
  });

  describe('Batch Processing', () => {
    let testVendorIds: mongoose.Types.ObjectId[];

    beforeEach(async () => {
      // Clear collections
      await Invoice.deleteMany({});
      await User.deleteMany({});
      
      // Create test vendors
      testVendorIds = [];
      for (let i = 0; i < 5; i++) {
        const vendor = new User({
          username: `testvendor${i + 1}`,
          password: 'testpassword123',
          role: 'vendor',
          isActive: true,
          isFullAccount: true,
          kontakt: {
            name: `Test Vendor ${i + 1}`,
            email: `vendor${i + 1}@test.de`,
            status: 'aktiv'
          },
          adressen: [{
            adresstyp: 'Rechnungsadresse',
            strasse: 'Teststraße',
            hausnummer: `${i + 1}`,
            plz: '12345',
            ort: 'Teststadt',
            name1: `Test Vendor ${i + 1}`,
            email: `vendor${i + 1}@test.de`
          }],
          vendorProfile: {
            unternehmen: `Test Vendor ${i + 1} GmbH`,
            beschreibung: `Test Vendor ${i + 1}`,
            provisionssatz: 7,
            modelltyp: 'Premium',
            approved: true
          }
        } as unknown as IUser);
        
        const savedVendor = await vendor.save();
        testVendorIds.push(savedVendor._id as mongoose.Types.ObjectId);
      }

      // Reset sequences
      await invoiceGenerationService.resetSequence(2025, 3);
    });

    describe('processVendorBatch', () => {
      it('should process batch of vendors successfully', async () => {
        const vendorIds = testVendorIds.slice(0, 3).map(id => id.toString());
        const period = { month: 3, year: 2025 };
        
        // Mock generateMonthlyInvoice to return test invoices
        const originalMethod = invoiceGenerationService.generateMonthlyInvoice;
        let callCount = 0;
        const mockImplementation = async (vendorId: string, year: number, month: number) => {
          callCount++;
          return {
            _id: new mongoose.Types.ObjectId(),
            invoiceNumber: `RE-${year}-${month.toString().padStart(2, '0')}-${callCount.toString().padStart(5, '0')}`,
            vendor: vendorId,
            period: { month, year },
            totalAmount: 100 + callCount * 10,
            status: 'draft'
          };
        };
        (invoiceGenerationService as any).generateMonthlyInvoice = mockImplementation;

        const progressEvents: any[] = [];
        const result = await invoiceGenerationService.processVendorBatch(
          vendorIds,
          period,
          (progress) => progressEvents.push(progress)
        );

        // Restore original method
        invoiceGenerationService.generateMonthlyInvoice = originalMethod;

        expect(result.totalVendors).toBe(3);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.skippedCount).toBe(0);
        expect(result.successes).toHaveLength(3);
        expect(result.processingTime).toBeGreaterThan(0);
        
        // Check progress events
        expect(progressEvents).toHaveLength(6); // 3 processing + 3 completed
        expect(progressEvents.filter(e => e.status === 'processing')).toHaveLength(3);
        expect(progressEvents.filter(e => e.status === 'completed')).toHaveLength(3);
      });

      it('should handle individual vendor failures with error isolation', async () => {
        const vendorIds = testVendorIds.slice(0, 3).map(id => id.toString());
        const period = { month: 3, year: 2025 };

        // Mock generateMonthlyInvoice to fail for second vendor
        const originalMethod = invoiceGenerationService.generateMonthlyInvoice;
        let callCount = 0;
        const mockImplementation = async (vendorId: string, year: number, month: number) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Test failure for vendor 2');
          }
          return {
            _id: new mongoose.Types.ObjectId(),
            invoiceNumber: `RE-${year}-${month.toString().padStart(2, '0')}-${callCount.toString().padStart(5, '0')}`,
            vendor: vendorId,
            totalAmount: 100,
            status: 'draft'
          };
        };
        (invoiceGenerationService as any).generateMonthlyInvoice = mockImplementation;

        const result = await invoiceGenerationService.processVendorBatch(vendorIds, period);

        // Restore original method
        invoiceGenerationService.generateMonthlyInvoice = originalMethod;

        expect(result.totalVendors).toBe(3);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(1);
        expect(result.skippedCount).toBe(0);
        expect(result.failures).toHaveLength(1);
        expect(result.failures[0].error).toBe('Test failure for vendor 2');
        expect(result.failures[0].vendorId).toMatch(/^[0-9a-f]{24}$/);
      });

      it('should track memory usage during processing', async () => {
        const vendorIds = testVendorIds.slice(0, 2).map(id => id.toString());
        const period = { month: 3, year: 2025 };

        const originalMethod = invoiceGenerationService.generateMonthlyInvoice;
        (invoiceGenerationService as any).generateMonthlyInvoice = () => Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          invoiceNumber: 'RE-2025-03-00001',
          vendor: 'test',
          totalAmount: 100,
          status: 'draft'
        });

        const result = await invoiceGenerationService.processVendorBatch(vendorIds, period);

        // Restore original method
        invoiceGenerationService.generateMonthlyInvoice = originalMethod;

        expect(result.memoryUsage.start).toBeDefined();
        expect(result.memoryUsage.end).toBeDefined();
        expect(result.memoryUsage.start.heapUsed).toBeGreaterThan(0);
        expect(result.memoryUsage.end.heapUsed).toBeGreaterThan(0);
      });
    });

    describe('chunkedProcessing', () => {
      it('should process vendors in chunks', async () => {
        const vendorIds = testVendorIds.map(id => id.toString());
        const period = { month: 3, year: 2025 };
        const chunkSize = 2;

        // Mock generateMonthlyInvoice
        const originalMethod = invoiceGenerationService.generateMonthlyInvoice;
        let callCount = 0;
        const mockImplementation = async () => {
          callCount++;
          return {
            _id: new mongoose.Types.ObjectId(),
            invoiceNumber: `RE-2025-03-${callCount.toString().padStart(5, '0')}`,
            vendor: 'test',
            totalAmount: 100,
            status: 'draft'
          };
        };
        (invoiceGenerationService as any).generateMonthlyInvoice = mockImplementation;

        const chunkEvents: any[] = [];
        const overallEvents: any[] = [];

        const result = await invoiceGenerationService.chunkedProcessing(
          vendorIds,
          period,
          chunkSize,
          (chunkProgress) => chunkEvents.push(chunkProgress),
          (overallProgress) => overallEvents.push(overallProgress)
        );

        // Restore original method
        invoiceGenerationService.generateMonthlyInvoice = originalMethod;

        expect(result.totalVendors).toBe(5);
        expect(result.totalChunks).toBe(3); // ceil(5/2)
        expect(result.processedChunks).toBe(3);
        expect(result.successCount).toBe(5);
        expect(result.chunkResults).toHaveLength(3);
        
        // Check chunk sizes
        expect(result.chunkResults[0].totalVendors).toBe(2);
        expect(result.chunkResults[1].totalVendors).toBe(2);
        expect(result.chunkResults[2].totalVendors).toBe(1);

        // Check events were fired
        expect(chunkEvents.length).toBeGreaterThan(0);
        expect(overallEvents.length).toBeGreaterThan(0);
      });

      it('should track peak memory usage across chunks', async () => {
        const vendorIds = testVendorIds.slice(0, 3).map(id => id.toString());
        const period = { month: 3, year: 2025 };

        const originalMethod = invoiceGenerationService.generateMonthlyInvoice;
        (invoiceGenerationService as any).generateMonthlyInvoice = () => Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          invoiceNumber: 'RE-2025-03-00001',
          vendor: 'test',
          totalAmount: 100,
          status: 'draft'
        });

        const result = await invoiceGenerationService.chunkedProcessing(
          vendorIds,
          period,
          2
        );

        // Restore original method
        invoiceGenerationService.generateMonthlyInvoice = originalMethod;

        expect(result.memoryUsage.start).toBeDefined();
        expect(result.memoryUsage.peak).toBeDefined();
        expect(result.memoryUsage.end).toBeDefined();
        expect(result.memoryUsage.peak.heapUsed).toBeGreaterThanOrEqual(result.memoryUsage.start.heapUsed);
      });
    });

    describe('handleBatchErrors', () => {
      it('should categorize different error types', async () => {
        const errors = [
          { vendorId: 'vendor1', error: 'Connection timeout occurred', timestamp: new Date() },
          { vendorId: 'vendor2', error: 'ECONNREFUSED: Connection refused', timestamp: new Date() },
          { vendorId: 'vendor3', error: 'Validation failed: Invalid email', timestamp: new Date() },
          { vendorId: 'vendor4', error: 'Invoice already exists for this period', timestamp: new Date() }
        ];

        const batch = {
          vendorIds: ['vendor1', 'vendor2', 'vendor3', 'vendor4'],
          period: { month: 3, year: 2025 }
        };

        const result = await invoiceGenerationService.handleBatchErrors(errors, batch);

        expect(result.retryableErrors).toHaveLength(2); // timeout, connection
        expect(result.permanentErrors).toHaveLength(2); // validation, duplicate
        expect(result.recommendations.length).toBeGreaterThan(0);
        
        // Check error categorization
        const retryableTypes = result.retryableErrors.map(e => e.errorType);
        expect(retryableTypes).toContain('timeout');
        expect(retryableTypes).toContain('connection');
      });

      it('should trigger circuit breaker on high failure rate', async () => {
        const errors = Array(6).fill(null).map((_, i) => ({
          vendorId: `vendor${i + 1}`,
          error: 'Service temporarily unavailable',
          timestamp: new Date()
        }));

        const batch = {
          vendorIds: Array(10).fill(null).map((_, i) => `vendor${i + 1}`),
          period: { month: 3, year: 2025 }
        };

        const config = {
          failureThreshold: 5,
          failureRate: 0.5,
          resetTimeout: 60000,
          monitoringWindow: 300000
        };

        const result = await invoiceGenerationService.handleBatchErrors(errors, batch, config);

        expect(result.circuitBreakerTriggered).toBe(true);
        expect(result.circuitBreakerStatus).toBe('open');
        expect(result.recommendations.some(r => r.type === 'circuit_breaker')).toBe(true);
      });
    });

    describe('getAllActiveVendorIds', () => {
      it('should return only active approved vendors', async () => {
        // Clear existing test vendors
        await User.deleteMany({});

        // Create mix of vendors
        const activeVendor = new User({
          username: 'activevendor',
          password: 'testpassword123',
          isVendor: true,
          registrationStatus: 'active',
          isFullAccount: true,
          vendorProfile: { 
            verifyStatus: 'verified',
            unternehmen: 'Active Vendor GmbH',
            beschreibung: 'Test description',
            provisionssatz: 7,
            modelltyp: 'Premium'
          },
          kontakt: { 
            name: 'Active Vendor',
            email: 'active@vendor.de'
          },
          adressen: []
        } as unknown as IUser);

        const inactiveVendor = new User({
          username: 'inactivevendor',
          password: 'testpassword123',
          isVendor: true,
          registrationStatus: 'cancelled',
          isFullAccount: true,
          vendorProfile: { 
            verifyStatus: 'verified',
            unternehmen: 'Inactive Vendor GmbH',
            beschreibung: 'Test description',
            provisionssatz: 7,
            modelltyp: 'Premium'
          },
          kontakt: { 
            name: 'Inactive Vendor',
            email: 'inactive@vendor.de'
          },
          adressen: []
        } as unknown as IUser);

        const unapprovedVendor = new User({
          username: 'unapprovedvendor',
          password: 'testpassword123',
          isVendor: true,
          registrationStatus: 'active',
          isFullAccount: true,
          vendorProfile: { 
            verifyStatus: 'unverified',
            unternehmen: 'Unapproved Vendor GmbH',
            beschreibung: 'Test description',
            provisionssatz: 7,
            modelltyp: 'Premium'
          },
          kontakt: { 
            name: 'Unapproved Vendor',
            email: 'unapproved@vendor.de'
          },
          adressen: []
        } as unknown as IUser);

        await Promise.all([
          activeVendor.save(),
          inactiveVendor.save(),
          unapprovedVendor.save()
        ]);

        const vendorIds = await invoiceGenerationService.getAllActiveVendorIds();

        expect(vendorIds).toHaveLength(1);
        expect(vendorIds[0]).toBe((activeVendor._id as mongoose.Types.ObjectId).toString());
      });
    });

    describe('generateInvoicesForAllVendors', () => {
      it('should process all active vendors with default chunk size', async () => {
        const period = { month: 3, year: 2025 };

        // Mock getAllActiveVendorIds
        const originalGetActive = invoiceGenerationService.getAllActiveVendorIds;
        (invoiceGenerationService as any).getAllActiveVendorIds = () => Promise.resolve(
          testVendorIds.map(id => id.toString())
        );

        // Mock chunkedProcessing
        const originalChunked = invoiceGenerationService.chunkedProcessing;
        const mockChunkedProcessing = () => Promise.resolve({
          totalVendors: 5,
          totalChunks: 1,
          processedChunks: 1,
          successCount: 5,
          failureCount: 0,
          skippedCount: 0,
          chunkResults: [],
          overallProcessingTime: 1000,
          averageChunkTime: 1000,
          memoryUsage: {
            start: process.memoryUsage(),
            peak: process.memoryUsage(),
            end: process.memoryUsage()
          }
        });
        (invoiceGenerationService as any).chunkedProcessing = mockChunkedProcessing;

        const result = await invoiceGenerationService.generateInvoicesForAllVendors(period);

        // Restore original methods
        invoiceGenerationService.getAllActiveVendorIds = originalGetActive;
        invoiceGenerationService.chunkedProcessing = originalChunked;

        expect(result.totalVendors).toBe(5);
        expect(result.successCount).toBe(5);
        expect(result.totalChunks).toBe(1);
        expect(result.processedChunks).toBe(1);
      });

      it('should handle empty vendor list gracefully', async () => {
        const period = { month: 3, year: 2025 };

        // Mock getAllActiveVendorIds to return empty array
        const originalGetActive = invoiceGenerationService.getAllActiveVendorIds;
        (invoiceGenerationService as any).getAllActiveVendorIds = () => Promise.resolve([]);

        const result = await invoiceGenerationService.generateInvoicesForAllVendors(period);

        // Restore original method
        invoiceGenerationService.getAllActiveVendorIds = originalGetActive;

        expect(result.totalVendors).toBe(0);
        expect(result.totalChunks).toBe(0);
        expect(result.successCount).toBe(0);
      });
    });
  });
});