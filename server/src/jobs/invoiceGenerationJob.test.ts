/**
 * @file invoiceGenerationJob.test.ts
 * @purpose Unit tests for the InvoiceGenerationJob
 * @created 2025-09-04
 * @modified 2026-07-07
 */

import { InvoiceGenerationJob } from './invoiceGenerationJob';
import User from '../models/User';
import { invoiceGenerationService } from '../services/invoiceGenerationService';
import invoiceMonitoringService from '../services/invoiceMonitoringService';
import logger from '../utils/logger';
import * as cron from 'node-cron';

// Mock dependencies
jest.mock('../models/User');
jest.mock('../services/invoiceGenerationService');
jest.mock('node-cron');
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));
jest.mock('../services/invoiceMonitoringService', () => ({
  __esModule: true,
  default: {
    startBatchJob: jest.fn().mockReturnValue('batch-corr-id'),
    startInvoiceGeneration: jest.fn().mockReturnValue('gen-corr-id'),
    completeInvoiceGeneration: jest.fn(),
    completeBatchJob: jest.fn().mockReturnValue({ totalDuration: 100 }),
    recordInvoiceSkip: jest.fn()
  }
}));

const mockUser = User as jest.Mocked<typeof User>;
const mockInvoiceGenerationService = invoiceGenerationService as jest.Mocked<typeof invoiceGenerationService>;
const mockMonitoring = invoiceMonitoringService as jest.Mocked<typeof invoiceMonitoringService>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockCron = cron as jest.Mocked<typeof cron>;

