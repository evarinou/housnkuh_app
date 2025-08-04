/**
 * @file Scheduled Jobs Service for automated system management
 * @description Comprehensive service for managing automated jobs including trial management, health checks, and monitoring
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/scheduledJobs.ts
import * as cron from 'node-cron';
import TrialService from './trialService';
import HealthCheckService from './healthCheckService';
import AlertingService from './alertingService';
import RevenueCalculationJob from '../jobs/revenueCalculationJob';
import { performanceMonitor } from '../utils/performanceMonitor';
import Settings from '../models/Settings';
import logger from '../utils/logger';

/**
 * @class ScheduledJobs
 * @description Scheduled Jobs Service for automated trial management and system monitoring
 * @implements Automated trial activation and status tracking
 * @security Manages sensitive automated processes with proper error handling
 * @complexity High - Coordinates multiple scheduled jobs with different frequencies
 */
export class ScheduledJobs {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * @description Initialize all scheduled jobs for the system
   * @security Initializes alerting service and sets up automated jobs
   * @complexity High - Coordinates multiple job schedules and dependencies
   * @returns {Promise<void>}
   * @throws {Error} If job initialization fails
   */
  static async initialize(): Promise<void> {
    logger.info('🕒 Initializing scheduled jobs...');
    
    // Initialize alerting service
    await AlertingService.initialize();
    
    // Job 1: Check for trial activation (every hour)
    this.scheduleTrialActivationCheck();
    
    // Job 2: Update trial statuses (daily at 6 AM)
    this.scheduleTrialStatusUpdate();
    
    // Job 3: Monitoring health checks (every 5 minutes)
    this.scheduleHealthChecks();
    
    // Job 4: Performance monitoring (every 10 minutes)
    this.schedulePerformanceMonitoring();
    
    // Job 5: Alert cleanup (daily at 2 AM)
    this.scheduleAlertCleanup();
    
    // Job 6: Revenue calculation (monthly on 1st at 2 AM)
    this.scheduleRevenueCalculation();
    
    logger.info('✅ Scheduled jobs initialized successfully');
  }

  /**
   * @description Schedule trial activation check - runs every 5 minutes
   * @security Checks store opening and activates waiting trials
   * @complexity Medium - Periodic activation check with rescheduling logic
   * @returns {void}
   */
  private static scheduleTrialActivationCheck(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('🔍 Running trial activation check...');
        const activated = await TrialService.checkForTrialActivation();
        
        if (activated) {
          logger.info('✅ Trial activation check completed - trials were activated');
          // After successful activation, reschedule to hourly checks
          this.rescheduleToHourlyChecks();
        } else {
          logger.info('ℹ️ Trial activation check completed - no action needed');
        }
      } catch (error) {
        logger.error('❌ Trial activation check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-activation-check', task);
    logger.info('📅 Trial activation check scheduled (every 5 minutes)');
  }

  /**
   * @description Reschedule trial activation check to hourly after launch
   * @security Optimizes job frequency after initial launch period
   * @complexity Medium - Dynamic job rescheduling
   * @returns {void}
   */
  private static rescheduleToHourlyChecks(): void {
    const existingTask = this.jobs.get('trial-activation-check');
    if (existingTask) {
      existingTask.stop();
    }

    const task = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('🔍 Running hourly trial activation check...');
        await TrialService.checkForTrialActivation();
      } catch (error) {
        logger.error('❌ Trial activation check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-activation-check', task);
    logger.info('📅 Trial activation check rescheduled to hourly');
  }

