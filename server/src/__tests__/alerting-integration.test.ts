/**
 * @file alerting-integration.test.ts
 * @purpose Integration tests for invoice alerting system
 * @created 2025-01-17
 * @modified 2025-01-17
 */

import { AlertingService } from '../services/alertingService';
import { InvoiceMonitoringService } from '../services/invoiceMonitoringService';
import AlertModel from '../models/Alert';
import User from '../models/User';

// Mock external dependencies
jest.mock('../utils/emailService', () => ({
  sendMonitoringAlert: jest.fn().mockResolvedValue(true)
}));

global.fetch = jest.fn();

describe('Invoice Alerting Integration', () => {
  // In-Memory-MongoDB und mongoose-Verbindung kommen aus tests/setup.ts
  // (eigenes mongoose.connect kollidiert mit der globalen Verbindung)

  beforeEach(async () => {
    // Clear database
    await AlertModel.deleteMany({});
    await User.deleteMany({});

    // Clear in-memory state
    (AlertingService as any).alerts.clear();
    (AlertingService as any).lastAlertTimes.clear();

    jest.clearAllMocks();
  });

  describe('End-to-End Invoice Alert Flow', () => {
    it('should create and persist alert for invoice generation failure', async () => {
      // Setup admin user
      const admin = new User({
        username: 'admin',
        kontakt: { name: 'Admin', email: 'admin@housnkuh.de' },
        isAdmin: true
      });
      await admin.save();

      // Initialize alerting service
      await AlertingService.initialize();

      // Simulate invoice generation failure
      const invoiceMetrics = {
        jobStatus: 'failed',
        errorMessage: 'Database connection timeout during invoice generation',
        correlationId: 'batch-123',
        vendorId: 'vendor-456'
      };

      // Trigger alert
      await AlertingService.checkInvoiceAlerts(invoiceMetrics);

      // Verify alert was persisted to database
      const savedAlerts = await AlertModel.find({ ruleId: 'invoice-job-failure' });
      expect(savedAlerts).toHaveLength(1);

      const alert = savedAlerts[0];
      expect(alert.type).toBe('business');
      expect(alert.severity).toBe('critical');
      expect(alert.resolved).toBe(false);
      expect(alert.message).toContain('Database connection timeout');
      expect(alert.metadata.correlationId).toBe('batch-123');
      expect(alert.metadata.vendorId).toBe('vendor-456');
    });

    it('should trigger multiple alerts for high error rate scenario', async () => {
      // Setup admin user
      const admin = new User({
        username: 'admin',
        kontakt: { name: 'Admin', email: 'admin@housnkuh.de' },
        isAdmin: true
      });
      await admin.save();

      await AlertingService.initialize();

      // Simulate high error rate (warning level)
      await AlertingService.checkInvoiceAlerts({
        errorRate: 7,
        failedCount: 7,
        totalCount: 100
      });

      // Simulate critical error rate
      await AlertingService.checkInvoiceAlerts({
        errorRate: 15,
        failedCount: 15,
        totalCount: 100
      });

      // Verify both alerts were created
      const alerts = await AlertModel.find({ type: 'business' }).sort({ timestamp: 1 });
      expect(alerts).toHaveLength(2);

      expect(alerts[0].ruleId).toBe('invoice-generation-error-rate');
      expect(alerts[0].severity).toBe('warning');

      expect(alerts[1].ruleId).toBe('invoice-generation-critical-error-rate');
      expect(alerts[1].severity).toBe('critical');
    });

    it('should respect cooldown periods and prevent spam', async () => {
      const admin = new User({
        username: 'admin',
        kontakt: { name: 'Admin', email: 'admin@housnkuh.de' },
        isAdmin: true
      });
      await admin.save();

      await AlertingService.initialize();

      const failureData = {
        jobStatus: 'failed',
        errorMessage: 'First failure'
      };

      // First alert should be created
      await AlertingService.checkInvoiceAlerts(failureData);

      // Second alert within cooldown period should be blocked
      await AlertingService.checkInvoiceAlerts({
        jobStatus: 'failed',
        errorMessage: 'Second failure'
      });

      // Only one alert should exist
      const alerts = await AlertModel.find({ ruleId: 'invoice-job-failure' });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('First failure');
    });

    it('should track notification channels in database', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const admin = new User({
        username: 'admin',
        kontakt: { name: 'Admin', email: 'admin@housnkuh.de' },
        isAdmin: true
      });
      await admin.save();

      await AlertingService.initialize();

      await AlertingService.checkInvoiceAlerts({
        duplicateInvoices: 2
      });

      const alert = await AlertModel.findOne({ ruleId: 'duplicate-invoice-numbers' });
      expect(alert).toBeTruthy();
      expect(alert!.notificationChannels.email.sent).toBe(true);
      expect(alert!.notificationChannels.email.recipients).toContain('admin@housnkuh.de');
      expect(alert!.notificationChannels.webhook.sent).toBe(true);
      expect(alert!.notificationChannels.webhook.platforms).toContain('slack');

      delete process.env.SLACK_WEBHOOK_URL;
    });
  });

  describe('Alert Resolution and History', () => {
    it('should resolve alerts and track resolution', async () => {
      // Create an alert
      const alert = new AlertModel({
        alertId: 'test-alert-123',
        ruleId: 'invoice-job-failure',
        type: 'business',
        severity: 'critical',
        title: 'Test Alert',
        message: 'Test failure',
        details: {},
        timestamp: new Date(),
        resolved: false,
        notificationsSent: 1,
        notificationChannels: {
          email: { sent: true, recipients: [], errors: [] },
          webhook: { sent: false, platforms: [], errors: [] },
          dashboard: { sent: true }
        },
        metadata: {}
      });
      await alert.save();

      // Resolve the alert
      const resolved = await AlertingService.resolveAlert('test-alert-123', 'admin@test.com');
      expect(resolved).toBe(true);

      // Verify resolution was persisted
      const resolvedAlert = await AlertModel.findOne({ alertId: 'test-alert-123' });
      expect(resolvedAlert!.resolved).toBe(true);
      expect(resolvedAlert!.resolvedBy).toBe('admin@test.com');
      expect(resolvedAlert!.resolvedAt).toBeTruthy();
    });

    it('should provide accurate alert statistics', async () => {
      // Create test alerts
      const alerts = [
        {
          alertId: 'alert-1',
          ruleId: 'rule-1',
          type: 'business',
          severity: 'warning',
          resolved: false,
          timestamp: new Date()
        },
        {
          alertId: 'alert-2',
          ruleId: 'rule-2',
          type: 'business',
          severity: 'critical',
          resolved: false,
          timestamp: new Date()
        },
        {
          alertId: 'alert-3',
          ruleId: 'rule-3',
          type: 'business',
          severity: 'warning',
          resolved: true,
          resolvedAt: new Date(),
          timestamp: new Date()
        }
      ];

      for (const alertData of alerts) {
        const alert = new AlertModel({
          ...alertData,
          title: 'Test Alert',
          message: 'Test message',
          details: {},
          notificationsSent: 0,
          notificationChannels: {
            email: { sent: false, recipients: [], errors: [] },
            webhook: { sent: false, platforms: [], errors: [] },
            dashboard: { sent: false }
          },
          metadata: {}
        });
        await alert.save();
      }

      // BUG-ALERT-STATS gefixt: DB-Pfad liefert das deklarierte Shape —
      // bySeverity zählt nur AKTIVE Alerts, plus last24Hours
      const stats = await AlertingService.getAlertStatistics();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.resolved).toBe(1);
      expect(stats.bySeverity.warning).toBe(1); // nur der aktive Warning-Alert
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.emergency).toBe(0);
      expect(stats.last24Hours).toBe(3);
    });

    it('should cleanup old resolved alerts', async () => {
      // Create old resolved alert
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5); // 5 days ago

      const oldAlert = new AlertModel({
        alertId: 'old-alert',
        ruleId: 'rule-1',
        type: 'business',
        severity: 'warning',
        title: 'Old Alert',
        message: 'Old message',
        details: {},
        timestamp: oldDate,
        resolved: true,
        resolvedAt: oldDate,
        notificationsSent: 1,
        notificationChannels: {
          email: { sent: true, recipients: [], errors: [] },
          webhook: { sent: false, platforms: [], errors: [] },
          dashboard: { sent: true }
        },
        metadata: {}
      });
      await oldAlert.save();

      // Create recent alert
      const recentAlert = new AlertModel({
        alertId: 'recent-alert',
        ruleId: 'rule-2',
        type: 'business',
        severity: 'critical',
        title: 'Recent Alert',
        message: 'Recent message',
        details: {},
        timestamp: new Date(),
        resolved: false,
        notificationsSent: 1,
        notificationChannels: {
          email: { sent: true, recipients: [], errors: [] },
          webhook: { sent: false, platforms: [], errors: [] },
          dashboard: { sent: true }
        },
        metadata: {}
      });
      await recentAlert.save();

      // Cleanup with 3-day threshold
      await AlertingService.cleanupOldAlerts(3);

      // Old alert should be deleted, recent alert should remain
      const remainingAlerts = await AlertModel.find({});
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts[0].alertId).toBe('recent-alert');
    });
  });

  describe('Integration with Invoice Monitoring', () => {
    it('should work with invoice monitoring service metrics', async () => {
      const admin = new User({
        username: 'admin',
        kontakt: { name: 'Admin', email: 'admin@housnkuh.de' },
        isAdmin: true
      });
      await admin.save();

      await AlertingService.initialize();

      // Simulate invoice monitoring service detecting issues
      const monitoringService = InvoiceMonitoringService.getInstance();

      // Start a batch job
      const batchId = monitoringService.startBatchJob(10, 'scheduled');

      // Simulate some failures
      const invoiceId1 = monitoringService.startInvoiceGeneration(
        batchId, 'vendor-1', 'Vendor One', 2025, 1
      );

      monitoringService.completeInvoiceGeneration(
        invoiceId1, batchId, false, undefined, 'PDF generation failed'
      );

      const invoiceId2 = monitoringService.startInvoiceGeneration(
        batchId, 'vendor-2', 'Vendor Two', 2025, 1
      );

      monitoringService.completeInvoiceGeneration(
        invoiceId2, batchId, false, undefined, 'Email delivery failed'
      );

      // Complete batch job
      const batchMetrics = monitoringService.completeBatchJob(batchId, 'scheduled');

      // Calculate error rate and trigger alerts
      const errorRate = (batchMetrics!.failedInvoices / batchMetrics!.processedVendors) * 100;

      await AlertingService.checkInvoiceAlerts({
        errorRate,
        failedCount: batchMetrics!.failedInvoices,
        totalCount: batchMetrics!.processedVendors,
        batchId: batchId
      });

      // Verify alert was created for high error rate
      const alerts = await AlertModel.find({ type: 'business' });
      expect(alerts.length).toBeGreaterThan(0);

      const errorRateAlert = alerts.find(a => a.ruleId.includes('error-rate'));
      expect(errorRateAlert).toBeTruthy();
      expect(errorRateAlert!.metadata.batchId).toBe(batchId);
    });
  });
});