describe('InvoiceGenerationJob', () => {
  let mockTask: any;

  beforeEach(() => {
    // Reset static state (uses the previous mockTask before it is replaced)
    InvoiceGenerationJob.stop();

    jest.clearAllMocks();

    // Mock cron task
    mockTask = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn()
    };
    mockCron.schedule.mockReturnValue(mockTask);
  });

  afterEach(() => {
    InvoiceGenerationJob.stop();
  });

  describe('Job Scheduling', () => {
    it('should initialize job with correct schedule', () => {
      InvoiceGenerationJob.init();

      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 3 1 * *',
        expect.any(Function),
        { timezone: 'Europe/Berlin' }
      );
      // AUDIT OP5: persistenter Nachzügler-Cron statt setTimeout-Retry
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '30 3 2-5 * *',
        expect.any(Function),
        { timezone: 'Europe/Berlin' }
      );
      expect(mockTask.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Invoice generation job scheduled for 1st of each month at 03:00 (+ Nachzügler-Läufe Tag 2-5, 03:30)'
      );
    });

    it('should not initialize job if already scheduled', () => {
      InvoiceGenerationJob.init();
      mockCron.schedule.mockClear();

      InvoiceGenerationJob.init();

      expect(mockCron.schedule).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invoice generation job already scheduled'
      );
    });

    it('should stop and destroy job correctly', () => {
      InvoiceGenerationJob.init();

      InvoiceGenerationJob.stop();

      expect(mockTask.stop).toHaveBeenCalled();
      expect(mockTask.destroy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Invoice generation job stopped');
    });

    it('should return correct running status', () => {
      expect(InvoiceGenerationJob.isRunning()).toBe(false);

      InvoiceGenerationJob.init();
      expect(InvoiceGenerationJob.isRunning()).toBe(true);

      InvoiceGenerationJob.stop();
      expect(InvoiceGenerationJob.isRunning()).toBe(false);
    });
  });

  describe('Job Status and Information', () => {
    it('should return correct status information', () => {
      const status = InvoiceGenerationJob.getStatus();

      expect(status).toEqual({
        isScheduled: false,
        schedule: '0 3 1 * *',
        nextRun: null,
        timezone: 'Europe/Berlin'
      });
    });

    it('should calculate next run time correctly', () => {
      InvoiceGenerationJob.init();

      const nextRun = InvoiceGenerationJob.getNextRun();
      expect(nextRun).toBeInstanceOf(Date);

      // Should be 1st of next month at 3 AM
      const expectedDate = new Date();
      expectedDate.setMonth(expectedDate.getMonth() + 1, 1);
      expectedDate.setHours(3, 0, 0, 0);

      expect(nextRun).toEqual(expectedDate);
    });
  });

  describe('Manual Invoice Generation', () => {
    const mockVendorData = [
      {
        _id: 'vendor1',
        kontakt: { name: 'Test Vendor 1' },
        email: 'vendor1@test.com'
      },
      {
        _id: 'vendor2',
        kontakt: { name: 'Test Vendor 2' },
        email: 'vendor2@test.com'
      }
    ];

    beforeEach(() => {
      // User.find(...).select(...) liefert die Testvendoren
      mockUser.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVendorData)
      } as any);
    });

    it('should generate invoices for specific month successfully', async () => {
      mockInvoiceGenerationService.generateMonthlyInvoice.mockResolvedValue({
        invoiceNumber: 'RE-2025-01-00001',
        totalAmount: 119
      });

      await InvoiceGenerationJob.generateForMonth(2025, 1);

      expect(mockUser.find).toHaveBeenCalledWith({
        isVendor: true,
        registrationStatus: 'active'
      });

      expect(mockInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledTimes(2);
      expect(mockInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledWith('vendor1', 2025, 1);
      expect(mockInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledWith('vendor2', 2025, 1);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found vendors for manual invoice generation',
        { count: 2 }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Manual invoice generation completed',
        { month: 1, year: 2025, successCount: 2, errorCount: 0 }
      );
    });

    it('should generate invoice for specific vendor successfully', async () => {
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ kontakt: { name: 'Test Vendor 1' } })
      } as any);
      mockInvoiceGenerationService.generateMonthlyInvoice.mockResolvedValue({
        invoiceNumber: 'RE-2025-01-00001',
        totalAmount: 119
      });

      await InvoiceGenerationJob.generateForVendor('vendor1', 2025, 1);

      expect(mockInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledWith('vendor1', 2025, 1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Single vendor invoice generation completed',
        expect.objectContaining({ vendorId: 'vendor1', invoiceAmount: 119, skipped: false })
      );
      expect(mockMonitoring.completeInvoiceGeneration).toHaveBeenCalledWith(
        'gen-corr-id',
        'batch-corr-id',
        true,
        119
      );
    });

    it('skips gracefully when nothing is billable (service returns null, BUG-INV-JOB-NULL)', async () => {
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ kontakt: { name: 'Trial Vendor' } })
      } as any);
      mockInvoiceGenerationService.generateMonthlyInvoice.mockResolvedValue(null);

      await expect(InvoiceGenerationJob.generateForVendor('vendor1', 2025, 1)).resolves.not.toThrow();

      expect(mockMonitoring.completeInvoiceGeneration).toHaveBeenCalledWith(
        'gen-corr-id',
        'batch-corr-id',
        true,
        undefined
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Single vendor invoice generation completed',
        expect.objectContaining({ skipped: true, invoiceAmount: null })
      );
    });

    it('should handle individual vendor failures gracefully during monthly generation', async () => {
      mockInvoiceGenerationService.generateMonthlyInvoice
        .mockResolvedValueOnce({ invoiceNumber: 'RE-2025-01-00001' }) // vendor1 succeeds
        .mockRejectedValueOnce(new Error('Test error')); // vendor2 fails

      await InvoiceGenerationJob.generateForMonth(2025, 1);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Manual invoice generation completed',
        { month: 1, year: 2025, successCount: 1, errorCount: 1 }
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate invoice for vendor',
        { vendorName: 'Test Vendor 2', error: expect.any(Error) }
      );
    });

    it('should propagate error for specific vendor generation failure', async () => {
      const testError = new Error('Test error');
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ kontakt: { name: 'Test Vendor 1' } })
      } as any);
      mockInvoiceGenerationService.generateMonthlyInvoice.mockRejectedValue(testError);

      await expect(InvoiceGenerationJob.generateForVendor('vendor1', 2025, 1))
        .rejects.toThrow('Test error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invoice generation for vendor failed',
        { vendorId: 'vendor1', month: 1, year: 2025, error: testError }
      );
      expect(mockMonitoring.completeInvoiceGeneration).toHaveBeenCalledWith(
        'gen-corr-id',
        'batch-corr-id',
        false,
        undefined,
        'Test error'
      );
    });
  });

  describe('Scheduled Job Execution', () => {
    beforeEach(() => {
      // Mock current date to January 15, 2025
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should run job successfully with eligible vendors', async () => {
      const mockVendorData = [
        {
          _id: 'vendor1',
          kontakt: { name: 'Test Vendor 1' },
          email: 'vendor1@test.com'
        }
      ];

      mockUser.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVendorData)
      } as any);

      mockInvoiceGenerationService.findExistingInvoice.mockResolvedValue(null); // No existing invoice
      mockInvoiceGenerationService.generateMonthlyInvoice.mockResolvedValue({
        invoiceNumber: 'RE-2024-12-00001',
        totalAmount: 119
      });

      await InvoiceGenerationJob.run();

      // Should query for eligible vendors (Trial beendet, aktiver Vendor)
      expect(mockUser.find).toHaveBeenCalledWith({
        isVendor: true,
        registrationStatus: 'active',
        trialEndDate: { $lt: expect.any(Date) }
      });

      // Should check for existing invoice for December 2024 (previous month)
      expect(mockInvoiceGenerationService.findExistingInvoice).toHaveBeenCalledWith('vendor1', 2024, 12);

      // Should generate invoice for December 2024
      expect(mockInvoiceGenerationService.generateMonthlyInvoice).toHaveBeenCalledWith('vendor1', 2024, 12);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found vendors eligible for invoicing',
        { count: 1 }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Invoice generated successfully for vendor',
        { vendorName: 'Test Vendor 1' }
      );
    });

    it('should skip vendors with existing invoices', async () => {
      const mockVendorData = [
        {
          _id: 'vendor1',
          kontakt: { name: 'Test Vendor 1' },
          email: 'vendor1@test.com'
        }
      ];

      mockUser.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVendorData)
      } as any);

      // Mock existing invoice
      mockInvoiceGenerationService.findExistingInvoice.mockResolvedValue({
        invoiceNumber: 'RE-2024-12-00001'
      });

      await InvoiceGenerationJob.run();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Invoice already exists for vendor',
        expect.objectContaining({ vendorName: 'Test Vendor 1' })
      );
      expect(mockMonitoring.recordInvoiceSkip).toHaveBeenCalledWith(
        'batch-corr-id',
        'vendor1',
        'Test Vendor 1',
        expect.stringContaining('Invoice already exists')
      );
      expect(mockInvoiceGenerationService.generateMonthlyInvoice).not.toHaveBeenCalled();
    });

    it('should propagate vendor query errors (Abfrage liegt vor dem Retry-Block)', async () => {
      // User.find schlägt fehl, BEVOR der try/catch mit Retry beginnt →
      // der Fehler wird nach oben durchgereicht, kein Retry.
      const testError = new Error('Database connection failed');
      mockUser.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(testError)
      } as any);

      await expect(InvoiceGenerationJob.run()).rejects.toThrow('Database connection failed');
      expect(mockInvoiceGenerationService.generateMonthlyInvoice).not.toHaveBeenCalled();
    });

    it('does not schedule an in-memory retry on failure (AUDIT OP5)', async () => {
      mockUser.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      } as any);

      // completeBatchJob wirft nur beim ersten Aufruf (im try) – der zweite
      // Aufruf im catch-Block darf nicht erneut werfen.
      mockMonitoring.completeBatchJob
        .mockImplementationOnce(() => {
          throw new Error('Monitoring failure');
        })
        .mockReturnValueOnce({ totalDuration: 100 } as any);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      await InvoiceGenerationJob.run();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invoice generation job failed',
        expect.objectContaining({ error: expect.anything() })
      );
      // Kein RAM-flüchtiger Retry mehr — der Nachzügler-Cron (Tag 2-5) übernimmt
      expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 3600000);

      setTimeoutSpy.mockRestore();
    });
  });
});
