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
import Settings from '../models/Settings';

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
    }
  ];

  /**
   * @description Initialize alerting service with default rules
   * @security Loads admin recipients and configures default alerting rules
   * @complexity Medium - Service initialization with admin recipient setup
   * @returns {Promise<void>}
   */
  static async initialize(): Promise<void> {
    console.log('📢 Initializing Alerting Service...');
    
    try {
      // Load admin recipients for default rules
      const adminUsers = await User.find({ isAdmin: true }).select('kontakt.email _id');
      const adminEmails = adminUsers.map(admin => admin.kontakt.email).filter(email => email);
      
      // Update default rules with admin recipients
      this.defaultRules.forEach(rule => {
        rule.recipients = adminEmails;
      });
      
      console.log(`✅ Alerting Service initialized with ${this.defaultRules.length} rules for ${adminEmails.length} admins`);
    } catch (error) {
      console.error('❌ Failed to initialize Alerting Service:', error);
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
        console.error(`Failed to evaluate performance rule ${rule.id}:`, error);
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
      console.error(`Error evaluating rule ${rule.id}:`, error);
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

    this.alerts.set(alertId, alert);
    this.lastAlertTimes.set(rule.id, new Date());

    console.warn(`🚨 ALERT TRIGGERED: ${alert.severity.toUpperCase()} - ${alert.title}`);
    console.warn(`📝 Message: ${alert.message}`);

    // Send email notifications
    await this.sendAlertNotifications(alert, rule.recipients);
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
      console.warn('⚠️ No recipients configured for alert notifications');
      return;
    }

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
          console.log(`📧 Alert notification sent to: ${recipient}`);
        } catch (emailError) {
          console.error(`Failed to send alert notification to ${recipient}:`, emailError);
        }
      }
      
      // Update alert record
      this.alerts.set(alert.id, alert);
      
    } catch (error) {
      console.error('Failed to send alert notifications:', error);
    }
  }

  /**
   * @description Mark alert as resolved
   * @param {string} alertId - Alert ID to resolve
   * @security Updates alert status to resolved
   * @complexity Low - Simple alert resolution
   * @returns {boolean} True if alert was found and resolved
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      return false;
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    this.alerts.set(alertId, alert);
    
    console.log(`✅ Alert resolved: ${alert.title} (${alertId})`);
    return true;
  }

  /**
   * @description Get all active alerts
   * @security Returns only unresolved alerts
   * @complexity Low - Simple alert filtering
   * @returns {Alert[]} Array of active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * @description Get alert history
   * @param {number} limit - Maximum number of alerts to return
   * @security Returns alert history with pagination
   * @complexity Low - Simple alert history retrieval
   * @returns {Alert[]} Array of historical alerts
   */
  static getAlertHistory(limit: number = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * @description Get alerts by severity
   * @param {'warning' | 'critical' | 'emergency'} severity - Severity level to filter by
   * @security Returns alerts filtered by severity level
   * @complexity Low - Simple severity filtering
   * @returns {Alert[]} Array of alerts with specified severity
   */
  static getAlertsBySeverity(severity: 'warning' | 'critical' | 'emergency'): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => 
      alert.severity === severity && !alert.resolved
    );
  }

  /**
   * @description Clear old resolved alerts to prevent memory buildup
   * @security Removes old resolved alerts to prevent memory leaks
   * @complexity Low - Simple cleanup with age-based filtering
   */
  static cleanupOldAlerts(): void {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < threeDaysAgo) {
        this.alerts.delete(alertId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old resolved alerts`);
    }
  }

  /**
   * @description Get alert statistics
   * @security Provides aggregated alert statistics
   * @complexity Medium - Statistical aggregation of alerts
   * @returns {object} Alert statistics object
   */
  static getAlertStatistics(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: { warning: number; critical: number; emergency: number };
    last24Hours: number;
  } {
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
        console.warn('No admin emails found for test alert');
        return false;
      }

      testRule.recipients = adminEmails;

      await this.createAndSendAlert(testRule, {
        message: 'This is a test alert to verify the monitoring system is working correctly.',
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Failed to send test alert:', error);
      return false;
    }
  }
}

export default AlertingService;