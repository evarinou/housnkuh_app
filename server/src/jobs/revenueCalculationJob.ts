import * as cron from 'node-cron';
import { revenueService } from '../services/revenueService';

export class RevenueCalculationJob {
  private static task: cron.ScheduledTask | null = null;
  
  // Run on the 1st of each month at 2 AM
  static schedule = '0 2 1 * *';
  
  /**
   * Run the monthly revenue calculation
   */
  static async run(): Promise<void> {
    console.log('🔢 Starting monthly revenue calculation...');
    
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
      
      console.log('✅ Revenue calculation completed successfully');
      
      // Optional: Send notification to admin (if available)
      try {
        console.log(`✅ Revenue calculation completed for ${lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`);
        // Email notification would be implemented here if needed
      } catch (emailError) {
        console.warn('⚠️ Failed to send admin notification:', emailError);
        // Don't fail the entire job if email fails
      }
      
    } catch (error) {
      console.error('❌ Revenue calculation failed:', error);
      
      try {
        console.error(`❌ Revenue calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Email alert would be implemented here if needed
      } catch (emailError) {
        console.error('❌ Failed to send failure alert:', emailError);
      }
      
      // Retry in 1 hour
      console.log('⏰ Scheduling retry in 1 hour...');
      setTimeout(() => {
        console.log('🔄 Retrying revenue calculation...');
        this.run();
      }, 3600000);
    }
  }
  
  /**
   * Manual trigger for revenue calculation
   */
  static async calculateForMonth(year: number, month: number): Promise<void> {
    console.log(`🔢 Manual revenue calculation for ${month}/${year}...`);
    
    try {
      await revenueService.calculateMonthlyRevenue(year, month);
      console.log(`✅ Revenue calculation for ${month}/${year} completed successfully`);
    } catch (error) {
      console.error(`❌ Revenue calculation for ${month}/${year} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize the scheduled job
   */
  static init(): void {
    if (this.task) {
      console.log('⚠️ Revenue calculation job already scheduled');
      return;
    }
    
    this.task = cron.schedule(this.schedule, () => this.run(), {
      timezone: 'Europe/Berlin'
    });
    
    this.task.start();
    console.log('📅 Revenue calculation job scheduled for 1st of each month at 02:00');
  }
  
  /**
   * Stop the scheduled job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      console.log('🛑 Revenue calculation job stopped');
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