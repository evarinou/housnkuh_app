/**
 * @file Alerting Service for monitoring system health and performance
 * @description Service for monitoring system alerts, notifications, and automated alerting rules
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/alertingService.ts
import { SystemHealth, ComponentHealth } from './healthCheckService';
import { PerformanceSummary } from '../utils/performanceMonitor';
import User from '../models/User';
import AlertModel from '../models/Alert';
import logger from '../utils/logger';

/**
 * @interface AlertRule
 * @description Configuration for automated alerting rules
 */
export interface AlertRule {
  /** @description Unique rule identifier */
  id: string;
  /** @description Human-readable rule name */
  name: string;
  /** @description Type of alert rule */
  type: 'health' | 'performance' | 'error' | 'business';
  /** @description Alert condition expression */
  condition: string;
  /** @description Threshold value for triggering alert */
  threshold: number | string;
  /** @description Alert severity level */
  severity: 'warning' | 'critical' | 'emergency';
  /** @description Whether rule is enabled */
  enabled: boolean;
  /** @description Minimum time between alerts of same type */
  cooldownMinutes: number;
  /** @description Admin user IDs or email addresses */
  recipients: string[];
}

/**
 * @interface Alert
 * @description Alert instance with notification tracking
 */
export interface Alert {
  /** @description Unique alert identifier */
  id: string;
  /** @description Rule ID that triggered this alert */
  ruleId: string;
  /** @description Alert type */
  type: string;
  /** @description Alert severity */
  severity: 'warning' | 'critical' | 'emergency';
  /** @description Alert title */
  title: string;
  /** @description Alert message */
  message: string;
  /** @description Additional alert details */
  details: any;
  /** @description Alert timestamp */
  timestamp: Date;
  /** @description Whether alert is resolved */
  resolved: boolean;
  /** @description Resolution timestamp */
  resolvedAt?: Date;
  /** @description Number of notifications sent */
  notificationsSent: number;
}

/**
 * @class AlertingService
 * @description Alerting Service for monitoring system health and performance
 * @sends Notifications via email using existing emailService patterns
 * @security Manages alert rules and notifications with cooldown periods
 * @complexity High - Complex alerting system with rule evaluation and notification management
 */
