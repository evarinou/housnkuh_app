// server/src/services/alertingService.ts
import { SystemHealth, ComponentHealth } from './healthCheckService';
import { PerformanceSummary } from '../utils/performanceMonitor';
import User from '../models/User';
import Settings from '../models/Settings';

export interface AlertRule {
  id: string;
  name: string;
  type: 'health' | 'performance' | 'error' | 'business';
  condition: string;
  threshold: number | string;
  severity: 'warning' | 'critical' | 'emergency';
  enabled: boolean;
  cooldownMinutes: number; // Minimum time between alerts of same type
  recipients: string[]; // Admin user IDs or email addresses
}

export interface Alert {
  id: string;
  ruleId: string;
  type: string;
  severity: 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  notificationsSent: number;
}

/**
 * Alerting Service for monitoring system health and performance
 * Sends notifications via email using existing emailService patterns
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
   * Initialize alerting service with default rules
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
   * Check health status and trigger alerts if necessary
   */
  static async checkHealthAlerts(healthStatus: SystemHealth): Promise<void> {
    for (const component of healthStatus.components) {
      await this.evaluateHealthRule(component);
    }
  }

  /**
   * Check performance metrics and trigger alerts if necessary
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
   * Evaluate health rule for a specific component
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
   * Evaluate performance rule against current metrics
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
   * Check if enough time has passed since last alert of same type
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
   * Create and send alert
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
   * Generate alert message based on rule and data
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
   * Send alert notifications via email
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
   * Mark alert as resolved
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
   * Get all active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  static getAlertHistory(limit: number = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get alerts by severity
   */
  static getAlertsBySeverity(severity: 'warning' | 'critical' | 'emergency'): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => 
      alert.severity === severity && !alert.resolved
    );
  }

  /**
   * Clear old resolved alerts to prevent memory buildup
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
   * Get alert statistics
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
   * Test alert system by sending a test alert
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