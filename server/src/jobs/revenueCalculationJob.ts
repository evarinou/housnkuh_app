import * as cron from 'node-cron';
import { revenueService } from '../services/revenueService';
import logger from '../utils/logger';

export class RevenueCalculationJob {
  private static task: cron.ScheduledTask | null = null;
  
  // Run on the 1st of each month at 2 AM
  static schedule = '0 2 1 * *';
  
  /**
   * Run the monthly revenue calculation
   */
  static async run(): Promise<void> {
    logger.info('Starting monthly revenue calculation...');
    
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      // Calculate revenue for the previous month
      await revenueService.calculateMonthlyRevenue(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1
      );
      
      // Also recalculate current month for real-time data
      await revenueService.calculateMonthlyRevenue(
        now.getFullYear(),
        now.getMonth() + 1
      );
      
      logger.info('Revenue calculation completed successfully');
      
      // Optional: Send notification to admin (if available)
      try {
        logger.info('Revenue calculation completed', { period: lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) });
        // Email notification would be implemented here if needed
      } catch (emailError) {
        logger.warn('Failed to send admin notification', { error: emailError });
        // Don't fail the entire job if email fails
      }
      
    } catch (error) {
      logger.error('Revenue calculation failed', { error });
      
      try {
        logger.error('Revenue calculation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Email alert would be implemented here if needed
      } catch (emailError) {
        logger.error('Failed to send failure alert', { error: emailError });
      }
      
      // Retry in 1 hour
      logger.info('Scheduling retry in 1 hour...');
      setTimeout(() => {
        logger.info('Retrying revenue calculation...');
        this.run();
      }, 3600000);
    }
  }
  
  /**
   * Manual trigger for revenue calculation
   */
  static async calculateForMonth(year: number, month: number): Promise<void> {
    logger.info('Manual revenue calculation started', { month, year });
    
    try {
      await revenueService.calculateMonthlyRevenue(year, month);
      logger.info('Revenue calculation completed successfully', { month, year });
    } catch (error) {
      logger.error('Revenue calculation failed', { month, year, error });
      throw error;
    }
  }
  
  /**
   * Initialize the scheduled job
   */
  static init(): void {
    if (this.task) {
      logger.warn('Revenue calculation job already scheduled');
      return;
    }
    
    this.task = cron.schedule(this.schedule, () => this.run(), {
      timezone: 'Europe/Berlin'
    });
    
    this.task.start();
    logger.info('Revenue calculation job scheduled for 1st of each month at 02:00');
  }
  
  /**
   * Stop the scheduled job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      logger.info('Revenue calculation job stopped');
    }
  }
  
  /**
   * Check if the job is running
   */
  static isRunning(): boolean {
    return this.task !== null;
  }
  
  /**
   * Get next scheduled run time
   */
  static getNextRun(): Date | null {
    if (!this.task) return null;
    
    // Calculate next 1st of month at 2 AM
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0);
    
    return nextMonth;
  }
}

export default RevenueCalculationJob;