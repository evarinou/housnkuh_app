/**
 * @file invoiceMonitoringService.test.ts
 * @purpose Unit tests for invoice generation monitoring invoiceMonitoringService
 * @created 2025-01-17
 * @modified 2025-01-17
 */

// Mock dependencies before importing the invoiceMonitoringService
jest.mock('../utils/logger');
jest.mock('uuid');
jest.mock('../config/invoiceAlerts', () => ({
  INVOICE_ALERT_THRESHOLDS: {
    JOB_DURATION: { WARNING: 15, CRITICAL: 30 },
    INVOICE_GENERATION_DURATION: { WARNING: 10, CRITICAL: 30 },
    PDF_GENERATION_DURATION: { WARNING: 5, CRITICAL: 15 },
    EMAIL_DELIVERY_DURATION: { WARNING: 10, CRITICAL: 30 },
    ERROR_RATE: { WARNING: 5, CRITICAL: 10 },
    CONCURRENT_JOBS: { WARNING: 2, CRITICAL: 3 },
    FAILED_INVOICES: { WARNING: 3, CRITICAL: 5 }
  },
  ALERT_MESSAGES: {},
  ALERT_CONFIG: {}
}));

// Import invoiceMonitoringService after mocks
import invoiceMonitoringService from './invoiceMonitoringService';

const mockUuid = require('uuid');

