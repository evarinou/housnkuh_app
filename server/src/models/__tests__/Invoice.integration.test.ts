/**
 * @file Invoice.integration.test.ts
 * @purpose Integration tests for Invoice model with database operations
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Invoice from '../Invoice';
import User from '../User';

// Type assertion for static methods in tests
const InvoiceModel = Invoice as any;

describe('Invoice Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testVendorId: string;
  let testUser: any;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    await mongoose.connect(mongoUri);
  }, 10000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 10000);

  beforeEach(async () => {
    // Clean up collections
    await Invoice.deleteMany({});
    await User.deleteMany({});

    // Create a test vendor user
    testUser = new User({
      kontakt: {
        name: 'Test Vendor',
        email: 'test-vendor@example.com',
        mailNewsletter: false,
        status: 'aktiv'
      },
      isVendor: true,
      isFullAccount: true,
      username: 'testvendor',
      password: 'hashedpassword'
    });
    
    await testUser.save();
    testVendorId = testUser._id.toString();
  });

  afterEach(async () => {
    await Invoice.deleteMany({});
    await User.deleteMany({});
  });

  describe('Database Operations', () => {
    it('should create invoice with valid data', async () => {
      const invoiceData = {
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{
          description: 'Mietfach Service - August 2025',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
          type: 'mietfach'
        }],
        subtotal: 50.00,
        tax: 9.50, // absoluter USt-Betrag, kein Satz
        totalAmount: 59.50
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();

      expect(savedInvoice._id).toBeDefined();
      expect(savedInvoice.createdAt).toBeDefined();
      expect(savedInvoice.updatedAt).toBeDefined();
      expect(savedInvoice.invoiceNumber).toBe('RE-2025-08-00001');
      expect(savedInvoice.vendor.toString()).toBe(testVendorId);
    });

    it('should enforce unique constraint on invoiceNumber', async () => {
      const invoiceData = {
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{
          description: 'Mietfach Service',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
          type: 'mietfach'
        }],
        subtotal: 50.00,
        tax: 9.50,
        totalAmount: 59.50
      };

      // Create first invoice
      const invoice1 = new Invoice(invoiceData);
      await invoice1.save();

      // Try to create duplicate
      const invoice2 = new Invoice(invoiceData);
      
      await expect(invoice2.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should populate vendor information', async () => {
      const invoiceData = {
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{
          description: 'Mietfach Service',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
          type: 'mietfach'
        }],
        subtotal: 50.00,
        tax: 9.50,
        totalAmount: 59.50
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      const populatedInvoice = await Invoice.findById(invoice._id).populate('vendor');
      
      expect(populatedInvoice?.vendor).toBeDefined();
      expect((populatedInvoice?.vendor as any).kontakt.name).toBe('Test Vendor');
      expect((populatedInvoice?.vendor as any).isVendor).toBe(true);
    });
  });

  describe('Querying with Indexes', () => {
    beforeEach(async () => {
      // Create test invoices
      const invoices = [
        {
          invoiceNumber: 'RE-2025-08-00001',
          vendor: testVendorId,
          period: { month: 8, year: 2025 },
          status: 'sent',
          items: [{ description: 'Service 1', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
          subtotal: 50,
          tax: 9.50,
          totalAmount: 59.50
        },
        {
          invoiceNumber: 'RE-2025-09-00001',
          vendor: testVendorId,
          period: { month: 9, year: 2025 },
          status: 'paid',
          items: [{ description: 'Service 2', quantity: 1, unitPrice: 75, totalPrice: 75, type: 'mietfach' }],
          subtotal: 75,
          tax: 14.25,
          totalAmount: 89.25
        }
      ];

      await Invoice.insertMany(invoices);
    });

    it('should query invoices by vendor efficiently', async () => {
      const vendorInvoices = await Invoice.find({ vendor: testVendorId });
      
      expect(vendorInvoices).toHaveLength(2);
      vendorInvoices.forEach(invoice => {
        expect(invoice.vendor.toString()).toBe(testVendorId);
      });
    });

    it('should query invoices by status efficiently', async () => {
      const sentInvoices = await Invoice.find({ status: 'sent' });
      const paidInvoices = await Invoice.find({ status: 'paid' });
      
      expect(sentInvoices).toHaveLength(1);
      expect(paidInvoices).toHaveLength(1);
      expect(sentInvoices[0].status).toBe('sent');
      expect(paidInvoices[0].status).toBe('paid');
    });

    it('should query invoices by period efficiently', async () => {
      const augustInvoices = await Invoice.find({ 
        'period.year': 2025, 
        'period.month': 8 
      });
      
      expect(augustInvoices).toHaveLength(1);
      expect(augustInvoices[0].period?.month).toBe(8);
      expect(augustInvoices[0].period?.year).toBe(2025);
    });

    it('should query with compound indexes (vendor + status)', async () => {
      const vendorSentInvoices = await Invoice.find({ 
        vendor: testVendorId, 
        status: 'sent' 
      });
      
      expect(vendorSentInvoices).toHaveLength(1);
      expect(vendorSentInvoices[0].status).toBe('sent');
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate sequential invoice numbers for same month', async () => {
      // Create first invoice
      const firstNumber = await InvoiceModel.generateInvoiceNumber(2025, 8);
      const invoice1 = new Invoice({
        invoiceNumber: firstNumber,
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{ description: 'Service 1', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
        subtotal: 50,
        tax: 9.50,
        totalAmount: 59.50
      });
      await invoice1.save();

      // Generate second invoice number
      const secondNumber = await InvoiceModel.generateInvoiceNumber(2025, 8);
      expect(firstNumber).toBe('RE-2025-08-00001');
      expect(secondNumber).toBe('RE-2025-08-00002');

      // Create second invoice (anderer Vendor — Unique-Index erlaubt nur
      // EINE Rechnung je Vendor+Periode; getestet wird hier die Nummern-Sequenz)
      const invoice2 = new Invoice({
        invoiceNumber: secondNumber,
        vendor: new mongoose.Types.ObjectId(),
        period: { month: 8, year: 2025 },
        items: [{ description: 'Service 2', quantity: 1, unitPrice: 75, totalPrice: 75, type: 'mietfach' }],
        subtotal: 75,
        tax: 14.25,
        totalAmount: 89.25
      });
      await invoice2.save();

      // Verify both invoices exist
      const invoices = await Invoice.find({ 'period.month': 8, 'period.year': 2025 });
      expect(invoices).toHaveLength(2);
    });

    it('rejects a second invoice for the same vendor and period (unique index, BUG-INV-DUP)', async () => {
      const makeInvoice = (nr: string) => new Invoice({
        invoiceNumber: nr,
        vendor: testVendorId,
        period: { month: 9, year: 2025 },
        items: [{ description: 'Miete', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
        subtotal: 50,
        tax: 9.50,
        totalAmount: 59.50
      });

      await makeInvoice('RE-2025-09-00001').save();
      await expect(makeInvoice('RE-2025-09-00002').save()).rejects.toMatchObject({ code: 11000 });
    });

    it('should restart numbering for different months', async () => {
      // Create invoice for August
      const augNumber = await InvoiceModel.generateInvoiceNumber(2025, 8);
      const augInvoice = new Invoice({
        invoiceNumber: augNumber,
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{ description: 'August Service', quantity: 1, unitPrice: 50, totalPrice: 50, type: 'mietfach' }],
        subtotal: 50,
        tax: 9.50,
        totalAmount: 59.50
      });
      await augInvoice.save();

      // Create invoice for September (should restart at 00001)
      const sepNumber = await InvoiceModel.generateInvoiceNumber(2025, 9);
      expect(augNumber).toBe('RE-2025-08-00001');
      expect(sepNumber).toBe('RE-2025-09-00001');
    });
  });

  describe('Invoice Status Updates', () => {
    let testInvoice: any;

    beforeEach(async () => {
      testInvoice = new Invoice({
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        status: 'sent',
        items: [{ description: 'Test Service', quantity: 1, unitPrice: 100, totalPrice: 100, type: 'mietfach' }],
        subtotal: 100,
        tax: 19,
        totalAmount: 119
      });
      await testInvoice.save();
    });

    it('should mark invoice as paid with timestamp', async () => {
      const beforePaid = new Date();
      await testInvoice.markAsPaid();
      const afterPaid = new Date();

      const updatedInvoice = await Invoice.findById(testInvoice._id);
      
      expect(updatedInvoice?.status).toBe('paid');
      expect(updatedInvoice?.paidDate).toBeDefined();
      expect(updatedInvoice?.paidDate!.getTime()).toBeGreaterThanOrEqual(beforePaid.getTime());
      expect(updatedInvoice?.paidDate!.getTime()).toBeLessThanOrEqual(afterPaid.getTime());
    });

    it('should update invoice status directly', async () => {
      testInvoice.status = 'overdue';
      await testInvoice.save();

      const updatedInvoice = await Invoice.findById(testInvoice._id);
      expect(updatedInvoice?.status).toBe('overdue');
    });
  });

  describe('Pre-save Calculations', () => {
    it('should recalculate totals when items change', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 25, totalPrice: 50, type: 'mietfach' },
          { description: 'Item 2', quantity: 1, unitPrice: 30, totalPrice: 30, type: 'zusatzleistung' }
        ],
        subtotal: 0, // Will be calculated
        tax: 15.20, // absoluter USt-Betrag (19% von 80,00 €)
        totalAmount: 0 // Will be calculated
      });

      await invoice.save();

      // Verify calculations were applied (totalAmount = subtotal + tax)
      expect(invoice.subtotal).toBe(80);
      expect(invoice.totalAmount).toBeCloseTo(95.20, 2); // 80 + 15,20
    });

    it('should recalculate when tax amount changes', async () => {
      const invoice = new Invoice({
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        items: [{ description: 'Service', quantity: 1, unitPrice: 100, totalPrice: 100, type: 'mietfach' }],
        subtotal: 100,
        tax: 7, // abweichender USt-Betrag (z. B. 7% von 100,00 €)
        totalAmount: 0 // Will be calculated
      });

      await invoice.save();

      expect(invoice.totalAmount).toBeCloseTo(107, 2); // 100 + 7
    });
  });

  describe('Overdue Detection', () => {
    it('should detect overdue sent invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const invoice = new Invoice({
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        status: 'sent',
        dueDate: pastDate,
        items: [{ description: 'Service', quantity: 1, unitPrice: 100, totalPrice: 100, type: 'mietfach' }],
        subtotal: 100,
        tax: 19,
        totalAmount: 119
      });

      await invoice.save();

      expect(invoice.isOverdue()).toBe(true);
    });

    it('should not mark non-sent invoices as overdue', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const invoice = new Invoice({
        invoiceNumber: 'RE-2025-08-00001',
        vendor: testVendorId,
        period: { month: 8, year: 2025 },
        status: 'draft',
        dueDate: pastDate,
        items: [{ description: 'Service', quantity: 1, unitPrice: 100, totalPrice: 100, type: 'mietfach' }],
        subtotal: 100,
        tax: 19,
        totalAmount: 119
      });

      await invoice.save();

      expect(invoice.isOverdue()).toBe(false);
    });
  });
});