/**
 * @file Trial Monitoring Service for trial metrics and health monitoring
 * @description Service for comprehensive trial monitoring, metrics collection, and health assessment
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/trialMonitoringService.ts
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import { IUser } from '../types/modelTypes';
import { performanceMonitor } from '../utils/performanceMonitor';
import AlertingService from './alertingService';
import { cache } from '../utils/cache';

/**
 * @interface TrialMetrics
 * @description Comprehensive trial metrics for monitoring
 */
interface TrialMetrics {
  /** @description Total number of trials */
  totalTrials: number;
  /** @description Number of active trials */
  activeTrials: number;
  /** @description Number of expired trials */
  expiredTrials: number;
  /** @description Number of converted trials */
  convertedTrials: number;
  /** @description Conversion rate percentage */
  conversionRate: number;
  /** @description Average trial duration in days */
  averageTrialDuration: number;
  /** @description Breakdown of trials by status */
  trialsByStatus: {
    active: number;
    expired: number;
    converted: number;
    cancelled: number;
  };
  /** @description Upcoming trial expirations */
  upcomingExpirations: {
    next24Hours: number;
    next3Days: number;
    next7Days: number;
  };
  /** @description Statistics about sent reminders */
  reminderStats: {
    sevenDaySent: number;
    threeDaySent: number;
    oneDaySent: number;
    expirationSent: number;
  };
  /** @description Recent trial activity */
  recentActivity: Array<{
    userId: string;
    username: string;
    action: string;
    timestamp: Date;
  }>;
}

/**
 * @interface TrialHealthMetrics
 * @description Health assessment for trial system
 */
interface TrialHealthMetrics {
  /** @description Whether the trial system is healthy */
  healthy: boolean;
  /** @description List of identified issues */
  issues: string[];
  /** @description Recommendations for improvement */
  recommendations: string[];
  /** @description Health scores for different aspects */
  scores: {
    conversionRate: number;
    automation: number;
    userExperience: number;
    overall: number;
  };
}

/**
 * @class TrialMonitoringService
 * @description Singleton service for comprehensive trial monitoring and health assessment
 * @security Provides aggregated metrics without exposing individual user data
 * @complexity High - Complex metrics calculation with health assessment and alerting
 */
class TrialMonitoringService {
  private static instance: TrialMonitoringService;
  private metricsCache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * @description Get singleton instance of TrialMonitoringService
   * @returns {TrialMonitoringService} Singleton instance
   * @complexity Low - Singleton pattern implementation
   */
  static getInstance(): TrialMonitoringService {
    if (!TrialMonitoringService.instance) {
      TrialMonitoringService.instance = new TrialMonitoringService();
    }
    return TrialMonitoringService.instance;
  }

  /**
   * @description Get comprehensive trial metrics
   * @security Provides aggregated metrics without exposing individual user data
   * @complexity High - Complex metrics calculation with caching
   * @returns {Promise<TrialMetrics>} Comprehensive trial metrics object
   */
  async getTrialMetrics(): Promise<TrialMetrics> {
    const cacheKey = 'trial-metrics';
    const cached = this.getCachedMetrics(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all vendors with trial information
      const vendors = await User.find({ 
        isVendor: true,
        trialStartDate: { $exists: true }
      }).lean();

      const now = new Date();
      const metrics: TrialMetrics = {
        totalTrials: vendors.length,
        activeTrials: 0,
        expiredTrials: 0,
        convertedTrials: 0,
        conversionRate: 0,
        averageTrialDuration: 0,
        trialsByStatus: {
          active: 0,
          expired: 0,
          converted: 0,
          cancelled: 0
        },
        upcomingExpirations: {
          next24Hours: 0,
          next3Days: 0,
          next7Days: 0
        },
        reminderStats: {
          sevenDaySent: 0,
          threeDaySent: 0,
          oneDaySent: 0,
          expirationSent: 0
        },
        recentActivity: []
      };

      let totalDuration = 0;
      let durationCount = 0;

      // Process each vendor
      for (const vendor of vendors) {
        const trialEndDate = vendor.trialEndDate ? new Date(vendor.trialEndDate) : null;
        const trialStartDate = vendor.trialStartDate ? new Date(vendor.trialStartDate) : new Date();
        
        // Determine trial status
        if (vendor.trialAutomation?.trialConversionDate) {
          metrics.convertedTrials++;
          metrics.trialsByStatus.converted++;
          
          // Calculate trial duration
          const duration = vendor.trialAutomation.trialConversionDate.getTime() - trialStartDate.getTime();
          totalDuration += duration;
          durationCount++;
        } else if (trialEndDate && trialEndDate < now) {
          metrics.expiredTrials++;
          metrics.trialsByStatus.expired++;
        } else if (trialEndDate && trialEndDate >= now) {
          metrics.activeTrials++;
          metrics.trialsByStatus.active++;
          
          // Calculate upcoming expirations
          const daysUntilExpiry = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 1) metrics.upcomingExpirations.next24Hours++;
          if (daysUntilExpiry <= 3) metrics.upcomingExpirations.next3Days++;
          if (daysUntilExpiry <= 7) metrics.upcomingExpirations.next7Days++;
        }

        // Count reminders sent
        if (vendor.trialAutomation?.remindersSent) {
          if (vendor.trialAutomation.remindersSent.sevenDayReminder) metrics.reminderStats.sevenDaySent++;
          if (vendor.trialAutomation.remindersSent.threeDayReminder) metrics.reminderStats.threeDaySent++;
          if (vendor.trialAutomation.remindersSent.oneDayReminder) metrics.reminderStats.oneDaySent++;
          if (vendor.trialAutomation.remindersSent.expirationNotification) metrics.reminderStats.expirationSent++;
        }
      }

      // Calculate conversion rate
      if (metrics.totalTrials > 0) {
        metrics.conversionRate = (metrics.convertedTrials / metrics.totalTrials) * 100;
      }

      // Calculate average trial duration
      if (durationCount > 0) {
        metrics.averageTrialDuration = totalDuration / durationCount / (1000 * 60 * 60 * 24); // in days
      }

      // Get recent activity
      metrics.recentActivity = await this.getRecentTrialActivity();

      this.setCachedMetrics(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting trial metrics:', error);
      throw error;
    }
  }

