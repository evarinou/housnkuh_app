/**
 * @file invoice-flow-integration.test.ts
 * @purpose Integration tests for invoice generation and management workflow
 * @created 2025-01-17
 * @modified 2026-07-07
 */

// Mongo-Verbindung & Cleanup kommen global aus tests/setup.ts (MongoMemoryServer).
import mongoose from 'mongoose';
import User from '../models/User';
import Invoice from '../models/Invoice';
import Vertrag from '../models/Vertrag';
import { InvoiceGenerationJob } from '../jobs/invoiceGenerationJob';
import { ScheduledJobs } from '../services/scheduledJobs';

// Mock external services
jest.mock('../utils/emailService', () => ({
  sendInvoiceNotification: jest.fn().mockResolvedValue({ success: true }),
  sendCustomEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/pdf/invoicePdfService', () => ({
  invoicePdfService: {
    generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content'))
  }
}));

/**
 * Nur Date faken, echte Timer unangetastet lassen – sonst blockieren die
 * MongoDB-Treiber-Timeouts unter fake timers.
 */
const fakeDateOnly = (iso: string) =>
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: [
      'hrtime', 'nextTick', 'performance', 'queueMicrotask',
      'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback',
      'setImmediate', 'clearImmediate',
      'setInterval', 'clearInterval',
      'setTimeout', 'clearTimeout'
    ]
  });

let vendorCounter = 0;
const makeVendor = async (overrides: Record<string, any> = {}): Promise<any> => {
  vendorCounter++;
  return User.create({
    isVendor: true,
    isFullAccount: true,
    username: `flow-vendor-${vendorCounter}-${new mongoose.Types.ObjectId()}`,
    password: 'testpasswort',
    registrationStatus: 'active',
    trialEndDate: new Date('2023-06-01'), // Trial lange beendet
    kontakt: {
      name: `Flow Test Vendor ${vendorCounter}`,
      email: `flow-${vendorCounter}@test.de`,
      mailNewsletter: false,
      status: 'aktiv'
    },
    vendorProfile: {
      unternehmen: `Flow Test Vendor ${vendorCounter} GmbH`,
      provisionssatz: 4,
      modelltyp: 'Basic'
    },
    ...overrides
  } as any);
};

const makeVertrag = async (userId: mongoose.Types.ObjectId, overrides: Record<string, any> = {}): Promise<any> => {
  return Vertrag.create({
    user: userId,
    status: 'active',
    totalMonthlyPrice: 149.99,
    contractDuration: 12,
    provisionssatz: 4,
    scheduledStartDate: new Date('2023-06-01'),
    zahlungspflichtigAb: new Date('2023-06-01'),
    istProbemonatBuchung: false,
    ...overrides
  } as any);
};

