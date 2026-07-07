/**
 * @file alertingService.test.ts
 * @purpose Unit tests for the AlertingService with invoice-specific error detection
 * @created 2025-01-17
 * @modified 2025-01-17
 */

import { AlertingService } from './alertingService';
import AlertModel from '../models/Alert';
import User from '../models/User';

// Mock the database models
jest.mock('../models/Alert');
jest.mock('../models/User');
jest.mock('../utils/emailService', () => ({
  sendMonitoringAlert: jest.fn().mockResolvedValue(true)
}));

// Mock fetch for webhook testing
global.fetch = jest.fn();

describe('AlertingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Spies (z. B. auf createAndSendAlert) zurücksetzen – clearAllMocks entfernt
    // nur Aufrufdaten, nicht die gemockte Implementierung
    jest.restoreAllMocks();
    // Clear in-memory alert storage
    (AlertingService as any).alerts.clear();
    (AlertingService as any).lastAlertTimes.clear();
  });

  describe('initialize', () => {
    it('should initialize with admin recipients', async () => {
      const mockAdmins = [
        { kontakt: { email: 'admin1@test.com' }, _id: 'admin1' },
        { kontakt: { email: 'admin2@test.com' }, _id: 'admin2' }
      ];

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmins)
      });

      await AlertingService.initialize();

      expect(User.find).toHaveBeenCalledWith({ isAdmin: true });
      // Should have updated default rules with admin emails
    });

    it('should handle initialization errors gracefully', async () => {
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(AlertingService.initialize()).resolves.not.toThrow();
    });
  });

  describe('checkInvoiceAlerts', () => {
    it('should trigger alert for job failure', async () => {
      const mockMetrics = {
        jobStatus: 'failed',
        errorMessage: 'Database connection timeout'
      };

      const createAlertSpy = jest.spyOn(AlertingService as any, 'createAndSendAlert');
      createAlertSpy.mockResolvedValue(undefined);

      await AlertingService.checkInvoiceAlerts(mockMetrics);

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'invoice-job-failure',
          severity: 'critical'
        }),
        mockMetrics
      );
    });

    it('should trigger alert for high error rate', async () => {
      const mockMetrics = {
        errorRate: 7, // Above 5% threshold
        failedCount: 7,
        totalCount: 100
      };

      const createAlertSpy = jest.spyOn(AlertingService as any, 'createAndSendAlert');
      createAlertSpy.mockResolvedValue(undefined);

      await AlertingService.checkInvoiceAlerts(mockMetrics);

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'invoice-generation-error-rate',
          severity: 'warning'
        }),
        mockMetrics
      );
    });

    it('should trigger critical alert for very high error rate', async () => {
      const mockMetrics = {
        errorRate: 15, // Above 10% threshold
        failedCount: 15,
        totalCount: 100
      };

      const createAlertSpy = jest.spyOn(AlertingService as any, 'createAndSendAlert');
      createAlertSpy.mockResolvedValue(undefined);

      await AlertingService.checkInvoiceAlerts(mockMetrics);

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'invoice-generation-critical-error-rate',
          severity: 'critical'
        }),
        mockMetrics
      );
    });

    it('should not trigger alert if cooldown period not elapsed', async () => {
      const mockMetrics = {
        jobStatus: 'failed',
        errorMessage: 'Database connection timeout'
      };

      // Simulate recent alert
      const ruleId = 'invoice-job-failure';
      (AlertingService as any).lastAlertTimes.set(ruleId, new Date());

      const createAlertSpy = jest.spyOn(AlertingService as any, 'createAndSendAlert');
      createAlertSpy.mockResolvedValue(undefined);

      await AlertingService.checkInvoiceAlerts(mockMetrics);

      expect(createAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('generateAlertMessage', () => {
    it('should generate correct message for job failure', () => {
      const rule = {
        id: 'invoice-job-failure',
        name: 'Invoice Generation Job Failed',
        type: 'business' as const,
        severity: 'critical' as const,
        condition: 'invoiceJob.status === "failed"',
        threshold: 1,
        enabled: true,
        cooldownMinutes: 5,
        recipients: []
      };

      const data = { errorMessage: 'Database timeout' };
      const message = (AlertingService as any).generateAlertMessage(rule, data);

      expect(message).toBe('Invoice generation job failed: Database timeout');
    });

    it('should generate correct message for error rate', () => {
      const rule = {
        id: 'invoice-generation-error-rate',
        name: 'High Invoice Generation Error Rate',
        type: 'business' as const,
        severity: 'warning' as const,
        condition: 'invoices.errorRate > threshold',
        threshold: 5,
        enabled: true,
        cooldownMinutes: 15,
        recipients: []
      };

      const data = { errorRate: 7, failedCount: 7, totalCount: 100 };
      const message = (AlertingService as any).generateAlertMessage(rule, data);

      expect(message).toBe('High invoice generation error rate: 7% (7/100 failed, threshold: 5%)');
    });

    it('should generate correct message for duplicate invoices', () => {
      const rule = {
        id: 'duplicate-invoice-numbers',
        name: 'Duplicate Invoice Numbers Detected',
        type: 'business' as const,
        severity: 'critical' as const,
        condition: 'invoices.duplicateCount > threshold',
        threshold: 1,
        enabled: true,
        cooldownMinutes: 60,
        recipients: []
      };

      const data = { duplicateInvoices: 3 };
      const message = (AlertingService as any).generateAlertMessage(rule, data);

      expect(message).toBe('Duplicate invoice numbers detected: 3 duplicate(s) found');
    });
  });

  describe('sendWebhookNotifications', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should send Slack webhook notification successfully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const mockAlert = {
        id: 'test-alert',
        severity: 'critical' as const,
        title: 'Test Alert',
        message: 'Test message',
        timestamp: new Date(),
        notificationsSent: 0
      };

      await (AlertingService as any).sendWebhookNotifications(mockAlert);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      delete process.env.SLACK_WEBHOOK_URL;
    });

    it('should retry failed webhook requests', async () => {
      process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const mockAlert = {
        id: 'test-alert',
        severity: 'warning' as const,
        title: 'Test Alert',
        message: 'Test message',
        timestamp: new Date(),
        notificationsSent: 0
      };

      await (AlertingService as any).sendWebhookNotifications(mockAlert);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      delete process.env.DISCORD_WEBHOOK_URL;
    });
  });

  describe('database persistence', () => {
    it('should persist alert to database', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockAlertConstructor = jest.fn().mockImplementation(() => ({
        save: mockSave
      }));

      // Mock the AlertModel constructor
      (AlertModel as any).mockImplementation(mockAlertConstructor);

      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        type: 'business' as const,
        severity: 'warning' as const,
        condition: 'test',
        threshold: 1,
        enabled: true,
        cooldownMinutes: 5,
        recipients: ['admin@test.com']
      };

      const data = { test: 'data' };

      await (AlertingService as any).createAndSendAlert(rule, data);

      expect(mockAlertConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'test-rule',
          type: 'business',
          severity: 'warning'
        })
      );
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle database persistence failures gracefully', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      (AlertModel as any).mockImplementation(() => ({
        save: mockSave
      }));

      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        type: 'business' as const,
        severity: 'warning' as const,
        condition: 'test',
        threshold: 1,
        enabled: true,
        cooldownMinutes: 5,
        recipients: []
      };

      const data = { test: 'data' };

      await expect((AlertingService as any).createAndSendAlert(rule, data)).resolves.not.toThrow();
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts from database', async () => {
      const mockDbAlerts = [
        {
          alertId: 'alert-1',
          ruleId: 'rule-1',
          type: 'business',
          severity: 'warning',
          title: 'Test Alert',
          message: 'Test message',
          details: {},
          timestamp: new Date(),
          resolved: false,
          notificationsSent: 1
        }
      ];

      (AlertModel.findActiveAlerts as jest.Mock).mockResolvedValue(mockDbAlerts);

      const alerts = await AlertingService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        id: 'alert-1',
        ruleId: 'rule-1',
        severity: 'warning'
      });
    });

    it('should fallback to memory on database error', async () => {
      (AlertModel.findActiveAlerts as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Add alert to memory
      const memoryAlert = {
        id: 'memory-alert',
        ruleId: 'rule-1',
        type: 'business' as const,
        severity: 'warning' as const,
        title: 'Memory Alert',
        message: 'Test message',
        details: {},
        timestamp: new Date(),
        resolved: false,
        notificationsSent: 0
      };

      (AlertingService as any).alerts.set('memory-alert', memoryAlert);

      const alerts = await AlertingService.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('memory-alert');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert in database', async () => {
      const mockDbAlert = {
        alertId: 'alert-1',
        resolved: false,
        resolvedAt: undefined,
        resolvedBy: undefined,
        save: jest.fn().mockResolvedValue(true),
        title: 'Test Alert'
      };

      (AlertModel.findOne as jest.Mock).mockResolvedValue(mockDbAlert);

      const result = await AlertingService.resolveAlert('alert-1', 'admin@test.com');

      expect(result).toBe(true);
      expect(mockDbAlert.resolved).toBe(true);
      expect(mockDbAlert.resolvedBy).toBe('admin@test.com');
      expect(mockDbAlert.save).toHaveBeenCalled();
    });

    it('should return false if alert not found', async () => {
      (AlertModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AlertingService.resolveAlert('nonexistent-alert');

      expect(result).toBe(false);
    });
  });

  describe('alert throttling', () => {
    it('should respect cooldown periods', () => {
      const ruleId = 'test-rule';
      const cooldownMinutes = 5;

      // No previous alert - should allow
      expect((AlertingService as any).canSendAlert(ruleId, cooldownMinutes)).toBe(true);

      // Set recent alert time
      (AlertingService as any).lastAlertTimes.set(ruleId, new Date());

      // Should not allow during cooldown
      expect((AlertingService as any).canSendAlert(ruleId, cooldownMinutes)).toBe(false);

      // Set old alert time
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 10); // 10 minutes ago
      (AlertingService as any).lastAlertTimes.set(ruleId, oldTime);

      // Should allow after cooldown
      expect((AlertingService as any).canSendAlert(ruleId, cooldownMinutes)).toBe(true);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return statistics from database', async () => {
      const mockStats = {
        total: 10,
        active: 3,
        resolved: 7,
        bySeverity: { warning: 2, critical: 1, emergency: 0 },
        last24Hours: 4
      };

      (AlertModel.getAlertStatistics as jest.Mock).mockResolvedValue(mockStats);

      const stats = await AlertingService.getAlertStatistics();

      expect(stats).toEqual(mockStats);
    });

    it('should fallback to memory statistics on database error', async () => {
      (AlertModel.getAlertStatistics as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Add some alerts to memory
      const alerts = new Map();
      alerts.set('alert-1', {
        resolved: false,
        severity: 'warning',
        timestamp: new Date()
      });
      alerts.set('alert-2', {
        resolved: true,
        severity: 'critical',
        timestamp: new Date()
      });

      (AlertingService as any).alerts = alerts;

      const stats = await AlertingService.getAlertStatistics();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.resolved).toBe(1);
    });
  });

  describe('alertEmailDeliveryFailure (AUDIT OP7)', () => {
    const mockAdmins = [{ kontakt: { email: 'admin@test.com' }, _id: 'admin1' }];

    beforeEach(() => {
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmins)
      });
    });

    it('should notify admins about a permanently failed email', async () => {
      const { sendMonitoringAlert } = require('../utils/emailService');

      await AlertingService.alertEmailDeliveryFailure({
        email: 'vendor@test.com',
        emailType: 'invoice-notification',
        userId: 'user1',
        errorMessage: 'SMTP connection refused'
      });

      expect(sendMonitoringAlert).toHaveBeenCalledWith(
        'admin@test.com',
        expect.objectContaining({
          severity: 'critical',
          title: 'Email Delivery Permanently Failed',
          message: expect.stringContaining('vendor@test.com')
        })
      );
      expect(sendMonitoringAlert.mock.calls[0][1].message).toContain('SMTP connection refused');
    });

    it('should suppress repeated alerts within the cooldown period', async () => {
      const { sendMonitoringAlert } = require('../utils/emailService');

      await AlertingService.alertEmailDeliveryFailure({
        email: 'a@test.com',
        errorMessage: 'fail 1'
      });
      await AlertingService.alertEmailDeliveryFailure({
        email: 'b@test.com',
        errorMessage: 'fail 2'
      });

      expect(sendMonitoringAlert).toHaveBeenCalledTimes(1);
    });

    it('should not throw if admin lookup fails', async () => {
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        AlertingService.alertEmailDeliveryFailure({ errorMessage: 'boom' })
      ).resolves.not.toThrow();
    });
  });
});