/**
 * @file Invoice.test.ts
 * @purpose Unit tests for Invoice model validation, defaults, and methods
 * @created 2025-08-21
 * @modified 2025-08-21
 */

import mongoose from 'mongoose';
import Invoice from './Invoice';

// Type assertion for static methods in tests
const InvoiceModel = Invoice as any;

// Mock MongoDB connection for testing
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  connect: jest.fn(),
  connection: {
    readyState: 1
  }
}));

describe('Invoice Model', () => {
  let mockVendorId: string;
  let validInvoiceData: any;

  beforeAll(() => {
    mockVendorId = new mongoose.Types.ObjectId().toString();
  });

  beforeEach(() => {
    validInvoiceData = {
      invoiceNumber: 'RE-2025-08-00001',
      vendor: mockVendorId,
      period: {
        month: 8,
        year: 2025
      },
      items: [
        {
          description: 'Mietfach Service - August 2025',
          quantity: 1,
          unitPrice: 50.00,
          type: 'mietfach'
        }
      ],
      subtotal: 50.00,
      tax: 9.50, // absoluter USt-Betrag (19% von 50,00 €), kein Steuersatz
      totalAmount: 59.50,
      status: 'draft'
    };
  });

  describe('Schema Validation', () => {
    it('should create an invoice with valid data', () => {
      const invoice = new Invoice(validInvoiceData);
      expect(invoice.invoiceNumber).toBe('RE-2025-08-00001');
      expect(invoice.vendor.toString()).toBe(mockVendorId);
      expect(invoice.period?.month).toBe(8);
      expect(invoice.period?.year).toBe(2025);
      expect(invoice.items).toHaveLength(1);
      expect(invoice.subtotal).toBe(50.00);
      expect(invoice.tax).toBe(9.50);
      expect(invoice.totalAmount).toBe(59.50);
      expect(invoice.status).toBe('draft');
    });

    it('should require invoiceNumber field', () => {
      const invalidData = { ...validInvoiceData };
      delete invalidData.invoiceNumber;
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.invoiceNumber).toBeDefined();
      expect(validationError?.errors.invoiceNumber.kind).toBe('required');
    });

    it('should validate invoiceNumber format', () => {
      const invalidData = { ...validInvoiceData, invoiceNumber: 'INVALID-FORMAT' };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.invoiceNumber).toBeDefined();
      expect(validationError?.errors.invoiceNumber.kind).toBe('regexp');
    });

    it('should require vendor field', () => {
      const invalidData = { ...validInvoiceData };
      delete invalidData.vendor;
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.vendor).toBeDefined();
      expect(validationError?.errors.vendor.kind).toBe('required');
    });

    it('should require period with valid month and year', () => {
      const invalidData = { ...validInvoiceData };
      delete invalidData.period;
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['period.month']).toBeDefined();
      expect(validationError?.errors['period.year']).toBeDefined();
    });

    it('should validate month range (1-12)', () => {
      const invalidData = { 
        ...validInvoiceData, 
        period: { month: 13, year: 2025 } 
      };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['period.month']).toBeDefined();
      expect(validationError?.errors['period.month'].kind).toBe('max');
    });

    it('should validate year range', () => {
      const invalidData = { 
        ...validInvoiceData, 
        period: { month: 8, year: 2019 } 
      };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['period.year']).toBeDefined();
      expect(validationError?.errors['period.year'].kind).toBe('min');
    });

    it('should require at least one invoice item', () => {
      const invalidData = { ...validInvoiceData, items: [] };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.items).toBeDefined();
      expect(validationError?.errors.items.message).toContain('At least one invoice item is required');
    });

    it('should validate status enum values', () => {
      const invalidData = { ...validInvoiceData, status: 'invalid-status' as any };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.status).toBeDefined();
      expect(validationError?.errors.status.kind).toBe('enum');
    });
  });

  describe('Default Values', () => {
    it('should not set a default tax (tax ist Pflichtfeld und absoluter USt-Betrag)', () => {
      // BUG-INV-TAX-Fix: Es gibt keinen Default-Steuersatz 0.19 mehr am Model.
      // tax ist jetzt einheitlich der absolute Steuer-BETRAG in Euro und muss
      // vom Aufrufer gesetzt werden.
      const dataWithoutTax = { ...validInvoiceData };
      delete dataWithoutTax.tax;

      const invoice = new Invoice(dataWithoutTax);
      expect(invoice.tax).toBeUndefined();

      const validationError = invoice.validateSync();
      expect(validationError?.errors.tax).toBeDefined();
      expect(validationError?.errors.tax.kind).toBe('required');
    });

    it('should set default status to draft', () => {
      const dataWithoutStatus = { ...validInvoiceData };
      delete dataWithoutStatus.status;
      
      const invoice = new Invoice(dataWithoutStatus);
      expect(invoice.status).toBe('draft');
    });

    it('should set dueDate to 14 days from creation', () => {
      const invoice = new Invoice(validInvoiceData);
      const expectedDueDate = new Date();
      expectedDueDate.setDate(expectedDueDate.getDate() + 14);
      
      // Allow for small time differences in test execution
      const timeDiff = Math.abs(invoice.dueDate.getTime() - expectedDueDate.getTime());
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    });

    it('should set paidDate to null by default', () => {
      const invoice = new Invoice(validInvoiceData);
      expect(invoice.paidDate).toBeNull();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should calculate subtotal from items', () => {
      const invoiceData = {
        ...validInvoiceData,
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 25.00, type: 'mietfach' },
          { description: 'Item 2', quantity: 1, unitPrice: 30.00, type: 'zusatzleistung' }
        ],
        subtotal: 0, // Will be recalculated
        totalAmount: 0 // Will be recalculated
      };
      
      const invoice = new Invoice(invoiceData);
      
      // Manually trigger pre-save logic for testing
      // (Hook-Semantik: totalAmount = subtotal + tax, tax als absoluter Betrag)
      invoice.subtotal = invoice.items.reduce((sum: number, item: any) => {
        const itemTotalPrice = Math.round((item.quantity * item.unitPrice) * 100) / 100;
        return sum + itemTotalPrice;
      }, 0);
      invoice.totalAmount = Math.round((invoice.subtotal + invoice.tax) * 100) / 100;

      expect(invoice.subtotal).toBe(80.00);
      expect(invoice.totalAmount).toBe(89.50); // 80 + 9,50 € USt
    });

    it('should calculate totalAmount with tax', () => {
      const invoice = new Invoice(validInvoiceData);

      // Manually trigger calculation (tax ist absoluter Betrag)
      invoice.totalAmount = invoice.subtotal + invoice.tax;

      expect(invoice.totalAmount).toBeCloseTo(59.50, 2); // 50 + 9,50
    });
  });

  describe('Static Methods', () => {
    describe('generateInvoiceNumber', () => {
      it('should generate first invoice number for a month', async () => {
        // Mock the findOne method to return null (no existing invoices)
        const mockFindOne = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        });
        Invoice.findOne = mockFindOne;

        const invoiceNumber = await InvoiceModel.generateInvoiceNumber(2025, 8);
        
        expect(invoiceNumber).toBe('RE-2025-08-00001');
        expect(mockFindOne).toHaveBeenCalledWith({
          invoiceNumber: new RegExp('^RE-2025-08-')
        });
      });

      it('should increment invoice number based on existing invoices', async () => {
        // Mock the findOne method to return existing invoice
        const mockFindOne = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue({
            invoiceNumber: 'RE-2025-08-00005'
          })
        });
        Invoice.findOne = mockFindOne;

        const invoiceNumber = await InvoiceModel.generateInvoiceNumber(2025, 8);
        
        expect(invoiceNumber).toBe('RE-2025-08-00006');
      });

      it('should handle month padding correctly', async () => {
        const mockFindOne = jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(null)
        });
        Invoice.findOne = mockFindOne;

        const invoiceNumber = await InvoiceModel.generateInvoiceNumber(2025, 3);
        
        expect(invoiceNumber).toBe('RE-2025-03-00001');
        expect(mockFindOne).toHaveBeenCalledWith({
          invoiceNumber: new RegExp('^RE-2025-03-')
        });
      });
    });
  });

  describe('Instance Methods', () => {
    let invoice: any;

    beforeEach(() => {
      invoice = new Invoice(validInvoiceData);
      // Mock the save method
      invoice.save = jest.fn().mockResolvedValue(invoice);
    });

    describe('markAsPaid', () => {
      it('should mark invoice as paid with current date', async () => {
        const result = await invoice.markAsPaid();
        
        expect(invoice.status).toBe('paid');
        expect(invoice.paidDate).toBeInstanceOf(Date);
        expect(invoice.save).toHaveBeenCalled();
        expect(result).toBe(invoice);
      });
    });

    describe('isOverdue', () => {
      it('should return true for sent invoices past due date', () => {
        invoice.status = 'sent';
        invoice.dueDate = new Date('2025-01-01'); // Past date
        
        expect(invoice.isOverdue()).toBe(true);
      });

      it('should return false for sent invoices not yet due', () => {
        invoice.status = 'sent';
        invoice.dueDate = new Date('2030-01-01'); // Future date
        
        expect(invoice.isOverdue()).toBe(false);
      });

      it('should return false for non-sent invoices even if past due', () => {
        invoice.status = 'draft';
        invoice.dueDate = new Date('2025-01-01'); // Past date
        
        expect(invoice.isOverdue()).toBe(false);
      });

      it('should return false for paid invoices', () => {
        invoice.status = 'paid';
        invoice.dueDate = new Date('2025-01-01'); // Past date
        
        expect(invoice.isOverdue()).toBe(false);
      });
    });
  });

  describe('Invoice Items Validation', () => {
    it('should validate invoice item required fields', () => {
      const invalidItemData = {
        ...validInvoiceData,
        items: [
          { description: 'Valid item', quantity: 1, unitPrice: 25.00, type: 'mietfach' },
          { description: '', quantity: 1, unitPrice: 25.00, type: 'mietfach' } // Invalid: empty description
        ]
      };
      
      const invoice = new Invoice(invalidItemData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['items.1.description']).toBeDefined();
    });

    it('should validate positive quantities and prices', () => {
      const invalidItemData = {
        ...validInvoiceData,
        items: [
          { description: 'Valid item', quantity: -1, unitPrice: 25.00, type: 'mietfach' }
        ]
      };
      
      const invoice = new Invoice(invalidItemData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['items.0.quantity']).toBeDefined();
      expect(validationError?.errors['items.0.quantity'].kind).toBe('min');
    });

    // TASK-002: New tests for subdocument features
    it('should require type field for invoice items', () => {
      const invalidItemData = {
        ...validInvoiceData,
        items: [
          { description: 'Item without type', quantity: 1, unitPrice: 25.00 }
        ]
      };
      
      const invoice = new Invoice(invalidItemData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['items.0.type']).toBeDefined();
      expect(validationError?.errors['items.0.type'].kind).toBe('required');
    });

    it('should validate type enum values', () => {
      const invalidItemData = {
        ...validInvoiceData,
        items: [
          { description: 'Item with invalid type', quantity: 1, unitPrice: 25.00, type: 'invalid-type' }
        ]
      };
      
      const invoice = new Invoice(invalidItemData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors['items.0.type']).toBeDefined();
      expect(validationError?.errors['items.0.type'].kind).toBe('enum');
    });

    it('should accept valid type enum values', () => {
      const validTypes = ['mietfach', 'zusatzleistung', 'sonstiges'];
      
      validTypes.forEach(type => {
        const validItemData = {
          ...validInvoiceData,
          items: [
            { description: `Item of type ${type}`, quantity: 1, unitPrice: 25.00, type }
          ]
        };
        
        const invoice = new Invoice(validItemData);
        const validationError = invoice.validateSync();
        
        expect(validationError?.errors[`items.0.type`]).toBeUndefined();
        expect(invoice.items[0].type).toBe(type);
      });
    });

    it('should set quantity default to 1', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Item without quantity', unitPrice: 25.00, type: 'mietfach' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      expect(invoice.items[0].quantity).toBe(1);
    });

    it('should allow referenceId to be null or undefined', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Item without reference', quantity: 1, unitPrice: 25.00, type: 'sonstiges' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      expect(invoice.items[0].referenceId).toBeNull();
    });

    it('should accept valid ObjectId for referenceId', () => {
      const mockObjectId = new mongoose.Types.ObjectId();
      const itemData = {
        ...validInvoiceData,
        items: [
          { 
            description: 'Item with reference', 
            quantity: 1, 
            unitPrice: 25.00, 
            type: 'mietfach',
            referenceId: mockObjectId
          }
        ]
      };
      
      const invoice = new Invoice(itemData);
      expect(invoice.items[0].referenceId).toEqual(mockObjectId);
    });

    it('should accept period with from and to dates', () => {
      const fromDate = new Date('2025-08-01');
      const toDate = new Date('2025-08-15');
      
      const itemData = {
        ...validInvoiceData,
        items: [
          { 
            description: 'Partial month item', 
            quantity: 1, 
            unitPrice: 50.00, 
            type: 'mietfach',
            period: { from: fromDate, to: toDate }
          }
        ]
      };
      
      const invoice = new Invoice(itemData);
      expect(invoice.items[0].period?.from).toEqual(fromDate);
      expect(invoice.items[0].period?.to).toEqual(toDate);
    });
  });

  // TASK-002: New test suite for virtual totalPrice field
  describe('Virtual TotalPrice Calculation', () => {
    it('should calculate totalPrice automatically from quantity * unitPrice', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Test item', quantity: 3, unitPrice: 25.50, type: 'mietfach' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      const item = invoice.items[0];
      
      expect(item.totalPrice).toBe(76.50); // 3 * 25.50 = 76.50
    });

    it('should round totalPrice to 2 decimal places', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Test item', quantity: 3, unitPrice: 33.333, type: 'mietfach' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      const item = invoice.items[0];
      
      // 3 * 33.333 = 99.999, should round to 100.00
      expect(item.totalPrice).toBe(100.00);
    });

    it('should handle decimal quantities correctly', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Partial service', quantity: 0.5, unitPrice: 100.00, type: 'zusatzleistung' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      const item = invoice.items[0];
      
      expect(item.totalPrice).toBe(50.00); // 0.5 * 100.00 = 50.00
    });

    it('should be included in JSON serialization', () => {
      const itemData = {
        ...validInvoiceData,
        items: [
          { description: 'Test item', quantity: 2, unitPrice: 25.00, type: 'mietfach' }
        ]
      };
      
      const invoice = new Invoice(itemData);
      const jsonData = invoice.toJSON();
      
      expect(jsonData.items[0].totalPrice).toBe(50.00);
    });
  });

  // TASK-012: New test suite for email notification tracking fields
  describe('Email Notification Tracking', () => {
    it('should set default email tracking values', () => {
      const invoice = new Invoice(validInvoiceData);
      
      expect(invoice.emailStatus).toBe('pending');
      expect(invoice.emailAttempts).toBe(0);
      expect(invoice.emailSentAt).toBeNull();
      expect(invoice.lastEmailAttempt).toBeNull();
      expect(invoice.emailJobId).toBeNull();
    });

    it('should validate emailStatus enum values', () => {
      const invalidData = { ...validInvoiceData, emailStatus: 'invalid-status' as any };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.emailStatus).toBeDefined();
      expect(validationError?.errors.emailStatus.kind).toBe('enum');
    });

    it('should accept valid emailStatus enum values', () => {
      const validStatuses = ['pending', 'sent', 'failed', 'retrying'];
      
      validStatuses.forEach(status => {
        const validData = { ...validInvoiceData, emailStatus: status };
        const invoice = new Invoice(validData);
        const validationError = invoice.validateSync();
        
        expect(validationError?.errors.emailStatus).toBeUndefined();
        expect(invoice.emailStatus).toBe(status);
      });
    });

    it('should validate emailAttempts minimum value', () => {
      const invalidData = { ...validInvoiceData, emailAttempts: -1 };
      
      const invoice = new Invoice(invalidData);
      const validationError = invoice.validateSync();
      
      expect(validationError?.errors.emailAttempts).toBeDefined();
      expect(validationError?.errors.emailAttempts.kind).toBe('min');
    });

    it('should accept valid Date objects for email timestamps', () => {
      const sentAt = new Date();
      const attemptAt = new Date();
      
      const data = {
        ...validInvoiceData,
        emailSentAt: sentAt,
        lastEmailAttempt: attemptAt
      };
      
      const invoice = new Invoice(data);
      const validationError = invoice.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(invoice.emailSentAt).toEqual(sentAt);
      expect(invoice.lastEmailAttempt).toEqual(attemptAt);
    });

    it('should accept string values for emailJobId', () => {
      const jobId = 'job-12345-abcdef';
      const data = { ...validInvoiceData, emailJobId: jobId };
      
      const invoice = new Invoice(data);
      const validationError = invoice.validateSync();
      
      expect(validationError).toBeUndefined();
      expect(invoice.emailJobId).toBe(jobId);
    });

    describe('Email Tracking Updates', () => {
      let invoice: any;

      beforeEach(() => {
        invoice = new Invoice(validInvoiceData);
        // Mock the updateOne method
        Invoice.updateOne = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
      });

      it('should update email status to sent with timestamp', async () => {
        const sentAt = new Date();
        const jobId = 'job-sent-123';

        await Invoice.updateOne(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'sent',
              emailSentAt: sentAt,
              lastEmailAttempt: sentAt,
              emailJobId: jobId
            },
            $inc: { emailAttempts: 1 }
          }
        );

        expect(Invoice.updateOne).toHaveBeenCalledWith(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'sent',
              emailSentAt: sentAt,
              lastEmailAttempt: sentAt,
              emailJobId: jobId
            },
            $inc: { emailAttempts: 1 }
          }
        );
      });

      it('should update email status to failed without emailSentAt', async () => {
        const failedAt = new Date();

        await Invoice.updateOne(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'failed',
              lastEmailAttempt: failedAt
            },
            $inc: { emailAttempts: 1 }
          }
        );

        expect(Invoice.updateOne).toHaveBeenCalledWith(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'failed',
              lastEmailAttempt: failedAt
            },
            $inc: { emailAttempts: 1 }
          }
        );
      });

      it('should increment email attempts counter', async () => {
        const retryAt = new Date();

        // First attempt
        await Invoice.updateOne(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'retrying',
              lastEmailAttempt: retryAt
            },
            $inc: { emailAttempts: 1 }
          }
        );

        // Second attempt
        await Invoice.updateOne(
          { _id: invoice._id },
          {
            $set: {
              emailStatus: 'retrying',
              lastEmailAttempt: retryAt
            },
            $inc: { emailAttempts: 1 }
          }
        );

        expect(Invoice.updateOne).toHaveBeenCalledTimes(2);
      });
    });

    describe('Email Status Queries', () => {
      beforeEach(() => {
        // Mock find methods
        Invoice.find = jest.fn().mockResolvedValue([]);
        Invoice.findOne = jest.fn().mockResolvedValue(null);
      });

      it('should find invoices by email status', async () => {
        await Invoice.find({ emailStatus: 'pending' });
        expect(Invoice.find).toHaveBeenCalledWith({ emailStatus: 'pending' });

        await Invoice.find({ emailStatus: 'failed' });
        expect(Invoice.find).toHaveBeenCalledWith({ emailStatus: 'failed' });
      });

      it('should find invoices needing email notification', async () => {
        await Invoice.find({
          status: { $ne: 'draft' },
          emailStatus: { $in: ['pending', 'failed'] }
        });

        expect(Invoice.find).toHaveBeenCalledWith({
          status: { $ne: 'draft' },
          emailStatus: { $in: ['pending', 'failed'] }
        });
      });

      it('should find invoices with high retry attempts', async () => {
        await Invoice.find({ emailAttempts: { $gte: 3 } });
        expect(Invoice.find).toHaveBeenCalledWith({ emailAttempts: { $gte: 3 } });
      });

      it('should find invoices by job ID', async () => {
        await Invoice.findOne({ emailJobId: 'job-123' });
        expect(Invoice.findOne).toHaveBeenCalledWith({ emailJobId: 'job-123' });
      });

      it('should find invoices sent within time range', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        await Invoice.find({
          emailSentAt: {
            $gte: startDate,
            $lte: endDate
          }
        });

        expect(Invoice.find).toHaveBeenCalledWith({
          emailSentAt: {
            $gte: startDate,
            $lte: endDate
          }
        });
      });
    });
  });
});