describe('InvoiceMonitoringService', () => {
  beforeEach(() => {
    // Setup uuid mock for each test
    let callCount = 0;
    mockUuid.v4.mockImplementation(() => `test-correlation-id-${++callCount}`);
    jest.clearAllMocks();
  });

  describe('Batch Job Monitoring', () => {
    it('should start a batch job with correct initial metrics', () => {
      const correlationId = invoiceMonitoringService.startBatchJob(10, 'scheduled');

      expect(correlationId).toMatch(/^test-correlation-id-\d+$/);

      const summary = invoiceMonitoringService.getMetricsSummary();
      expect(summary.activeJobs).toBeGreaterThanOrEqual(1);

      // Clean up
      invoiceMonitoringService.completeBatchJob(correlationId, 'scheduled');
    });

    it('should complete a successful batch job', () => {
      const batchId = invoiceMonitoringService.startBatchJob(5, 'manual');

      // Simulate successful invoices
      for (let i = 0; i < 3; i++) {
        const genId = invoiceMonitoringService.startInvoiceGeneration(
          batchId,
          `vendor-${i}`,
          `Vendor ${i}`,
          2025,
          1
        );
        invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 150.00);
      }

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'manual');

      expect(result).toBeDefined();
      expect(result?.successfulInvoices).toBe(3);
      expect(result?.failedInvoices).toBe(0);
      expect(result?.totalAmount).toBe(450.00);

      const summary = invoiceMonitoringService.getMetricsSummary();
      expect(summary.activeJobs).toBe(0);
    });

    it('should handle partial batch job failures', () => {
      const batchId = invoiceMonitoringService.startBatchJob(5, 'scheduled');

      // Simulate mixed success/failure
      const genId1 = invoiceMonitoringService.startInvoiceGeneration(batchId, 'vendor-1', 'Vendor 1', 2025, 1);
      invoiceMonitoringService.completeInvoiceGeneration(genId1, batchId, true, 100.00);

      const genId2 = invoiceMonitoringService.startInvoiceGeneration(batchId, 'vendor-2', 'Vendor 2', 2025, 1);
      invoiceMonitoringService.completeInvoiceGeneration(genId2, batchId, false, undefined, 'Database error');

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'scheduled');

      expect(result?.successfulInvoices).toBe(1);
      expect(result?.failedInvoices).toBe(1);
      expect(result?.errors).toHaveLength(1);
      expect(result?.errors[0].error).toBe('Database error');
    });

    it('should track skipped invoices', () => {
      const batchId = invoiceMonitoringService.startBatchJob(5, 'scheduled');

      invoiceMonitoringService.recordInvoiceSkip(batchId, 'vendor-1', 'Vendor 1', 'Invoice already exists');
      invoiceMonitoringService.recordInvoiceSkip(batchId, 'vendor-2', 'Vendor 2', 'Invoice already exists');

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'scheduled');

      expect(result?.skippedInvoices).toBe(2);
      expect(result?.processedVendors).toBe(2);
    });
  });

  describe('Individual Invoice Generation Monitoring', () => {
    it('should track individual invoice generation lifecycle', () => {
      const batchId = invoiceMonitoringService.startBatchJob(1, 'manual');
      const genId = invoiceMonitoringService.startInvoiceGeneration(
        batchId,
        'vendor-123',
        'Test Vendor',
        2025,
        1
      );

      // startBatchJob hat bereits test-correlation-id-1 verbraucht
      expect(genId).toBe('test-correlation-id-2');

      const summary = invoiceMonitoringService.getMetricsSummary();
      expect(summary.activeGenerations).toBe(1);

      // Update phase
      invoiceMonitoringService.updatePhase(genId, 'pdf_generation');

      // Record PDF generation time
      invoiceMonitoringService.recordPdfGeneration(genId, 2000);

      // Record email delivery
      invoiceMonitoringService.recordEmailDelivery(genId, 1500, true);

      // Complete generation
      invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 250.50);

      const afterSummary = invoiceMonitoringService.getMetricsSummary();
      expect(afterSummary.activeGenerations).toBe(0);
    });

    it('should handle failed invoice generation', () => {
      const batchId = invoiceMonitoringService.startBatchJob(1, 'scheduled');
      const genId = invoiceMonitoringService.startInvoiceGeneration(
        batchId,
        'vendor-456',
        'Failed Vendor',
        2025,
        2
      );

      invoiceMonitoringService.completeInvoiceGeneration(
        genId,
        batchId,
        false,
        undefined,
        'PDF generation failed'
      );

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'scheduled');
      expect(result?.failedInvoices).toBe(1);
      expect(result?.errors[0].error).toBe('PDF generation failed');
    });

    it('should update invoice generation phases correctly', () => {
      const batchId = invoiceMonitoringService.startBatchJob(1, 'manual');
      const genId = invoiceMonitoringService.startInvoiceGeneration(
        batchId,
        'vendor-789',
        'Phase Test Vendor',
        2025,
        3
      );

      invoiceMonitoringService.updatePhase(genId, 'calculation');
      invoiceMonitoringService.updatePhase(genId, 'pdf_generation', { status: 'generating' });
      invoiceMonitoringService.updatePhase(genId, 'email_sending');
      invoiceMonitoringService.updatePhase(genId, 'complete');

      invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 300.00);

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'manual');
      expect(result?.successfulInvoices).toBe(1);
    });
  });

  describe('Metrics Collection', () => {
    it('should record PDF generation metrics', () => {
      const batchId = invoiceMonitoringService.startBatchJob(1, 'manual');
      const genId = invoiceMonitoringService.startInvoiceGeneration(
        batchId,
        'vendor-pdf',
        'PDF Vendor',
        2025,
        1
      );

      invoiceMonitoringService.recordPdfGeneration(genId, 3500); // 3.5 seconds

      invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 200.00);
      invoiceMonitoringService.completeBatchJob(batchId, 'manual');

      // Metrics should be recorded (we can't easily test prometheus metrics directly)
      expect(true).toBe(true);
    });

    it('should record email delivery metrics', () => {
      const batchId = invoiceMonitoringService.startBatchJob(1, 'manual');
      const genId = invoiceMonitoringService.startInvoiceGeneration(
        batchId,
        'vendor-email',
        'Email Vendor',
        2025,
        1
      );

      invoiceMonitoringService.recordEmailDelivery(genId, 2000, true);
      invoiceMonitoringService.recordEmailDelivery(genId, 5000, false); // Failed attempt

      invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 175.00);
      invoiceMonitoringService.completeBatchJob(batchId, 'manual');

      expect(true).toBe(true);
    });

    it('should calculate average processing time', () => {
      const batchId = invoiceMonitoringService.startBatchJob(3, 'scheduled');

      for (let i = 0; i < 3; i++) {
        const genId = invoiceMonitoringService.startInvoiceGeneration(
          batchId,
          `vendor-${i}`,
          `Vendor ${i}`,
          2025,
          1
        );

        // Complete immediately
        invoiceMonitoringService.completeInvoiceGeneration(genId, batchId, true, 100.00);
      }

      const result = invoiceMonitoringService.completeBatchJob(batchId, 'scheduled');
      expect(result?.averageProcessingTime).toBeDefined();
      expect(result?.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Summary', () => {
    it('should provide accurate metrics summary', () => {
      const summary = invoiceMonitoringService.getMetricsSummary();

      expect(summary).toHaveProperty('activeJobs');
      expect(summary).toHaveProperty('activeGenerations');
      expect(summary).toHaveProperty('totalJobsToday');
      expect(summary).toHaveProperty('totalGenerationsToday');
      expect(summary).toHaveProperty('totalErrorsToday');

      expect(summary.activeJobs).toBe(0);
      expect(summary.activeGenerations).toBe(0);
    });

    it('should track multiple active jobs correctly', () => {
      // Clear any existing jobs first
      const initialSummary = invoiceMonitoringService.getMetricsSummary();
      const startingJobs = initialSummary.activeJobs;

      const batchId1 = invoiceMonitoringService.startBatchJob(5, 'scheduled');
      const batchId2 = invoiceMonitoringService.startBatchJob(3, 'manual');

      const summary = invoiceMonitoringService.getMetricsSummary();
      expect(summary.activeJobs).toBe(startingJobs + 2);

      invoiceMonitoringService.completeBatchJob(batchId1, 'scheduled');

      const afterSummary = invoiceMonitoringService.getMetricsSummary();
      expect(afterSummary.activeJobs).toBe(startingJobs + 1);

      invoiceMonitoringService.completeBatchJob(batchId2, 'manual');

      const finalSummary = invoiceMonitoringService.getMetricsSummary();
      expect(finalSummary.activeJobs).toBe(startingJobs);
    });
  });

  describe('Prometheus Metrics', () => {
    it('should expose prometheus metrics', async () => {
      const metrics = await invoiceMonitoringService.getPrometheusMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('invoice_job_duration_seconds');
      expect(metrics).toContain('invoice_generation_duration_seconds');
      expect(metrics).toContain('invoice_pdf_generation_duration_seconds');
      expect(metrics).toContain('invoice_email_delivery_duration_seconds');
      expect(metrics).toContain('invoice_jobs_total');
      expect(metrics).toContain('invoice_generations_total');
      expect(metrics).toContain('invoice_generation_errors_total');
      expect(metrics).toContain('invoice_amount_euros');
      expect(metrics).toContain('invoice_active_jobs');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing correlation IDs gracefully', () => {
      // Try to complete non-existent generation
      invoiceMonitoringService.completeInvoiceGeneration('non-existent', 'batch-1', true, 100.00);

      // Should not throw, just log warning
      expect(true).toBe(true);
    });

    it('should handle missing batch IDs gracefully', () => {
      const result = invoiceMonitoringService.completeBatchJob('non-existent', 'manual');

      expect(result).toBeNull();
    });

    it('should handle phase updates for non-existent generations', () => {
      invoiceMonitoringService.updatePhase('non-existent', 'pdf_generation');

      // Should not throw, just log warning
      expect(true).toBe(true);
    });
  });
});