describe('Invoice Flow Integration Tests', () => {
  let testVendor: any;

  beforeEach(async () => {
    testVendor = await makeVendor();
    await makeVertrag(testVendor._id);
  });

  afterEach(async () => {
    jest.useRealTimers();
    InvoiceGenerationJob.stop();
    jest.clearAllMocks();
  });

  describe('Invoice Generation Workflow', () => {
    it('should generate invoice for eligible vendor', async () => {
      // Mock system time to trigger invoice generation for December 2024
      fakeDateOnly('2025-01-01T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        // Verify invoice was created
        const invoices = await Invoice.find({ vendor: testVendor._id });
        expect(invoices).toHaveLength(1);

        const invoice = invoices[0];
        expect(invoice.period.month).toBe(12); // December 2024
        expect(invoice.period.year).toBe(2024);
        expect(invoice.status).toBe('draft');
        expect(invoice.items.length).toBeGreaterThan(0);
        expect(invoice.totalAmount).toBeGreaterThan(0);
        expect(invoice.invoiceNumber).toMatch(/^RE-\d{4}-\d{2}-\d{5}$/);
        // Neue Tax-Semantik: tax = absoluter USt-Betrag, totalAmount = subtotal + tax
        expect(invoice.totalAmount).toBeCloseTo(invoice.subtotal + invoice.tax, 2);
        expect(invoice.tax).toBeCloseTo(invoice.subtotal * 0.19, 2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should skip vendors still in trial period', async () => {
      // Update vendor to be still in trial (Trial endet in der Zukunft)
      testVendor.trialEndDate = new Date('2099-02-01');
      await testVendor.save();

      await InvoiceGenerationJob.run();

      // Should not generate any invoices
      const invoices = await Invoice.find({ vendor: testVendor._id });
      expect(invoices).toHaveLength(0);
    });

    it('should not generate duplicate invoices', async () => {
      // Create existing invoice for the same period
      const existingInvoice = new Invoice({
        invoiceNumber: 'RE-2024-12-00001',
        vendor: testVendor._id,
        period: { month: 12, year: 2024 },
        items: [{
          description: 'Test Item',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
          type: 'mietfach'
        }],
        subtotal: 50.00,
        tax: 9.50, // absoluter USt-Betrag
        totalAmount: 59.50,
        status: 'draft',
        dueDate: new Date()
      });
      await existingInvoice.save();

      fakeDateOnly('2025-01-15T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        // Should still have only the original invoice
        const invoices = await Invoice.find({ vendor: testVendor._id });
        expect(invoices).toHaveLength(1);
        expect(invoices[0]._id).toEqual(existingInvoice._id);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle multiple vendors in batch processing', async () => {
      // Create additional vendors with contracts
      for (let i = 0; i < 3; i++) {
        const vendor = await makeVendor();
        await makeVertrag(vendor._id, { totalMonthlyPrice: 99.99 });
      }

      fakeDateOnly('2025-01-01T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        // Verify all eligible vendors got invoices (original + 3 new = 4 total)
        const generatedInvoices = await Invoice.find({});
        expect(generatedInvoices).toHaveLength(4);

        // Verify all invoices have correct period
        for (const invoice of generatedInvoices) {
          expect(invoice.period.month).toBe(12);
          expect(invoice.period.year).toBe(2024);
          expect(invoice.status).toBe('draft');
        }
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('Manual Invoice Generation', () => {
    it('should support manual triggering through ScheduledJobs service', async () => {
      const result = await ScheduledJobs.triggerInvoiceGeneration(2024, 11, testVendor._id.toString());

      expect(result.success).toBe(true);
      expect(result.type).toBe('vendor-specific');
      expect(result.vendorId).toBe(testVendor._id.toString());
      expect(result.period).toBe('11/2024');

      const invoice = await Invoice.findOne({
        vendor: testVendor._id,
        'period.month': 11,
        'period.year': 2024
      });
      expect(invoice).toBeDefined();
      expect(invoice!.vendor.toString()).toBe(testVendor._id.toString());
    });

    it('should handle manual trigger errors gracefully', async () => {
      // Test with invalid vendor ID
      const result = await ScheduledJobs.triggerInvoiceGeneration(2024, 12, 'invalid-vendor-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Invoice Period Calculations', () => {
    it('should correctly calculate invoice period for different months', async () => {
      const testCases = [
        { fakeNow: '2024-02-15T03:00:00Z', invoiceMonth: 1, year: 2024 },  // February -> January invoice
        { fakeNow: '2024-12-15T03:00:00Z', invoiceMonth: 11, year: 2024 }, // December -> November invoice
        { fakeNow: '2024-01-15T03:00:00Z', invoiceMonth: 12, year: 2023 }  // January -> December previous year invoice
      ];

      for (const testCase of testCases) {
        // Clear previous invoices
        await Invoice.deleteMany({ vendor: testVendor._id });

        fakeDateOnly(testCase.fakeNow);

        try {
          await InvoiceGenerationJob.run();

          const invoices = await Invoice.find({ vendor: testVendor._id });
          expect(invoices).toHaveLength(1);
          expect(invoices[0].period.month).toBe(testCase.invoiceMonth);
          expect(invoices[0].period.year).toBe(testCase.year);
        } finally {
          jest.useRealTimers();
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle vendors with no billable items gracefully', async () => {
      // Remove the contract (no billable items)
      await Vertrag.deleteMany({ user: testVendor._id });

      fakeDateOnly('2025-01-15T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        // Should not create any invoices for vendors with no billable items
        const invoices = await Invoice.find({ vendor: testVendor._id });
        expect(invoices).toHaveLength(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle repeated invoice generation requests', async () => {
      // Erste Anforderung legt die Rechnung an …
      const first = await ScheduledJobs.triggerInvoiceGeneration(2024, 11, testVendor._id.toString());
      expect(first.success).toBe(true);

      // … weitere (auch parallele) Anforderungen scheitern kontrolliert an
      // der Duplikatsprüfung. (Bewusst sequenziell nach der ersten Rechnung:
      // die Existenzprüfung in generateMonthlyInvoice ist nicht atomar.)
      const retries = await Promise.all([
        ScheduledJobs.triggerInvoiceGeneration(2024, 11, testVendor._id.toString()),
        ScheduledJobs.triggerInvoiceGeneration(2024, 11, testVendor._id.toString())
      ]);

      retries.forEach(result => {
        expect(result.success).toBe(false);
        expect(String(result.error)).toContain('already exists');
      });

      // Verify only one invoice was actually created
      const invoices = await Invoice.find({
        vendor: testVendor._id,
        'period.month': 11,
        'period.year': 2024
      });
      expect(invoices).toHaveLength(1);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should generate invoices within performance thresholds', async () => {
      // Create 10 vendors for performance testing
      for (let i = 0; i < 10; i++) {
        const vendor = await makeVendor();
        await makeVertrag(vendor._id, { totalMonthlyPrice: Math.random() * 200 + 50 });
      }

      const startTime = Date.now();

      // Generate invoices for all vendors (Vormonat relativ zu "jetzt")
      await InvoiceGenerationJob.run();

      const executionTime = Date.now() - startTime;
      const averageTimePerInvoice = executionTime / 11; // 10 + original test vendor

      // Verify performance metrics (generous thresholds for CI)
      expect(executionTime).toBeLessThan(30000); // Under 30 seconds for 11 invoices
      expect(averageTimePerInvoice).toBeLessThan(3000); // Under 3 seconds per invoice

      // Verify all invoices were created
      const invoices = await Invoice.find({});
      expect(invoices).toHaveLength(11);

      console.log(`Performance: ${executionTime}ms total, ${averageTimePerInvoice.toFixed(2)}ms per invoice`);
    });
  });
});