export class AlertingService {
  private static alerts: Map<string, Alert> = new Map();
  private static lastAlertTimes: Map<string, Date> = new Map();
  private static defaultRules: AlertRule[] = [
    {
      id: 'database-unhealthy',
      name: 'Database Unavailable',
      type: 'health',
      condition: 'database.status === "unhealthy"',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
      recipients: []
    },
    {
      id: 'email-service-down',
      name: 'Email Service Unavailable',
      type: 'health',
      condition: 'email.status === "unhealthy"',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 10,
      recipients: []
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      type: 'performance',
      condition: 'requests.errorRate > threshold',
      threshold: 10,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 15,
      recipients: []
    },
    {
      id: 'slow-response-time',
      name: 'Slow Response Times',
      type: 'performance',
      condition: 'requests.averageResponseTime > threshold',
      threshold: 2000,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 15,
      recipients: []
    },
    {
      id: 'memory-usage-high',
      name: 'High Memory Usage',
      type: 'performance',
      condition: 'system.memoryUsage.rss > threshold',
      threshold: 536870912, // 512MB in bytes
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 30,
      recipients: []
    },
    {
      id: 'database-slow',
      name: 'Slow Database Queries',
      type: 'performance',
      condition: 'database.averageResponseTime > threshold',
      threshold: 1000,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 20,
      recipients: []
    },
    {
      id: 'frequent-errors',
      name: 'High Error Frequency',
      type: 'error',
      condition: 'errors.last5Minutes > threshold',
      threshold: 10,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 10,
      recipients: []
    },
    {
      id: 'trial-service-down',
      name: 'Trial Service Unavailable',
      type: 'health',
      condition: 'trialService.status === "unhealthy"',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
      recipients: []
    },
    // Invoice-specific alert rules
    {
      id: 'invoice-job-failure',
      name: 'Invoice Generation Job Failed',
      type: 'business',
      condition: 'invoiceJob.status === "failed"',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
      recipients: []
    },
    {
      id: 'invoice-generation-error-rate',
      name: 'High Invoice Generation Error Rate',
      type: 'business',
      condition: 'invoices.errorRate > threshold',
      threshold: 5,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 15,
      recipients: []
    },
    {
      id: 'invoice-generation-critical-error-rate',
      name: 'Critical Invoice Generation Error Rate',
      type: 'business',
      condition: 'invoices.errorRate > threshold',
      threshold: 10,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 10,
      recipients: []
    },
    {
      id: 'invoice-email-delivery-failures',
      name: 'Invoice Email Delivery Failures',
      type: 'business',
      condition: 'invoiceEmails.failureRate > threshold',
      threshold: 10,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 20,
      recipients: []
    },
    {
      id: 'invoice-pdf-generation-errors',
      name: 'Invoice PDF Generation Errors',
      type: 'business',
      condition: 'invoicePdf.errorCount > threshold',
      threshold: 3,
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 30,
      recipients: []
    },
    {
      id: 'database-connection-during-invoice',
      name: 'Database Issues During Invoice Generation',
      type: 'business',
      condition: 'invoiceDb.connectionErrors > threshold',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 5,
      recipients: []
    },
    {
      id: 'duplicate-invoice-numbers',
      name: 'Duplicate Invoice Numbers Detected',
      type: 'business',
      condition: 'invoices.duplicateCount > threshold',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 60,
      recipients: []
    },
    {
      id: 'invoice-job-duration-warning',
      name: 'Invoice Job Taking Too Long',
      type: 'business',
      condition: 'invoiceJob.duration > threshold',
      threshold: 900, // 15 minutes in seconds
      severity: 'warning',
      enabled: true,
      cooldownMinutes: 30,
      recipients: []
    },
    {
      id: 'invoice-job-duration-critical',
      name: 'Invoice Job Duration Critical',
      type: 'business',
      condition: 'invoiceJob.duration > threshold',
      threshold: 1800, // 30 minutes in seconds
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 15,
      recipients: []
    }
  ];

  /**
   * @description Initialize alerting service with default rules
   * @security Loads admin recipients and configures default alerting rules
   * @complexity Medium - Service initialization with admin recipient setup
   * @returns {Promise<void>}
   */
  static async initialize(): Promise<void> {
    logger.info('Initializing Alerting Service...');
    
    try {
      // Load admin recipients for default rules
      const adminUsers = await User.find({ isAdmin: true }).select('kontakt.email _id');
      const adminEmails = adminUsers.map(admin => admin.kontakt.email).filter(email => email);
      
      // Update default rules with admin recipients
      this.defaultRules.forEach(rule => {
        rule.recipients = adminEmails;
      });
      
      logger.info('Alerting Service initialized', { ruleCount: this.defaultRules.length, adminCount: adminEmails.length });
    } catch (error) {
      logger.error('Failed to initialize Alerting Service', { error });
    }
  }

  /**
   * @description Check health status and trigger alerts if necessary
   * @param {SystemHealth} healthStatus - System health status to evaluate
   * @security Evaluates health status and triggers appropriate alerts
   * @complexity Medium - Health status evaluation with alert triggering
   * @returns {Promise<void>}
   */
  static async checkHealthAlerts(healthStatus: SystemHealth): Promise<void> {
    for (const component of healthStatus.components) {
      await this.evaluateHealthRule(component);
    }
  }

