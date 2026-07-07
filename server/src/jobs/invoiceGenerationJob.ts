/**
 * @file invoiceGenerationJob.ts
 * @purpose Monthly invoice generation job that runs on the 1st of each month at 3 AM
 * @created 2025-09-04
 * @modified 2025-09-04
 */

import * as cron from 'node-cron';
import { invoiceGenerationService } from '../services/invoiceGenerationService';
import User from '../models/User';
import logger from '../utils/logger';
import invoiceMonitoringService from '../services/invoiceMonitoringService';

export class InvoiceGenerationJob {
  private static task: cron.ScheduledTask | null = null;
  
  // Run on the 1st of each month at 3 AM
  static schedule = '0 3 1 * *';
  
  /**
   * Run the monthly invoice generation for all eligible vendors
   */
  static async run(): Promise<void> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Get all active vendors eligible for invoicing
    const vendors = await User.find({
      isVendor: true,
      registrationStatus: 'active',
      trialEndDate: { $lt: now }, // Trial must be ended
    }).select('_id kontakt email');

    logger.info('Found vendors eligible for invoicing', { count: vendors.length });
    
    // Start batch job monitoring
    const batchCorrelationId = invoiceMonitoringService.startBatchJob(vendors.length, 'scheduled');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ vendorId: string; vendorName: string; error: string }> = [];
      
      // Process each vendor
      for (const vendor of vendors) {
        const vendorId = vendor._id?.toString() || '';
        const vendorName = vendor.kontakt?.name || 'Unknown';
        
        try {
          // Check if invoice already exists for this period
          const existingInvoice = await invoiceGenerationService.findExistingInvoice(
            vendorId,
            lastMonth.getFullYear(),
            lastMonth.getMonth() + 1
          );
          
          if (existingInvoice) {
            invoiceMonitoringService.recordInvoiceSkip(
              batchCorrelationId,
              vendorId,
              vendorName,
              `Invoice already exists for ${lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`
            );
            logger.info('Invoice already exists for vendor', { vendorName, period: lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) });
            continue;
          }
          
          // Start individual invoice generation monitoring
          const generationCorrelationId = invoiceMonitoringService.startInvoiceGeneration(
            batchCorrelationId,
            vendorId,
            vendorName,
            lastMonth.getFullYear(),
            lastMonth.getMonth() + 1
          );
          
          try {
            // Generate invoice for the previous month
            const invoice = await invoiceGenerationService.generateMonthlyInvoice(
              vendorId,
              lastMonth.getFullYear(),
              lastMonth.getMonth() + 1
            );
            
            // BUG-INV-JOB-NULL: null = nichts abrechenbar (Trial/kein Vertrag) → Skip, kein Fehler
            invoiceMonitoringService.completeInvoiceGeneration(
              generationCorrelationId,
              batchCorrelationId,
              true,
              invoice ? invoice.totalAmount : undefined
            );
            
            successCount++;
            if (invoice) {
              logger.info('Invoice generated successfully for vendor', { vendorName });
            } else {
              logger.info('No billable items for vendor - skipped', { vendorName });
            }
            
          } catch (vendorError) {
            const errorMessage = vendorError instanceof Error ? vendorError.message : 'Unknown error';
            
            // Complete monitoring with failure
            invoiceMonitoringService.completeInvoiceGeneration(
              generationCorrelationId,
              batchCorrelationId,
              false,
              undefined,
              errorMessage
            );
            
            errorCount++;
            errors.push({
              vendorId,
              vendorName,
              error: errorMessage
            });
            
            logger.error('Failed to generate invoice for vendor', { vendorName, error: errorMessage });
          }
          
        } catch (vendorError) {
          errorCount++;
          const errorMessage = vendorError instanceof Error ? vendorError.message : 'Unknown error';
          errors.push({
            vendorId,
            vendorName,
            error: errorMessage
          });
          
          logger.error('Failed to process vendor', { vendorName, error: errorMessage });
        }
      }
      
      // Complete batch job monitoring
      const batchMetrics = invoiceMonitoringService.completeBatchJob(batchCorrelationId, 'scheduled');
      
      logger.info('Invoice generation completed', {
        totalVendors: vendors.length,
        successful: successCount,
        failed: errorCount,
        period: lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        batchCorrelationId
      });
      
      // Log errors if any
      if (errors.length > 0) {
        logger.warn('Invoice generation errors', { errors });
        logger.warn('Invoice generation errors', { 
          errors, 
          period: lastMonth,
          batchCorrelationId 
        });
      }
      
      // Optional: Send notification to admin (if available)
      try {
        logger.info('Invoice generation completed', {
          period: lastMonth,
          successful: successCount,
          failed: errorCount,
          duration: batchMetrics?.totalDuration,
          batchCorrelationId
        });
      } catch (notificationError) {
        logger.warn('Failed to send admin notification', { error: notificationError });
        // Don't fail the entire job if notification fails
      }
      
    } catch (error) {
      logger.error('Invoice generation job failed', { error });
      
      try {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Invoice generation job failed', { 
          error: errorMessage,
          batchCorrelationId
        });
      } catch (logError) {
        logger.error('Failed to log error', { error: logError });
      }
      
      // Complete batch job with failure
      invoiceMonitoringService.completeBatchJob(batchCorrelationId, 'scheduled');
      
      // Retry in 1 hour for critical invoice generation
      logger.info('Scheduling retry in 1 hour...');
      setTimeout(() => {
        logger.info('Retrying invoice generation...');
        this.run();
      }, 3600000); // 1 hour
    }
  }
  
  /**
   * Manual trigger for invoice generation for a specific month
   */
  static async generateForMonth(year: number, month: number): Promise<void> {
    logger.info('Manual invoice generation started', { month, year });
    
    try {
      // Get all active vendors eligible for invoicing
      const vendors = await User.find({
        isVendor: true,
        registrationStatus: 'active'
      }).select('_id kontakt email');
      
      logger.info('Found vendors for manual invoice generation', { count: vendors.length });
      
      // Start batch job monitoring
      const batchCorrelationId = invoiceMonitoringService.startBatchJob(vendors.length, 'manual');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const vendor of vendors) {
        const vendorId = vendor._id?.toString() || '';
        const vendorName = vendor.kontakt?.name || 'Unknown';
        
        // Start individual invoice generation monitoring
        const generationCorrelationId = invoiceMonitoringService.startInvoiceGeneration(
          batchCorrelationId,
          vendorId,
          vendorName,
          year,
          month
        );
        
        try {
          const invoice = await invoiceGenerationService.generateMonthlyInvoice(
            vendorId,
            year,
            month
          );
          
          // BUG-INV-JOB-NULL: null = nichts abrechenbar → Skip, kein Fehler
          invoiceMonitoringService.completeInvoiceGeneration(
            generationCorrelationId,
            batchCorrelationId,
            true,
            invoice ? invoice.totalAmount : undefined
          );
          
          successCount++;
          if (invoice) {
            logger.info('Invoice generated for vendor', { vendorName });
          } else {
            logger.info('No billable items for vendor - skipped', { vendorName });
          }
        } catch (vendorError) {
          const errorMessage = vendorError instanceof Error ? vendorError.message : 'Unknown error';
          
          // Complete monitoring with failure
          invoiceMonitoringService.completeInvoiceGeneration(
            generationCorrelationId,
            batchCorrelationId,
            false,
            undefined,
            errorMessage
          );
          
          errorCount++;
          logger.error('Failed to generate invoice for vendor', { vendorName, error: vendorError });
        }
      }
      
      // Complete batch job monitoring
      const batchMetrics = invoiceMonitoringService.completeBatchJob(batchCorrelationId, 'manual');
      
      logger.info('Manual invoice generation completed', { month, year, successCount, errorCount });
      logger.info('Manual invoice generation completed', {
        year,
        month,
        successCount,
        errorCount,
        batchCorrelationId,
        duration: batchMetrics?.totalDuration
      });
    } catch (error) {
      logger.error('Manual invoice generation failed', { month, year, error });
      throw error;
    }
  }
  
  /**
   * Manual trigger for invoice generation for a specific vendor
   */
  static async generateForVendor(vendorId: string, year: number, month: number): Promise<void> {
    logger.info('Manual invoice generation for vendor started', { vendorId, month, year });
    
    try {
      // Get vendor information for monitoring
      const vendor = await User.findById(vendorId).select('kontakt');
      const vendorName = vendor?.kontakt?.name || 'Unknown';
      
      // Start batch job monitoring (single vendor)
      const batchCorrelationId = invoiceMonitoringService.startBatchJob(1, 'manual');
      
      // Start individual invoice generation monitoring
      const generationCorrelationId = invoiceMonitoringService.startInvoiceGeneration(
        batchCorrelationId,
        vendorId,
        vendorName,
        year,
        month
      );
      
      try {
        const invoice = await invoiceGenerationService.generateMonthlyInvoice(vendorId, year, month);
        
        // BUG-INV-JOB-NULL: null = nichts abrechenbar → Skip, kein Fehler
        invoiceMonitoringService.completeInvoiceGeneration(
          generationCorrelationId,
          batchCorrelationId,
          true,
          invoice ? invoice.totalAmount : undefined
        );
        
        logger.info('Single vendor invoice generation completed', {
          vendorId,
          vendorName,
          year,
          month,
          invoiceAmount: invoice ? invoice.totalAmount : null,
          skipped: !invoice,
          generationCorrelationId,
          batchCorrelationId
        });
      } catch (generationError) {
        const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown error';
        
        // Complete monitoring with failure
        invoiceMonitoringService.completeInvoiceGeneration(
          generationCorrelationId,
          batchCorrelationId,
          false,
          undefined,
          errorMessage
        );
        
        throw generationError;
      }
      
      // Complete batch job monitoring
      invoiceMonitoringService.completeBatchJob(batchCorrelationId, 'manual');
      
    } catch (error) {
      logger.error('Invoice generation for vendor failed', { vendorId, month, year, error });
      throw error;
    }
  }
  
  /**
   * Initialize the scheduled job
   */
  static init(): void {
    if (this.task) {
      logger.warn('Invoice generation job already scheduled');
      return;
    }
    
    this.task = cron.schedule(this.schedule, () => this.run(), {
      timezone: 'Europe/Berlin'
    });
    
    this.task.start();
    logger.info('Invoice generation job scheduled for 1st of each month at 03:00');
  }
  
  /**
   * Stop the scheduled job
   */
  static stop(): void {
    if (this.task) {
      this.task.stop();
      this.task.destroy();
      this.task = null;
      logger.info('Invoice generation job stopped');
    }
  }
  
  /**
   * Check if the job is running
   */
  static isRunning(): boolean {
    return this.task !== null;
  }
  
  /**
   * Get job status information
   */
  static getStatus(): any {
    return {
      isScheduled: this.task !== null,
      schedule: this.schedule,
      nextRun: this.getNextRun(),
      timezone: 'Europe/Berlin'
    };
  }
  
  /**
   * Get next scheduled run time
   */
  static getNextRun(): Date | null {
    if (!this.task) return null;
    
    // Calculate next 1st of month at 3 AM
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0);
    
    return nextMonth;
  }
}

export default InvoiceGenerationJob;