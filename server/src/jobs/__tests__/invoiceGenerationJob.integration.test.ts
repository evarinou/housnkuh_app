/**
 * @file invoiceGenerationJob.integration.test.ts
 * @purpose Integration tests for InvoiceGenerationJob with real database interactions
 * @created 2025-09-04
 * @modified 2026-07-07
 */

// Mongo-Verbindung & Cleanup kommen global aus tests/setup.ts (MongoMemoryServer).
import mongoose from 'mongoose';
import { InvoiceGenerationJob } from '../invoiceGenerationJob';
import User from '../../models/User';
import Invoice from '../../models/Invoice';
import Vertrag from '../../models/Vertrag';
import { ScheduledJobs } from '../../services/scheduledJobs';

/**
 * Nur Date faken (setSystemTime), echte Timer unangetastet lassen –
 * sonst blockieren die MongoDB-Treiber-Timeouts unter fake timers.
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
    username: `job-int-vendor-${vendorCounter}-${new mongoose.Types.ObjectId()}`,
    password: 'testpasswort',
    registrationStatus: 'active',
    trialEndDate: new Date('2024-11-30'), // Trial beendet
    kontakt: {
      name: `Integration Test Vendor ${vendorCounter}`,
      email: `job-int-${vendorCounter}@test.de`,
      mailNewsletter: false,
      status: 'aktiv'
    },
    vendorProfile: {
      unternehmen: `Integration Test Vendor ${vendorCounter} GmbH`,
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
    totalMonthlyPrice: 99.99,
    contractDuration: 12,
    provisionssatz: 4,
    scheduledStartDate: new Date('2024-11-01'),
    zahlungspflichtigAb: new Date('2024-11-01'),
    istProbemonatBuchung: false,
    ...overrides
  } as any);
};

describe('InvoiceGenerationJob Integration Tests', () => {
  afterEach(() => {
    jest.useRealTimers();
    InvoiceGenerationJob.stop();
  });

  describe('Real Database Invoice Generation', () => {
    it('should generate invoices for eligible vendors with real data', async () => {
      const vendor = await makeVendor();
      // Hinweis: Zusatzleistungen erfordern laut Vertrag-Validierung ein
      // gebuchtes Mietfach (services) – hier reicht die Basis-Miete.
      await makeVertrag(vendor._id);

      // System time to January 2025 (so we generate invoice for December 2024)
      fakeDateOnly('2025-01-15T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        // Verify invoice was created
        const invoices = await Invoice.find({ vendor: vendor._id });
        expect(invoices).toHaveLength(1);

        const invoice = invoices[0];
        expect(invoice.period.month).toBe(12); // December
        expect(invoice.period.year).toBe(2024);
        expect(invoice.status).toBe('draft');
        expect(invoice.items.length).toBeGreaterThan(0);
        expect(invoice.totalAmount).toBeGreaterThan(0);
        expect(invoice.invoiceNumber).toMatch(/^RE-2024-12-\d{5}$/);
        // Neue Tax-Semantik: tax ist absoluter Betrag, totalAmount = subtotal + tax
        expect(invoice.totalAmount).toBeCloseTo(invoice.subtotal + invoice.tax, 2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should skip vendors still in trial period', async () => {
      // Trial endet erst in ferner Zukunft → nicht abrechnungsberechtigt
      const vendor = await makeVendor({ trialEndDate: new Date('2099-01-01') });
      await makeVertrag(vendor._id);

      await InvoiceGenerationJob.run();

      const invoices = await Invoice.find({ vendor: vendor._id });
      expect(invoices).toHaveLength(0);
    });

    it('should not generate duplicate invoices', async () => {
      const vendor = await makeVendor();
      await makeVertrag(vendor._id);

      // Create existing invoice for the same period
      const existingInvoice = new Invoice({
        invoiceNumber: 'RE-2024-12-00001',
        vendor: vendor._id,
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
        const invoices = await Invoice.find({ vendor: vendor._id });
        expect(invoices).toHaveLength(1);
        expect(invoices[0]._id).toEqual(existingInvoice._id);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle vendors with no billable items gracefully', async () => {
      // Vendor ohne Vertrag → keine abrechenbaren Positionen
      const vendor = await makeVendor();

      fakeDateOnly('2025-01-15T03:00:00Z');

      try {
        await InvoiceGenerationJob.run();

        const invoices = await Invoice.find({ vendor: vendor._id });
        expect(invoices).toHaveLength(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('ScheduledJobs Integration', () => {
    it('should schedule and stop the invoice generation job', () => {
      expect(InvoiceGenerationJob.isRunning()).toBe(false);

      InvoiceGenerationJob.init();
      expect(InvoiceGenerationJob.isRunning()).toBe(true);

      InvoiceGenerationJob.stop();
      expect(InvoiceGenerationJob.isRunning()).toBe(false);
    });

    it('should support manual triggering through ScheduledJobs', async () => {
      const vendor = await makeVendor();
      await makeVertrag(vendor._id, {
        totalMonthlyPrice: 50.00,
        scheduledStartDate: new Date('2024-12-01'),
        zahlungspflichtigAb: new Date('2024-12-01')
      });

      // Test manual trigger
      const result = await ScheduledJobs.triggerInvoiceGeneration(2024, 12);

      expect(result.success).toBe(true);
      expect(result.type).toBe('monthly');
      expect(result.period).toBe('12/2024');

      // Verify invoice was created
      const invoices = await Invoice.find({ vendor: vendor._id });
      expect(invoices).toHaveLength(1);
      expect(invoices[0].invoiceNumber).toMatch(/^RE-2024-12-\d{5}$/);
    });

    it('should handle manual trigger errors gracefully', async () => {
      // Test with invalid vendor ID
      const result = await ScheduledJobs.triggerInvoiceGeneration(2024, 12, 'invalid-vendor-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Month Boundary Testing', () => {
    it('should correctly calculate invoice period for different months', async () => {
      const vendor = await makeVendor({ trialEndDate: new Date('2023-01-01') });
      await makeVertrag(vendor._id, {
        totalMonthlyPrice: 30.00,
        scheduledStartDate: new Date('2023-01-01'),
        zahlungspflichtigAb: new Date('2023-01-01')
      });

      // Test different month boundaries
      const testCases = [
        { fakeNow: '2024-02-15T03:00:00Z', invoiceMonth: 1, year: 2024 },  // February -> January invoice
        { fakeNow: '2024-12-15T03:00:00Z', invoiceMonth: 11, year: 2024 }, // December -> November invoice
        { fakeNow: '2024-01-15T03:00:00Z', invoiceMonth: 12, year: 2023 }  // January -> December previous year invoice
      ];

      for (const testCase of testCases) {
        // Clear previous invoices
        await Invoice.deleteMany({ vendor: vendor._id });

        fakeDateOnly(testCase.fakeNow);

        try {
          await InvoiceGenerationJob.run();

          const invoices = await Invoice.find({ vendor: vendor._id });
          expect(invoices).toHaveLength(1);
          expect(invoices[0].period.month).toBe(testCase.invoiceMonth);
          expect(invoices[0].period.year).toBe(testCase.year);
        } finally {
          jest.useRealTimers();
        }
      }
    });
  });
});
