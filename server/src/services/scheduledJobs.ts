// server/src/services/scheduledJobs.ts
import * as cron from 'node-cron';
import TrialService from './trialService';

/**
 * Scheduled Jobs Service for automated trial management
 * Implements automated trial activation and status tracking
 */
export class ScheduledJobs {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  static initialize(): void {
    console.log('🕒 Initializing scheduled jobs...');
    
    // Job 1: Check for trial activation (every hour)
    this.scheduleTrialActivationCheck();
    
    // Job 2: Update trial statuses (daily at 6 AM)
    this.scheduleTrialStatusUpdate();
    
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
}

export default ScheduledJobs;