  /**
   * @description Get trial health metrics and recommendations
   * @security Provides health assessment with improvement recommendations
   * @complexity High - Complex health assessment with scoring
   * @returns {Promise<TrialHealthMetrics>} Trial health metrics object
   */
  async getTrialHealthMetrics(): Promise<TrialHealthMetrics> {
    const metrics = await this.getTrialMetrics();
    const health: TrialHealthMetrics = {
      healthy: true,
      issues: [],
      recommendations: [],
      scores: {
        conversionRate: 0,
        automation: 0,
        userExperience: 0,
        overall: 0
      }
    };

    // Evaluate conversion rate
    if (metrics.conversionRate >= 30) {
      health.scores.conversionRate = 100;
    } else if (metrics.conversionRate >= 20) {
      health.scores.conversionRate = 75;
    } else if (metrics.conversionRate >= 10) {
      health.scores.conversionRate = 50;
      health.issues.push('Conversion rate below target (30%)');
      health.recommendations.push('Consider improving trial experience or extending trial period');
    } else {
      health.scores.conversionRate = 25;
      health.issues.push('Critical: Very low conversion rate');
      health.recommendations.push('Urgent: Review trial process and user feedback');
      health.healthy = false;
    }

    // Evaluate automation effectiveness
    const automationRate = (metrics.reminderStats.sevenDaySent + metrics.reminderStats.threeDaySent) / 
                         (metrics.activeTrials + metrics.expiredTrials) * 100;
    if (automationRate >= 90) {
      health.scores.automation = 100;
    } else if (automationRate >= 70) {
      health.scores.automation = 75;
    } else {
      health.scores.automation = 50;
      health.issues.push('Email automation not reaching all users');
      health.recommendations.push('Check email delivery and automation jobs');
    }

    // Evaluate user experience (based on early conversions)
    if (metrics.averageTrialDuration <= 7) {
      health.scores.userExperience = 100; // Quick conversions indicate good UX
    } else if (metrics.averageTrialDuration <= 14) {
      health.scores.userExperience = 75;
    } else {
      health.scores.userExperience = 50;
      health.recommendations.push('Users taking long to convert - improve onboarding');
    }

    // Calculate overall score
    health.scores.overall = (
      health.scores.conversionRate * 0.5 +
      health.scores.automation * 0.3 +
      health.scores.userExperience * 0.2
    );

    // Check for critical issues
    if (metrics.upcomingExpirations.next24Hours > 10) {
      health.issues.push(`High number of trials expiring soon: ${metrics.upcomingExpirations.next24Hours} in next 24h`);
      health.recommendations.push('Prepare for potential support inquiries');
    }

    return health;
  }

