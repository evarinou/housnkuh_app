// server/src/services/scheduledJobs.ts
import * as cron from 'node-cron';
import TrialService from './trialService';
import HealthCheckService from './healthCheckService';
import AlertingService from './alertingService';
import { performanceMonitor } from '../utils/performanceMonitor';
import Settings from '../models/Settings';

/**
 * Scheduled Jobs Service for automated trial management
 * Implements automated trial activation and status tracking
 */
export class ScheduledJobs {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  static async initialize(): Promise<void> {
    console.log('🕒 Initializing scheduled jobs...');
    
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
    
    console.log('✅ Scheduled jobs initialized successfully');
  }

  /**
   * Schedule trial activation check - runs every 5 minutes
   * Checks if store has opened and activates waiting trials
   */
  private static scheduleTrialActivationCheck(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🔍 Running trial activation check...');
        const activated = await TrialService.checkForTrialActivation();
        
        if (activated) {
          console.log('✅ Trial activation check completed - trials were activated');
          // After successful activation, reschedule to hourly checks
          this.rescheduleToHourlyChecks();
        } else {
          console.log('ℹ️ Trial activation check completed - no action needed');
        }
      } catch (error) {
        console.error('❌ Trial activation check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-activation-check', task);
    console.log('📅 Trial activation check scheduled (every 5 minutes)');
  }

  /**
   * Reschedule trial activation check to hourly after launch
   */
  private static rescheduleToHourlyChecks(): void {
    const existingTask = this.jobs.get('trial-activation-check');
    if (existingTask) {
      existingTask.stop();
    }

    const task = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🔍 Running hourly trial activation check...');
        await TrialService.checkForTrialActivation();
      } catch (error) {
        console.error('❌ Trial activation check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-activation-check', task);
    console.log('📅 Trial activation check rescheduled to hourly');
  }

  /**
   * Schedule trial status update - runs daily at 6 AM
   * Updates trial statuses and sends expiration warnings
   */
  private static scheduleTrialStatusUpdate(): void {
    const task = cron.schedule('0 6 * * *', async () => {
      try {
        console.log('📊 Running daily trial status update...');
        const result = await TrialService.updateTrialStatuses();
        
        console.log(`✅ Trial status update completed:`, {
          updated: result.updatedCount,
          expired: result.expiredCount,
          warnings: result.warnings.length
        });
        
        if (result.warnings.length > 0) {
          console.warn('⚠️ Trial status update warnings:', result.warnings);
        }
      } catch (error) {
        console.error('❌ Trial status update failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('trial-status-update', task);
    console.log('📅 Trial status update scheduled (daily at 6 AM)');
  }

  /**
   * Manually trigger trial activation check (for admin use)
   */
  static async triggerTrialActivationCheck(): Promise<any> {
    try {
      console.log('🔧 Manual trial activation check triggered');
      const result = await TrialService.checkForTrialActivation();
      
      return {
        success: true,
        activated: result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Manual trial activation check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Manually trigger trial status update (for admin use)
   */
  static async triggerTrialStatusUpdate(): Promise<any> {
    try {
      console.log('🔧 Manual trial status update triggered');
      const result = await TrialService.updateTrialStatuses();
      
      return {
        success: true,
        result,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Manual trial status update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAll(): void {
    console.log('🛑 Stopping all scheduled jobs...');
    
    for (const [name, task] of this.jobs) {
      task.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    console.log('✅ All scheduled jobs stopped');
  }

  /**
   * Get status of all scheduled jobs
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
   * Manual trial activation for specific vendor (admin endpoint)
   */
  static async activateVendorTrial(vendorId: string): Promise<any> {
    try {
      console.log(`🔧 Manual trial activation for vendor: ${vendorId}`);
      await TrialService.manuallyActivateVendorTrial(vendorId);
      
      return {
        success: true,
        vendorId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Manual trial activation failed for vendor ${vendorId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        vendorId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get trial statistics (for admin dashboard)
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
      console.error('❌ Failed to get trial statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Schedule health checks - runs every 5 minutes
   * Monitors system components and triggers alerts
   */
  private static scheduleHealthChecks(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🏥 Running scheduled health check...');
        
        // Get monitoring settings to check if health checks are enabled
        const settings = await Settings.getSettings();
        if (!settings.monitoring.healthChecks.enabled) {
          console.log('ℹ️ Health checks are disabled in settings');
          return;
        }

        const healthStatus = await HealthCheckService.performHealthCheck();
        
        // Check for alerts
        await AlertingService.checkHealthAlerts(healthStatus);
        
        console.log(`✅ Health check completed - Overall status: ${healthStatus.overall}`);
      } catch (error) {
        console.error('❌ Scheduled health check failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('health-checks', task);
    console.log('📅 Health checks scheduled (every 5 minutes)');
  }

  /**
   * Schedule performance monitoring - runs every 10 minutes
   * Monitors system performance and triggers alerts
   */
  private static schedulePerformanceMonitoring(): void {
    const task = cron.schedule('*/10 * * * *', async () => {
      try {
        console.log('📊 Running scheduled performance monitoring...');
        
        // Get monitoring settings
        const settings = await Settings.getSettings();
        if (!settings.monitoring.metrics.enabled) {
          console.log('ℹ️ Performance monitoring is disabled in settings');
          return;
        }

        const performanceSummary = performanceMonitor.getPerformanceSummary();
        const thresholds = performanceMonitor.checkPerformanceThresholds();
        
        // Check for performance alerts
        await AlertingService.checkPerformanceAlerts(performanceSummary);
        
        console.log(`✅ Performance monitoring completed - System healthy: ${thresholds.healthy}`);
        
        if (!thresholds.healthy) {
          console.warn('⚠️ Performance issues detected:', thresholds.issues);
        }
      } catch (error) {
        console.error('❌ Scheduled performance monitoring failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('performance-monitoring', task);
    console.log('📅 Performance monitoring scheduled (every 10 minutes)');
  }

  /**
   * Schedule alert cleanup - runs daily at 2 AM
   * Cleans up old resolved alerts to prevent memory bloat
   */
  private static scheduleAlertCleanup(): void {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Running scheduled alert cleanup...');
        
        AlertingService.cleanupOldAlerts();
        
        console.log('✅ Alert cleanup completed');
      } catch (error) {
        console.error('❌ Scheduled alert cleanup failed:', error);
      }
    }, {
      timezone: 'Europe/Berlin'
    });

    this.jobs.set('alert-cleanup', task);
    console.log('📅 Alert cleanup scheduled (daily at 2 AM)');
  }

  /**
   * Manually trigger health check (for admin use)
   */
  static async triggerHealthCheck(): Promise<any> {
    try {
      console.log('🔧 Manual health check triggered');
      const healthStatus = await HealthCheckService.performHealthCheck();
      
      return {
        success: true,
        healthStatus,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Manual health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Manually trigger performance check (for admin use)
   */
  static async triggerPerformanceCheck(): Promise<any> {
    try {
      console.log('🔧 Manual performance check triggered');
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
      console.error('❌ Manual performance check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get monitoring statistics (for admin dashboard)
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
      console.error('❌ Failed to get monitoring statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}

export default ScheduledJobs;