  /**
   * @description Schedule trial status update - runs daily at 6 AM
   * @security Processes trial status updates with batch optimization
   * @complexity High - Batch processing with analytics and error handling
   * @returns {void}
   */
  private static scheduleTrialStatusUpdate(): void {
    const task = cron.schedule('0 6 * * *', async () => {
      try {
        logger.info('📊 Running daily trial status update...');
        const startTime = Date.now();
        
        // Run optimized trial status update
        const result = await TrialService.updateTrialStatuses();
        
        const duration = Date.now() - startTime;
        logger.info(`✅ Trial status update completed in ${duration}ms:`, {
          updated: result.updatedCount,
          expired: result.expiredCount,
          warnings: result.warnings.length
        });
        
        if (result.warnings.length > 0) {
          logger.warn('⚠️ Trial status update warnings:', result.warnings);
        }
        
        // Run trial analytics update for admin dashboard
        try {
          await TrialService.getTrialAnalytics();
          logger.info('📈 Trial analytics updated successfully');
        } catch (analyticsError) {
          logger.error('❌ Trial analytics update failed:', analyticsError);
        }
        
      } catch (error) {
        logger.error('❌ Trial status update failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-status-update', task);
    logger.info('📅 Trial status update scheduled (daily at 6 AM)');
  }

  /**
   * @description Manually trigger trial activation check (for admin use)
   * @security Admin-only manual trigger for trial activation
   * @complexity Medium - Manual job execution with result tracking
   * @returns {Promise<any>} Result object with success status and timestamp
   */
  static async triggerTrialActivationCheck(): Promise<any> {
    try {
      logger.info('🔧 Manual trial activation check triggered');
      const result = await TrialService.checkForTrialActivation();
      
      return {
        success: true,
        activated: result,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Manual trial activation check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Manually trigger trial status update (for admin use)
   * @security Admin-only manual trigger for status updates
   * @complexity Medium - Manual job execution with result tracking
   * @returns {Promise<any>} Result object with success status and update results
   */
  static async triggerTrialStatusUpdate(): Promise<any> {
    try {
      logger.info('🔧 Manual trial status update triggered');
      const result = await TrialService.updateTrialStatuses();
      
      return {
        success: true,
        result,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Manual trial status update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Manually trigger revenue calculation (for admin use)
   * @param {number} [year] - Optional year for calculation
   * @param {number} [month] - Optional month for calculation
   * @security Admin-only manual trigger for revenue calculations
   * @complexity Medium - Manual job execution with period selection
   * @returns {Promise<any>} Result object with success status and calculation period
   */
  static async triggerRevenueCalculation(year?: number, month?: number): Promise<any> {
    try {
      logger.info('🔧 Manual revenue calculation triggered');
      
      if (year && month) {
        await RevenueCalculationJob.calculateForMonth(year, month);
        return {
          success: true,
          period: `${month}/${year}`,
          timestamp: new Date()
        };
      } else {
        await RevenueCalculationJob.run();
        return {
          success: true,
          period: 'current/previous month',
          timestamp: new Date()
        };
      }
    } catch (error) {
      logger.error('❌ Manual revenue calculation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Stop all scheduled jobs
   * @security Safely stops all running jobs
   * @complexity Medium - Coordinates stopping multiple jobs
   * @returns {void}
   */
  static stopAll(): void {
    logger.info('🛑 Stopping all scheduled jobs...');
    
    for (const [name, task] of this.jobs) {
      task.stop();
      logger.info(`⏹️ Stopped job: ${name}`);
    }
    
    // Stop the revenue calculation job separately
    RevenueCalculationJob.stop();
    
    this.jobs.clear();
    logger.info('✅ All scheduled jobs stopped');
  }

  /**
   * @description Get status of all scheduled jobs
   * @security Provides job status information
   * @complexity Low - Simple status reporting
   * @returns {any} Status object with job information
   */
  static getJobsStatus(): any {
    const status: any = {};
    
    for (const [name, task] of this.jobs) {
      status[name] = {
        scheduled: true,
        name: name
      };
    }
    
    return {
      totalJobs: this.jobs.size,
      jobs: status,
      timezone: 'Europe/Berlin'
    };
  }

  /**
   * @description Manual trial activation for specific vendor (admin endpoint)
   * @param {string} vendorId - The vendor ID to activate
   * @security Admin-only vendor-specific trial activation
   * @complexity Medium - Individual vendor activation with tracking
   * @returns {Promise<any>} Result object with success status and vendor ID
   */
  static async activateVendorTrial(vendorId: string): Promise<any> {
    try {
      logger.info(`🔧 Manual trial activation for vendor: ${vendorId}`);
      await TrialService.manuallyActivateVendorTrial(vendorId);
      
      return {
        success: true,
        vendorId,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`❌ Manual trial activation failed for vendor ${vendorId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        vendorId,
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Get trial statistics (for admin dashboard)
   * @security Provides aggregated trial statistics
   * @complexity Medium - Statistics aggregation with error handling
   * @returns {Promise<any>} Statistics object with trial data
   */
  static async getTrialStatistics(): Promise<any> {
    try {
      const stats = await TrialService.getTrialStatistics();
      return {
        success: true,
        statistics: stats,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Failed to get trial statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Schedule health checks - runs every 5 minutes
   * @security Monitors system health and triggers alerts
   * @complexity Medium - Health monitoring with alert integration
   * @returns {void}
   */
  private static scheduleHealthChecks(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('🏥 Running scheduled health check...');
        
        // Get monitoring settings to check if health checks are enabled
        const settings = await Settings.getSettings();
        if (!settings.monitoring.healthChecks.enabled) {
          logger.info('ℹ️ Health checks are disabled in settings');
          return;
        }

        const healthStatus = await HealthCheckService.performHealthCheck();
        
        // Check for alerts
        await AlertingService.checkHealthAlerts(healthStatus);
        
        logger.info(`✅ Health check completed - Overall status: ${healthStatus.overall}`);
      } catch (error) {
        logger.error('❌ Scheduled health check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('health-checks', task);
    logger.info('📅 Health checks scheduled (every 5 minutes)');
  }

  /**
   * @description Schedule performance monitoring - runs every 10 minutes
   * @security Monitors system performance and triggers alerts
   * @complexity High - Performance monitoring with trial conversion tracking
   * @returns {void}
   */
  private static schedulePerformanceMonitoring(): void {
    const task = cron.schedule('*/10 * * * *', async () => {
      try {
        logger.info('📊 Running scheduled performance monitoring...');
        
        // Get monitoring settings
        const settings = await Settings.getSettings();
        if (!settings.monitoring.metrics.enabled) {
          logger.info('ℹ️ Performance monitoring is disabled in settings');
          return;
        }

        const performanceSummary = performanceMonitor.getPerformanceSummary();
        const thresholds = performanceMonitor.checkPerformanceThresholds();
        
        // Check for performance alerts
        await AlertingService.checkPerformanceAlerts(performanceSummary);
        
        // NEW: Monitor trial conversions and health
        const { trialMonitoringService } = await import('./trialMonitoringService');
        await trialMonitoringService.monitorTrialConversions();
        
        logger.info(`✅ Performance monitoring completed - System healthy: ${thresholds.healthy}`);
        
        if (!thresholds.healthy) {
          logger.warn('⚠️ Performance issues detected:', thresholds.issues);
        }
      } catch (error) {
        logger.error('❌ Scheduled performance monitoring failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('performance-monitoring', task);
    logger.info('📅 Performance monitoring scheduled (every 10 minutes)');
  }

  /**
   * @description Schedule alert cleanup - runs daily at 2 AM
   * @security Cleans up old resolved alerts to prevent memory bloat
   * @complexity Low - Simple cleanup task
   * @returns {void}
   */
  private static scheduleAlertCleanup(): void {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('🧹 Running scheduled alert cleanup...');
        
        AlertingService.cleanupOldAlerts();
        
        logger.info('✅ Alert cleanup completed');
      } catch (error) {
        logger.error('❌ Scheduled alert cleanup failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('alert-cleanup', task);
    logger.info('📅 Alert cleanup scheduled (daily at 2 AM)');
  }

  /**
   * @description Schedule revenue calculation - runs monthly on 1st at 2 AM
   * @security Calculates monthly revenue data and updates analytics
   * @complexity Medium - Revenue calculation job initialization
   * @returns {void}
   */
  private static scheduleRevenueCalculation(): void {
    RevenueCalculationJob.init();
    logger.info('📅 Revenue calculation job scheduled (monthly on 1st at 2 AM)');
  }

  /**
   * @description Manually trigger health check (for admin use)
   * @security Admin-only manual health check trigger
   * @complexity Medium - Manual health check execution
   * @returns {Promise<any>} Result object with health status
   */
  static async triggerHealthCheck(): Promise<any> {
    try {
      logger.info('🔧 Manual health check triggered');
      const healthStatus = await HealthCheckService.performHealthCheck();
      
      return {
        success: true,
        healthStatus,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Manual health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Manually trigger performance check (for admin use)
   * @security Admin-only manual performance check trigger
   * @complexity Medium - Manual performance check execution
   * @returns {Promise<any>} Result object with performance data
   */
  static async triggerPerformanceCheck(): Promise<any> {
    try {
      logger.info('🔧 Manual performance check triggered');
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      const thresholds = performanceMonitor.checkPerformanceThresholds();
      
      return {
        success: true,
        performance: {
          summary: performanceSummary,
          thresholds
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Manual performance check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * @description Get monitoring statistics (for admin dashboard)
   * @security Provides aggregated monitoring statistics
   * @complexity Medium - Statistics aggregation from multiple sources
   * @returns {any} Statistics object with monitoring data
   */
  static getMonitoringStatistics(): any {
    try {
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      const alertStats = AlertingService.getAlertStatistics();
      const cachedHealth = HealthCheckService.getCachedHealth();
      
      return {
        success: true,
        monitoring: {
          performance: performanceSummary,
          alerts: alertStats,
          healthComponents: cachedHealth.length,
          lastHealthCheck: cachedHealth.length > 0 
            ? Math.max(...cachedHealth.map(h => h.lastChecked.getTime()))
            : null
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Failed to get monitoring statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}

export default ScheduledJobs;