  /**
   * @description Get real-time trial dashboard data
   * @security Combines metrics, health, and alerts for dashboard
   * @complexity High - Aggregates multiple data sources
   * @returns {Promise<object>} Dashboard data object
   */
  async getTrialDashboard() {
    const [metrics, health, alerts] = await Promise.all([
      this.getTrialMetrics(),
      this.getTrialHealthMetrics(),
      this.getRecentAlerts()
    ]);

    return {
      metrics,
      health,
      alerts,
      lastUpdated: new Date()
    };
  }

  /**
   * @description Monitor trial conversions and trigger alerts
   * @security Monitors conversion rates and triggers alerts for issues
   * @complexity Medium - Conversion monitoring with alerting
   * @returns {Promise<void>}
   */
  async monitorTrialConversions(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const metrics = await this.getTrialMetrics();
      
      // Check conversion rate
      if (metrics.conversionRate < 10) {
        // TODO: Implement proper alerting after test cleanup
        console.warn('ALERT:', {
          type: 'trial_conversion_low',
          severity: 'high',
          title: 'Critical: Low Trial Conversion Rate',
          message: `Trial conversion rate has dropped to ${metrics.conversionRate.toFixed(1)}%`,
          details: {
            currentRate: metrics.conversionRate,
            targetRate: 30,
            activeTrials: metrics.activeTrials,
            recentConversions: metrics.convertedTrials
          }
        });
      }

      // Check for mass expirations
      if (metrics.upcomingExpirations.next24Hours > 20) {
        // TODO: Implement proper alerting after test cleanup
        console.warn('ALERT:', {
          type: 'mass_trial_expiration',
          severity: 'medium',
          title: 'High Volume of Trial Expirations',
          message: `${metrics.upcomingExpirations.next24Hours} trials expiring in next 24 hours`,
          details: metrics.upcomingExpirations
        });
      }

      // Record monitoring execution
      performanceMonitor.recordDatabaseOperation({
        operation: 'trial_monitoring',
        collection: 'users',
        duration: Date.now() - startTime,
        success: true
      });

    } catch (error) {
      console.error('Error monitoring trial conversions:', error);
      performanceMonitor.recordError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * @description Get recent trial activity for activity feed
   * @param {number} limit - Maximum number of activities to return
   * @security Provides recent activity without sensitive data
   * @complexity Medium - Activity aggregation with time filtering
   * @returns {Promise<any[]>} Array of recent trial activities
   */
  private async getRecentTrialActivity(limit: number = 20): Promise<any[]> {
    try {
      const recentVendors = await User.find({
        isVendor: true,
        $or: [
          { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          { 'trialAutomation.trialConversionDate': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('username trialStartDate trialAutomation createdAt')
      .lean();

      const activities = [];
      
      for (const vendor of recentVendors) {
        // Trial started
        activities.push({
          userId: vendor._id,
          username: vendor.username,
          action: 'trial_started',
          timestamp: vendor.trialStartDate || vendor.createdAt
        });

        // Trial converted
        if (vendor.trialAutomation?.trialConversionDate) {
          activities.push({
            userId: vendor._id,
            username: vendor.username,
            action: 'trial_converted',
            timestamp: vendor.trialAutomation.trialConversionDate
          });
        }
      }

      // Sort by timestamp and return most recent
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent trial activity:', error);
      return [];
    }
  }

  /**
   * @description Get recent alerts related to trials
   * @param {number} limit - Maximum number of alerts to return
   * @security Provides recent alerts for trial monitoring
   * @complexity Low - Alert retrieval placeholder
   * @returns {Promise<any[]>} Array of recent alerts
   */
  private async getRecentAlerts(limit: number = 10): Promise<any[]> {
    // This would integrate with your alerting system
    // For now, return mock data structure
    return [];
  }

  /**
   * @description Get cached metrics if not expired
   * @param {string} key - Cache key
   * @security Implements TTL-based caching
   * @complexity Low - Simple cache retrieval
   * @returns {any | null} Cached data or null if expired
   */
  private getCachedMetrics(key: string): any | null {
    const cached = this.metricsCache.get(key);
    if (cached && cached.timestamp > Date.now() - this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * @description Set cached metrics with timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @complexity Low - Simple cache storage
   * @security Implements timestamp-based caching
   */
  private setCachedMetrics(key: string, data: any): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * @description Clear metrics cache
   * @security Forces cache refresh on next access
   * @complexity Low - Simple cache clearing
   */
  clearCache(): void {
    this.metricsCache.clear();
  }
}

export const trialMonitoringService = TrialMonitoringService.getInstance();