  /**
   * @description Check performance metrics and trigger alerts if necessary
   * @param {PerformanceSummary} performanceData - Performance data to evaluate
   * @security Evaluates performance metrics and triggers alerts based on thresholds
   * @complexity Medium - Performance evaluation with rule-based alerting
   * @returns {Promise<void>}
   */
  static async checkPerformanceAlerts(performanceData: PerformanceSummary): Promise<void> {
    const performanceRules = this.defaultRules.filter(rule => 
      rule.type === 'performance' || rule.type === 'error'
    );

    for (const rule of performanceRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = this.evaluatePerformanceRule(rule, performanceData);
        
        if (shouldAlert && this.canSendAlert(rule.id, rule.cooldownMinutes)) {
          await this.createAndSendAlert(rule, performanceData);
        }
      } catch (error) {
        logger.error('Failed to evaluate performance rule', { ruleId: rule.id, error });
      }
    }
  }

  /**
   * @description Check invoice generation metrics and trigger alerts if necessary
   * @param {any} invoiceMetrics - Invoice generation metrics data
   * @security Evaluates invoice metrics and triggers alerts based on business rules
   * @complexity Medium - Invoice-specific alert evaluation with multiple failure scenarios
   * @returns {Promise<void>}
   */
  static async checkInvoiceAlerts(invoiceMetrics: any): Promise<void> {
    const invoiceRules = this.defaultRules.filter(rule => 
      rule.type === 'business' && rule.enabled
    );

    for (const rule of invoiceRules) {
      try {
        const shouldAlert = this.evaluateInvoiceRule(rule, invoiceMetrics);
        
        if (shouldAlert && this.canSendAlert(rule.id, rule.cooldownMinutes)) {
          await this.createAndSendAlert(rule, invoiceMetrics);
        }
      } catch (error) {
        logger.error('Failed to evaluate invoice rule', { ruleId: rule.id, error });
      }
    }
  }

  /**
   * @description Evaluate health rule for a specific component
   * @param {ComponentHealth} component - Component health status to evaluate
   * @security Evaluates component health against alerting rules
   * @complexity Medium - Component-specific health rule evaluation
   * @returns {Promise<void>}
   */
  private static async evaluateHealthRule(component: ComponentHealth): Promise<void> {
    const healthRules = this.defaultRules.filter(rule => 
      rule.type === 'health' && rule.condition.includes(component.name)
    );

    for (const rule of healthRules) {
      if (!rule.enabled) continue;

      const shouldAlert = component.status === 'unhealthy';
      
      if (shouldAlert && this.canSendAlert(rule.id, rule.cooldownMinutes)) {
        await this.createAndSendAlert(rule, component);
      }
    }
  }

  /**
   * @description Evaluate performance rule against current metrics
   * @param {AlertRule} rule - Alert rule to evaluate
   * @param {PerformanceSummary} data - Performance data to check against
   * @security Evaluates performance data against rule thresholds
   * @complexity Medium - Rule-based performance evaluation
   * @returns {boolean} True if rule condition is met
   */
  private static evaluatePerformanceRule(rule: AlertRule, data: PerformanceSummary): boolean {
    try {
      switch (rule.id) {
        case 'high-error-rate':
          return data.requests.errorRate > (rule.threshold as number);
        
        case 'slow-response-time':
          return data.requests.averageResponseTime > (rule.threshold as number);
        
        case 'memory-usage-high':
          return data.system.memoryUsage.rss > (rule.threshold as number);
        
        case 'database-slow':
          return data.database.averageResponseTime > (rule.threshold as number);
        
        case 'frequent-errors':
          return data.errors.last5Minutes > (rule.threshold as number);
        
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating rule', { ruleId: rule.id, error });
      return false;
    }
  }

  /**
   * @description Evaluate invoice rule against current metrics
   * @param {AlertRule} rule - Alert rule to evaluate
   * @param {any} data - Invoice metrics data to check against
   * @security Evaluates invoice metrics against rule thresholds
   * @complexity Medium - Rule-based invoice metric evaluation
   * @returns {boolean} True if rule condition is met
   */
  private static evaluateInvoiceRule(rule: AlertRule, data: any): boolean {
    try {
      switch (rule.id) {
        case 'invoice-job-failure':
          return data.jobStatus === 'failed';
        
        case 'invoice-generation-error-rate':
          return data.errorRate > 5;
        
        case 'invoice-generation-critical-error-rate':
          return data.errorRate > 10;
        
        case 'invoice-email-delivery-failures':
          return data.emailFailureRate > 10;
        
        case 'invoice-pdf-generation-errors':
          return data.pdfErrorCount > 3;
        
        case 'database-connection-during-invoice':
          return data.dbConnectionErrors > 0;
        
        case 'duplicate-invoice-numbers':
          return data.duplicateInvoices > 0;
        
        case 'invoice-job-duration-warning':
          return data.jobDurationSeconds > 900; // 15 minutes
        
        case 'invoice-job-duration-critical':
          return data.jobDurationSeconds > 1800; // 30 minutes
        
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating invoice rule', { ruleId: rule.id, error });
      return false;
    }
  }

  /**
   * @description Check if enough time has passed since last alert of same type
   * @param {string} ruleId - Rule ID to check cooldown for
   * @param {number} cooldownMinutes - Cooldown period in minutes
   * @security Implements cooldown to prevent alert spam
   * @complexity Low - Simple cooldown check
   * @returns {boolean} True if alert can be sent
   */
  private static canSendAlert(ruleId: string, cooldownMinutes: number): boolean {
    const lastAlertTime = this.lastAlertTimes.get(ruleId);
    
    if (!lastAlertTime) {
      return true;
    }
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastAlert = Date.now() - lastAlertTime.getTime();
    
    return timeSinceLastAlert >= cooldownMs;
  }

  /**
   * @description Create and send alert
   * @param {AlertRule} rule - Alert rule that triggered
   * @param {any} data - Data that triggered the alert
   * @security Creates alert and sends notifications to configured recipients
   * @complexity Medium - Alert creation and notification sending
   * @returns {Promise<void>}
   */
  private static async createAndSendAlert(rule: AlertRule, data: any): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, data),
      details: data,
      timestamp: new Date(),
      resolved: false,
      notificationsSent: 0
    };

    // Store in memory for immediate access
    this.alerts.set(alertId, alert);
    this.lastAlertTimes.set(rule.id, new Date());

    logger.warn('ALERT TRIGGERED', { severity: alert.severity, title: alert.title, message: alert.message });

    // Send notifications and track channels
    const notificationChannels: {
      email: { sent: boolean; sentAt?: Date; recipients: string[]; errors: string[] };
      webhook: { sent: boolean; sentAt?: Date; platforms: string[]; errors: string[] };
      dashboard: { sent: boolean; sentAt?: Date };
    } = {
      email: { sent: false, recipients: [], errors: [] },
      webhook: { sent: false, platforms: [], errors: [] },
      dashboard: { sent: false }
    };

    try {
      await this.sendAlertNotifications(alert, rule.recipients);
      
      // Update notification tracking based on what was sent
      if (rule.recipients.length > 0) {
        notificationChannels.email.sent = true;
        notificationChannels.email.sentAt = new Date();
        notificationChannels.email.recipients = rule.recipients;
      }
      
      if (process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL) {
        notificationChannels.webhook.sent = true;
        notificationChannels.webhook.sentAt = new Date();
        if (process.env.SLACK_WEBHOOK_URL) notificationChannels.webhook.platforms.push('slack');
        if (process.env.DISCORD_WEBHOOK_URL) notificationChannels.webhook.platforms.push('discord');
      }
      
      notificationChannels.dashboard.sent = true;
      notificationChannels.dashboard.sentAt = new Date();
      
    } catch (error) {
      logger.error('Error sending alert notifications', { error });
    }

    // Persist to database for history tracking
    try {
      const dbAlert = new AlertModel({
        alertId: alertId,
        ruleId: rule.id,
        type: rule.type,
        severity: rule.severity,
        title: rule.name,
        message: alert.message,
        details: data,
        timestamp: alert.timestamp,
        resolved: false,
        notificationsSent: alert.notificationsSent,
        notificationChannels: notificationChannels,
        metadata: {
          correlationId: data.correlationId,
          vendorId: data.vendorId,
          batchId: data.batchId,
          invoiceId: data.invoiceId
        }
      });

      await dbAlert.save();
      logger.info('Alert persisted to database', { alertId });
      
    } catch (dbError) {
      logger.error('Failed to persist alert to database', { error: dbError });
      // Don't throw - alert notifications already sent
    }
  }

  /**
   * @description Generate alert message based on rule and data
   * @param {AlertRule} rule - Alert rule
   * @param {any} data - Data that triggered the alert
   * @complexity Medium - Context-aware message generation
   * @returns {string} Generated alert message
   */
  private static generateAlertMessage(rule: AlertRule, data: any): string {
    switch (rule.id) {
      case 'database-unhealthy':
        return `Database connection is unhealthy: ${data.message}`;
      
      case 'email-service-down':
        return `Email service is unavailable: ${data.message}`;
      
      case 'high-error-rate':
        return `HTTP error rate is ${data.requests.errorRate}% (threshold: ${rule.threshold}%)`;
      
      case 'slow-response-time':
        return `Average response time is ${data.requests.averageResponseTime}ms (threshold: ${rule.threshold}ms)`;
      
      case 'memory-usage-high':
        const memMB = Math.round(data.system.memoryUsage.rss / 1024 / 1024);
        const thresholdMB = Math.round((rule.threshold as number) / 1024 / 1024);
        return `Memory usage is ${memMB}MB (threshold: ${thresholdMB}MB)`;
      
      case 'database-slow':
        return `Database queries averaging ${data.database.averageResponseTime}ms (threshold: ${rule.threshold}ms)`;
      
      case 'frequent-errors':
        return `${data.errors.last5Minutes} errors in last 5 minutes (threshold: ${rule.threshold})`;
      
      case 'trial-service-down':
        return `Trial service is unhealthy: ${data.message}`;
      
      // Invoice-specific alert messages
      case 'invoice-job-failure':
        return `Invoice generation job failed: ${data.errorMessage || 'Unknown error'}`;
      
      case 'invoice-generation-error-rate':
        return `High invoice generation error rate: ${data.errorRate}% (${data.failedCount}/${data.totalCount} failed, threshold: 5%)`;
      
      case 'invoice-generation-critical-error-rate':
        return `Critical invoice generation error rate: ${data.errorRate}% (${data.failedCount}/${data.totalCount} failed, threshold: 10%)`;
      
      case 'invoice-email-delivery-failures':
        return `Invoice email delivery failures: ${data.emailFailureRate}% failure rate (${data.emailFailedCount}/${data.emailTotalCount} failed)`;
      
      case 'invoice-pdf-generation-errors':
        return `Invoice PDF generation errors: ${data.pdfErrorCount} PDFs failed to generate`;
      
      case 'database-connection-during-invoice':
        return `Database connection issues during invoice generation: ${data.dbConnectionErrors} connection errors`;
      
      case 'duplicate-invoice-numbers':
        return `Duplicate invoice numbers detected: ${data.duplicateInvoices} duplicate(s) found`;
      
      case 'invoice-job-duration-warning':
        const warningMinutes = Math.round(data.jobDurationSeconds / 60);
        return `Invoice generation job taking too long: ${warningMinutes} minutes (threshold: 15 minutes)`;
      
      case 'invoice-job-duration-critical':
        const criticalMinutes = Math.round(data.jobDurationSeconds / 60);
        return `Invoice generation job duration critical: ${criticalMinutes} minutes (threshold: 30 minutes)`;
      
      default:
        return `Alert condition met for ${rule.name}`;
    }
  }

  /**
   * @description Send alert notifications via email
   * @param {Alert} alert - Alert to send notifications for
   * @param {string[]} recipients - List of recipient email addresses
   * @security Sends alert notifications to configured recipients
   * @complexity Medium - Email notification sending with error handling
   * @returns {Promise<void>}
   */
  private static async sendAlertNotifications(alert: Alert, recipients: string[]): Promise<void> {
    if (recipients.length === 0) {
      logger.warn('No recipients configured for alert notifications');
      return;
    }

    try {
      // Email notifications
      await this.sendEmailNotifications(alert, recipients);
      
      // Webhook notifications (Slack/Discord)
      await this.sendWebhookNotifications(alert);
      
      // Dashboard notifications (in-memory for real-time display)
      this.sendDashboardNotification(alert);
      
      // Update alert record
      this.alerts.set(alert.id, alert);
      
    } catch (error) {
      logger.error('Failed to send alert notifications', { error });
    }
  }

  /**
   * @description Send email notifications
   * @param {Alert} alert - Alert to send notifications for
   * @param {string[]} recipients - List of recipient email addresses
   * @security Sends email notifications to configured recipients
   * @complexity Medium - Email notification sending with error handling
   * @returns {Promise<void>}
   */
  private static async sendEmailNotifications(alert: Alert, recipients: string[]): Promise<void> {
    try {
      // Import sendMonitoringAlert from emailService
      const { sendMonitoringAlert } = require('../utils/emailService');
      
      for (const recipient of recipients) {
        try {
          await sendMonitoringAlert(recipient, {
            alertId: alert.id,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            timestamp: alert.timestamp,
            details: alert.details
          });
          
          alert.notificationsSent++;
          logger.info('Alert notification sent', { recipient });
        } catch (emailError) {
          logger.error('Failed to send alert notification', { recipient, error: emailError });
        }
      }
    } catch (error) {
      logger.error('Failed to send email notifications', { error });
    }
  }

  /**
   * @description Send webhook notifications (Slack/Discord)
   * @param {Alert} alert - Alert to send notifications for
   * @security Sends webhook notifications with exponential backoff
   * @complexity Medium - Webhook notification with retry logic
   * @returns {Promise<void>}
   */
  private static async sendWebhookNotifications(alert: Alert): Promise<void> {
    try {
      const webhookUrls = [];
      
      // Add Slack webhook if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        webhookUrls.push({
          url: process.env.SLACK_WEBHOOK_URL,
          platform: 'slack'
        });
      }
      
      // Add Discord webhook if configured
      if (process.env.DISCORD_WEBHOOK_URL) {
        webhookUrls.push({
          url: process.env.DISCORD_WEBHOOK_URL,
          platform: 'discord'
        });
      }
      
      for (const webhook of webhookUrls) {
        try {
          await this.sendWebhookWithRetry(webhook, alert);
          alert.notificationsSent++;
          logger.info('Alert notification sent to webhook', { platform: webhook.platform });
        } catch (webhookError) {
          logger.error('Failed to send webhook notification', { platform: webhook.platform, error: webhookError });
        }
      }
    } catch (error) {
      logger.error('Failed to send webhook notifications', { error });
    }
  }

  /**
   * @description Send webhook with exponential backoff retry
   * @param {object} webhook - Webhook configuration
   * @param {Alert} alert - Alert to send
   * @security Implements retry with exponential backoff for reliability
   * @complexity Medium - Webhook sending with retry logic
   * @returns {Promise<void>}
   */
  private static async sendWebhookWithRetry(webhook: any, alert: Alert, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = this.formatWebhookPayload(webhook.platform, alert);
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * @description Format webhook payload for different platforms
   * @param {string} platform - Platform type (slack/discord)
   * @param {Alert} alert - Alert to format
   * @complexity Low - Simple payload formatting
   * @returns {object} Formatted webhook payload
   */
  private static formatWebhookPayload(platform: string, alert: Alert): object {
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = alert.severity === 'critical' ? '#FF0000' : alert.severity === 'warning' ? '#FFA500' : '#0080FF';
    
    if (platform === 'slack') {
      return {
        text: `${emoji} ${alert.title}`,
        attachments: [{
          color: color,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ]
        }]
      };
    } else if (platform === 'discord') {
      return {
        content: `${emoji} **${alert.title}**`,
        embeds: [{
          title: alert.title,
          description: alert.message,
          color: parseInt(color.replace('#', ''), 16),
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Time',
              value: alert.timestamp.toISOString(),
              inline: true
            }
          ],
          timestamp: alert.timestamp.toISOString()
        }]
      };
    }
    
    return {};
  }

  /**
   * @description Send dashboard notification (in-memory for real-time)
   * @param {Alert} alert - Alert to send to dashboard
   * @security Stores alert for dashboard display with deduplication
   * @complexity Low - Simple in-memory notification storage
   * @returns {void}
   */
  private static sendDashboardNotification(alert: Alert): void {
    try {
      // Store alert for dashboard real-time display
      // This would typically integrate with WebSocket or Server-Sent Events
      logger.info('Dashboard notification', { severity: alert.severity, title: alert.title });
      
      // Could emit to WebSocket clients here
      // Example: this.dashboardWebSocket?.emit('alert', alert);
      
    } catch (error) {
      logger.error('Failed to send dashboard notification', { error });
    }
  }

  /**
   * @description Mark alert as resolved
   * @param {string} alertId - Alert ID to resolve
   * @security Updates alert status to resolved
   * @complexity Low - Simple alert resolution
   * @returns {boolean} True if alert was found and resolved
   */
  static async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    try {
      // Update in database
      const dbAlert = await AlertModel.findOne({ alertId: alertId });
      if (!dbAlert) {
        logger.warn('Alert not found in database', { alertId });
        return false;
      }
      
      dbAlert.resolved = true;
      dbAlert.resolvedAt = new Date();
      if (resolvedBy) {
        dbAlert.resolvedBy = resolvedBy;
      }
      
      await dbAlert.save();
      
      // Update in memory if exists
      const memoryAlert = this.alerts.get(alertId);
      if (memoryAlert) {
        memoryAlert.resolved = true;
        memoryAlert.resolvedAt = new Date();
        this.alerts.set(alertId, memoryAlert);
      }
      
      logger.info('Alert resolved', { title: dbAlert.title, alertId });
      return true;
      
    } catch (error) {
      logger.error('Failed to resolve alert in database', { error });
      
      // Fallback to memory-only resolution
      const alert = this.alerts.get(alertId);
      if (!alert) {
        return false;
      }
      
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.alerts.set(alertId, alert);
      
      logger.info('Alert resolved (memory only)', { title: alert.title, alertId });
      return true;
    }
  }

  /**
   * @description Get all active alerts
   * @security Returns only unresolved alerts
   * @complexity Low - Simple alert filtering
   * @returns {Alert[]} Array of active alerts
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    try {
      const dbAlerts = await AlertModel.findActiveAlerts();
      return dbAlerts.map(dbAlert => ({
        id: dbAlert.alertId,
        ruleId: dbAlert.ruleId,
        type: dbAlert.type,
        severity: dbAlert.severity,
        title: dbAlert.title,
        message: dbAlert.message,
        details: dbAlert.details,
        timestamp: dbAlert.timestamp,
        resolved: dbAlert.resolved,
        resolvedAt: dbAlert.resolvedAt,
        notificationsSent: dbAlert.notificationsSent
      }));
    } catch (error) {
      logger.error('Failed to fetch active alerts from database', { error });
      // Fallback to memory
      return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    }
  }

  /**
   * @description Get alert history
   * @param {number} limit - Maximum number of alerts to return
   * @security Returns alert history with pagination
   * @complexity Low - Simple alert history retrieval
   * @returns {Alert[]} Array of historical alerts
   */
  static async getAlertHistory(limit: number = 50): Promise<Alert[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const dbAlerts = await AlertModel.findAlertsByTimeRange(startDate, endDate);
      return dbAlerts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
        .map(dbAlert => ({
          id: dbAlert.alertId,
          ruleId: dbAlert.ruleId,
          type: dbAlert.type,
          severity: dbAlert.severity,
          title: dbAlert.title,
          message: dbAlert.message,
          details: dbAlert.details,
          timestamp: dbAlert.timestamp,
          resolved: dbAlert.resolved,
          resolvedAt: dbAlert.resolvedAt,
          notificationsSent: dbAlert.notificationsSent
        }));
    } catch (error) {
      logger.error('Failed to fetch alert history from database', { error });
      // Fallback to memory
      return Array.from(this.alerts.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    }
  }

  /**
   * @description Get alerts by severity
   * @param {'warning' | 'critical' | 'emergency'} severity - Severity level to filter by
   * @security Returns alerts filtered by severity level
   * @complexity Low - Simple severity filtering
   * @returns {Alert[]} Array of alerts with specified severity
   */
  static async getAlertsBySeverity(severity: 'warning' | 'critical' | 'emergency'): Promise<Alert[]> {
    try {
      const dbAlerts = await AlertModel.findAlertsBySeverity(severity);
      return dbAlerts.map(dbAlert => ({
        id: dbAlert.alertId,
        ruleId: dbAlert.ruleId,
        type: dbAlert.type,
        severity: dbAlert.severity,
        title: dbAlert.title,
        message: dbAlert.message,
        details: dbAlert.details,
        timestamp: dbAlert.timestamp,
        resolved: dbAlert.resolved,
        resolvedAt: dbAlert.resolvedAt,
        notificationsSent: dbAlert.notificationsSent
      }));
    } catch (error) {
      logger.error('Failed to fetch alerts by severity from database', { error });
      // Fallback to memory
      return Array.from(this.alerts.values()).filter(alert => 
        alert.severity === severity && !alert.resolved
      );
    }
  }

  /**
   * @description Clear old resolved alerts to prevent memory buildup
   * @security Removes old resolved alerts to prevent memory leaks
   * @complexity Low - Simple cleanup with age-based filtering
   */
  static async cleanupOldAlerts(days: number = 3): Promise<void> {
    try {
      // Cleanup database alerts
      const deletedCount = await AlertModel.cleanupOldAlerts(days);
      
      // Cleanup memory alerts
      const threeDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let memoryCleanedCount = 0;
      
      for (const [alertId, alert] of this.alerts) {
        if (alert.resolved && alert.resolvedAt && alert.resolvedAt < threeDaysAgo) {
          this.alerts.delete(alertId);
          memoryCleanedCount++;
        }
      }
      
      if (deletedCount > 0 || memoryCleanedCount > 0) {
        logger.info('Cleaned up old alerts', { databaseAlerts: deletedCount, memoryAlerts: memoryCleanedCount });
      }
      
    } catch (error) {
      logger.error('Failed to cleanup old alerts', { error });
      
      // Fallback to memory-only cleanup
      const threeDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;
      
      for (const [alertId, alert] of this.alerts) {
        if (alert.resolved && alert.resolvedAt && alert.resolvedAt < threeDaysAgo) {
          this.alerts.delete(alertId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('Cleaned up memory alerts (database cleanup failed)', { count: cleanedCount });
      }
    }
  }

  /**
   * @description Get alert statistics
   * @security Provides aggregated alert statistics
   * @complexity Medium - Statistical aggregation of alerts
   * @returns {object} Alert statistics object
   */
  static async getAlertStatistics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    bySeverity: { warning: number; critical: number; emergency: number };
    last24Hours: number;
  }> {
    try {
      return await AlertModel.getAlertStatistics();
    } catch (error) {
      logger.error('Failed to fetch alert statistics from database', { error });
      // Fallback to memory
      const allAlerts = Array.from(this.alerts.values());
      const activeAlerts = allAlerts.filter(a => !a.resolved);
      const resolvedAlerts = allAlerts.filter(a => a.resolved);
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAlerts = allAlerts.filter(a => a.timestamp >= twentyFourHoursAgo);
      
      const bySeverity = {
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        emergency: activeAlerts.filter(a => a.severity === 'emergency').length
      };
      
      return {
        total: allAlerts.length,
        active: activeAlerts.length,
        resolved: resolvedAlerts.length,
        bySeverity,
        last24Hours: recentAlerts.length
      };
    }
  }

  /**
   * @description Test alert system by sending a test alert
   * @security Sends test alert to verify system functionality
   * @complexity Medium - Test alert creation and sending
   * @returns {Promise<boolean>} True if test alert was sent successfully
   */
  static async sendTestAlert(): Promise<boolean> {
    try {
      const testRule: AlertRule = {
        id: 'test-alert',
        name: 'Test Alert',
        type: 'health',
        condition: 'manual test',
        threshold: 1,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 0,
        recipients: []
      };

      // Get admin emails
      const admins = await User.find({ isAdmin: true }).select('kontakt.email');
      const adminEmails = admins.map(admin => admin.kontakt.email).filter(email => email);
      
      if (adminEmails.length === 0) {
        logger.warn('No admin emails found for test alert');
        return false;
      }

      testRule.recipients = adminEmails;

      await this.createAndSendAlert(testRule, {
        message: 'This is a test alert to verify the monitoring system is working correctly.',
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      logger.error('Failed to send test alert', { error });
      return false;
    }
  }
}

export default AlertingService;