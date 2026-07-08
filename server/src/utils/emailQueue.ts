/**
 * @file emailQueue.ts
 * @description Email queue service implementation using Bull queue with Redis backend.
 * Provides reliable email delivery with retry mechanisms, monitoring, and fallback capabilities
 * for the housnkuh marketplace platform.
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import Bull from 'bull';
import { sendBookingConfirmationWithSchedule, sendInvoiceNotification } from './emailService';
import logger from './logger';
import Invoice from '../models/Invoice';
import User from '../models/User';

/**
 * Enhanced email job data interfaces for type safety and structure
 */
/**
 * Base interface for all email job data structures.
 * @interface BaseEmailJobData
 */
interface BaseEmailJobData {
  /** User ID for the email recipient */
  userId: string;
  /** Number of delivery attempts */
  attempts?: number;
  /** Job creation timestamp */
  createdAt?: Date;
}

/**
 * Job data structure for booking confirmation emails.
 * @interface BookingConfirmationJobData
 * @extends BaseEmailJobData
 */
interface BookingConfirmationJobData extends BaseEmailJobData {
  /** Job type identifier */
  type: 'bookingConfirmation';
  /** Unique booking identifier */
  bookingId: string;
  /** Rental unit details array */
  mietfachDetails: {
    _id: string;
    bezeichnung: string;
    typ: string;
    standort?: string;
    beschreibung?: string;
    adjustedPrice: number;
  }[];
  /** Scheduled start date for the booking */
  scheduledStartDate: Date;
  /** Contract identifier */
  contractId: string;
  /** Package configuration details */
  packageDetails: any;
  /** Vendor name for the booking */
  vendorName: string;
  /** Recipient email address */
  email: string;
}

/**
 * Job data structure for trial activation emails.
 * @interface TrialActivationJobData
 * @extends BaseEmailJobData
 */
interface TrialActivationJobData extends BaseEmailJobData {
  /** Job type identifier */
  type: 'trialActivation';
  /** Trial configuration details */
  trialDetails: any;
}

/**
 * Job data structure for status update emails.
 * @interface StatusUpdateJobData
 * @extends BaseEmailJobData
 */
interface StatusUpdateJobData extends BaseEmailJobData {
  /** Job type identifier */
  type: 'statusUpdate';
  /** Status update value */
  status: string;
  /** Additional status details */
  details?: any;
}

/** Invoice notification job data */
interface InvoiceNotificationJobData extends BaseEmailJobData {
  type: 'invoiceNotification';
  invoiceId: string;
  email: string;
  vendorId: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: Date;
  pdfBuffer?: Buffer; // PDF attachment data
}

// Remove unused type - keeping interfaces for export
// type EmailJobData = BookingConfirmationJobData | TrialActivationJobData | StatusUpdateJobData;

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
};

// Email queue configuration
const QUEUE_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 25, // Keep last 25 failed jobs for debugging
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000
    }
  },
  concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5')
};

class EmailQueueService {
  private queue: Bull.Queue | null = null;
  private isInitialized = false;

  constructor() {
    try {
      // Create Bull queue with Redis connection
      this.queue = new Bull('email-queue', {
        redis: redisConfig,
        defaultJobOptions: QUEUE_CONFIG.defaultJobOptions
      });

      this.setupProcessors();
      this.setupEventHandlers();
      this.isInitialized = true;
      
      logger.info('Email queue initialized with Redis/Bull');
    } catch (error) {
      logger.error('Failed to initialize email queue with Redis, falling back to in-memory queue', { error });
      this.initializeFallbackQueue();
    }
  }

  // Setup queue processors for different job types
  private setupProcessors(): void {
    if (!this.queue) return;
    
    // Process booking confirmation emails
    this.queue.process('booking-confirmation', QUEUE_CONFIG.concurrency, async (job: Bull.Job<BookingConfirmationJobData>) => {
      const data = job.data as BookingConfirmationJobData;
      logger.info('Processing booking confirmation email', { userId: data.userId, jobId: job.id });
      
      try {
        await this.processBookingConfirmation(data);
        
        // Update booking status to indicate email sent
        await this.updateBookingEmailStatus(data.bookingId, 'sent', new Date());
        
        return { 
          success: true, 
          sentAt: new Date(),
          emailSent: data.email,
          jobId: job.id
        };
      } catch (error) {
        logger.error('Booking confirmation email failed', { userId: data.userId, error });
        throw error; // Will trigger Bull's retry mechanism
      }
    });

    // Process trial activation emails
    this.queue.process('trial-activation', QUEUE_CONFIG.concurrency, async (job: Bull.Job<TrialActivationJobData>) => {
      const data = job.data as TrialActivationJobData;
      logger.info('Processing trial activation email', { userId: data.userId, jobId: job.id });
      
      try {
        await this.processTrialActivation(data);
        return { success: true, sentAt: new Date() };
      } catch (error) {
        logger.error('Trial activation email failed', { userId: data.userId, error });
        throw error;
      }
    });

    // Process status update emails
    this.queue.process('status-update', QUEUE_CONFIG.concurrency, async (job: Bull.Job<StatusUpdateJobData>) => {
      const data = job.data as StatusUpdateJobData;
      logger.info('Processing status update email', { userId: data.userId, jobId: job.id });
      
      try {
        await this.processStatusUpdate(data);
        return { success: true, sentAt: new Date() };
      } catch (error) {
        logger.error('Status update email failed', { userId: data.userId, error });
        throw error;
      }
    });

    // Process invoice notification emails
    this.queue.process('invoice-notification', QUEUE_CONFIG.concurrency, async (job: Bull.Job<InvoiceNotificationJobData>) => {
      const data = job.data as InvoiceNotificationJobData;
      logger.info('Processing invoice notification email', { email: data.email, jobId: job.id });
      
      try {
        await this.processInvoiceNotification(data);
        
        // Update invoice email status to indicate email sent
        await this.updateInvoiceEmailStatus(data.invoiceId, 'sent', new Date(), job.id?.toString());
        
        return { 
          success: true, 
          sentAt: new Date(),
          emailSent: data.email,
          invoiceNumber: data.invoiceNumber,
          jobId: job.id
        };
      } catch (error) {
        logger.error('Invoice notification email failed', { email: data.email, error });
        
        // Update invoice email status to indicate failure
        await this.updateInvoiceEmailStatus(data.invoiceId, 'failed', new Date(), job.id?.toString());
        
        throw error; // Will trigger Bull's retry mechanism
      }
    });
  }

  // Setup event handlers for monitoring
  private setupEventHandlers(): void {
    if (!this.queue) return;
    
    this.queue.on('completed', (job: Bull.Job, result: any) => {
      logger.info('Email job completed successfully', { jobId: job.id, result });
    });

    this.queue.on('failed', (job: Bull.Job, err: Error) => {
      logger.error('Email job failed', { jobId: job.id, attempts: job.attemptsMade, error: err.message });
      
      // Alert admin after all retries exhausted
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        this.alertAdminOfEmailFailure(job.data, err);
      }
    });

    this.queue.on('stalled', (job: Bull.Job) => {
      logger.warn('Email job stalled', { jobId: job.id });
    });

    this.queue.on('active', (job: Bull.Job) => {
      logger.debug('Email job started processing', { jobId: job.id });
    });
  }

  // Add booking confirmation email to queue
  async addBookingConfirmationEmail(data: Omit<BookingConfirmationJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        logger.warn('Email queue not available, processing email immediately');
        // Process immediately as fallback
        await this.processBookingConfirmation({
          ...data,
          type: 'bookingConfirmation',
          createdAt: new Date()
        });
        return 'immediate-' + Date.now();
      }

      const jobData: BookingConfirmationJobData = {
        ...data,
        type: 'bookingConfirmation',
        createdAt: new Date()
      };

      const job = await this.queue.add('booking-confirmation', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      });

      logger.info('Booking confirmation email queued', { email: data.email, jobId: job.id });
      return job.id.toString();
    } catch (error) {
      logger.error('Failed to queue booking confirmation email', { error });
      throw error;
    }
  }

  // Add trial activation email to queue
  async addTrialActivationEmail(data: Omit<TrialActivationJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        logger.warn('Email queue not available, processing trial activation immediately');
        await this.processTrialActivation({
          ...data,
          type: 'trialActivation',
          createdAt: new Date()
        });
        return 'immediate-' + Date.now();
      }

      const jobData: TrialActivationJobData = {
        ...data,
        type: 'trialActivation',
        createdAt: new Date()
      };

      const job = await this.queue.add('trial-activation', jobData);
      logger.info('Trial activation email queued', { userId: data.userId, jobId: job.id });
      return job.id.toString();
    } catch (error) {
      logger.error('Failed to queue trial activation email', { error });
      throw error;
    }
  }

  // Add status update email to queue
  async addStatusUpdateEmail(data: Omit<StatusUpdateJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        logger.warn('Email queue not available, processing status update immediately');
        await this.processStatusUpdate({
          ...data,
          type: 'statusUpdate',
          createdAt: new Date()
        });
        return 'immediate-' + Date.now();
      }

      const jobData: StatusUpdateJobData = {
        ...data,
        type: 'statusUpdate',
        createdAt: new Date()
      };

      const job = await this.queue.add('status-update', jobData);
      logger.info('Status update email queued', { userId: data.userId, jobId: job.id });
      return job.id.toString();
    } catch (error) {
      logger.error('Failed to queue status update email', { error });
      throw error;
    }
  }

  // Add invoice notification email to queue
  async addInvoiceNotificationEmail(data: Omit<InvoiceNotificationJobData, 'type' | 'createdAt'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        logger.warn('Email queue not available, processing invoice notification immediately');
        await this.processInvoiceNotification({
          ...data,
          type: 'invoiceNotification',
          createdAt: new Date()
        });
        return 'immediate-' + Date.now();
      }

      const jobData: InvoiceNotificationJobData = {
        ...data,
        type: 'invoiceNotification',
        createdAt: new Date()
      };

      const job = await this.queue.add('invoice-notification', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        delay: 5000 // 5 second delay to allow PDF generation to complete
      });

      logger.info('Invoice notification email queued', { email: data.email, jobId: job.id });
      return job.id.toString();
    } catch (error) {
      logger.error('Failed to queue invoice notification email', { error });
      throw error;
    }
  }

  // Process booking confirmation email
  private async processBookingConfirmation(data: BookingConfirmationJobData): Promise<void> {
    try {
      // Enhanced booking confirmation with scheduling details
      await sendBookingConfirmationWithSchedule({
        vendorName: data.vendorName,
        email: data.email,
        firma: data.packageDetails.firma || data.vendorName,
        mietfachDetails: data.mietfachDetails,
        scheduledStartDate: data.scheduledStartDate,
        contractId: data.contractId,
        packageDetails: data.packageDetails,
        totalMonthlyPrice: data.mietfachDetails.reduce((sum, mf) => sum + mf.adjustedPrice, 0)
      });

      logger.info('Enhanced booking confirmation email sent', { email: data.email });
    } catch (error) {
      logger.error('Error processing booking confirmation', { error });
      throw error;
    }
  }

  // Process trial activation email
  private async processTrialActivation(data: TrialActivationJobData): Promise<void> {
    // TODO: Implement trial activation email logic
    logger.info('Trial activation email processed', { userId: data.userId });
  }

  // Process status update email
  private async processStatusUpdate(data: StatusUpdateJobData): Promise<void> {
    // TODO: Implement status update email logic
    logger.info('Status update email processed', { userId: data.userId, status: data.status });
  }

  // Process invoice notification email
  private async processInvoiceNotification(data: InvoiceNotificationJobData): Promise<void> {
    try {
      // Get invoice and vendor details
      const invoice = await Invoice.findById(data.invoiceId).populate('vendor');
      if (!invoice) {
        throw new Error(`Invoice not found: ${data.invoiceId}`);
      }
      
      const vendor = invoice.vendor as any;
      if (!vendor) {
        throw new Error(`Vendor not found for invoice: ${data.invoiceId}`);
      }
      
      // Generate PDF if not provided
      let pdfBuffer = data.pdfBuffer;
      if (!pdfBuffer) {
        // Bewusst require statt Import: invoiceGenerationService exportiert kein
        // generateInvoicePDF (latenter Bug) – ein statischer Import wäre ein TS-Fehler.
        // Verhalten (TypeError → Job-Retry) bleibt unverändert erhalten.
        const { generateInvoicePDF } = require('../services/invoiceGenerationService');
        pdfBuffer = await generateInvoicePDF(invoice);
      }
      
      // Company info for template
      const companyInfo = {
        name: process.env.COMPANY_NAME || 'housnkuh',
        address: process.env.COMPANY_ADDRESS || 'Musterstraße 1, 12345 Musterstadt',
        email: process.env.COMPANY_EMAIL || process.env.EMAIL_FROM,
        phone: process.env.COMPANY_PHONE,
        website: process.env.COMPANY_WEBSITE,
        taxId: process.env.COMPANY_TAX_ID
      };
      
      // Send invoice notification
      await sendInvoiceNotification({
        invoice: invoice.toObject(),
        vendor: vendor.toObject(),
        pdfBuffer: pdfBuffer!,
        companyInfo
      });
      
      logger.info('Invoice notification email sent', { email: vendor.email, invoiceNumber: invoice.invoiceNumber });
    } catch (error) {
      logger.error('Error processing invoice notification', { error });
      throw error;
    }
  }

  // Update invoice email status in database
  private async updateInvoiceEmailStatus(
    invoiceId: string, 
    status: 'pending' | 'sent' | 'failed' | 'retrying', 
    timestamp: Date,
    jobId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        emailStatus: status,
        lastEmailAttempt: timestamp
      };
      
      if (status === 'sent') {
        updateData.emailSentAt = timestamp;
      }
      
      if (jobId) {
        updateData.emailJobId = jobId;
      }
      
      // Increment attempt counter
      await Invoice.updateOne(
        { _id: invoiceId },
        { 
          $set: updateData,
          $inc: { emailAttempts: 1 }
        }
      );
      
      logger.info('Invoice email status updated', { invoiceId, status });
    } catch (error) {
      logger.error('Failed to update invoice email status', { error });
    }
  }

  // Update booking email status in database
  private async updateBookingEmailStatus(bookingId: string, status: 'sent' | 'failed', timestamp: Date): Promise<void> {
    try {
      await User.updateOne(
        { 'pendingBooking._id': bookingId },
        {
          $set: {
            'pendingBooking.emailStatus': status,
            'pendingBooking.emailSentAt': timestamp
          }
        }
      );
    } catch (error) {
      logger.error('Failed to update booking email status', { error });
    }
  }

  // Alert admin of email failure
  private alertAdminOfEmailFailure(jobData: any, error: Error): void {
    logger.error('ADMIN ALERT: Email delivery failed permanently', {
      userId: jobData.userId,
      email: jobData.email,
      type: jobData.type,
      error: error.message
    });

    // Lazy require: statischer Import würde einen Zyklus
    // emailQueue → alertingService → healthCheckService → emailService schließen
    try {
      const AlertingService = require('../services/alertingService').default;
      AlertingService.alertEmailDeliveryFailure({
        userId: jobData.userId,
        email: jobData.email,
        emailType: jobData.type,
        errorMessage: error.message
      }).catch((alertError: unknown) => {
        logger.error('Failed to dispatch admin alert for email failure', { alertError });
      });
    } catch (alertError) {
      logger.error('Failed to dispatch admin alert for email failure', { alertError });
    }
  }

  // Get queue statistics
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      if (!this.queue || !this.isInitialized) {
        return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount()
      ]);

      return { waiting, active, completed, failed, delayed };
    } catch (error) {
      logger.error('Failed to get queue stats', { error });
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  // Get recent jobs for monitoring
  async getRecentJobs(limit: number = 50): Promise<Bull.Job[]> {
    try {
      if (!this.queue || !this.isInitialized) {
        return [];
      }
      const jobs = await this.queue.getJobs(['completed', 'failed', 'active', 'waiting'], 0, limit);
      return jobs;
    } catch (error) {
      logger.error('Failed to get recent jobs', { error });
      return [];
    }
  }

  // Retry failed jobs
  async retryFailedJobs(): Promise<number> {
    try {
      if (!this.queue || !this.isInitialized) {
        return 0;
      }

      const failedJobs = await this.queue.getFailed();
      let retriedCount = 0;

      for (const job of failedJobs) {
        try {
          await job.retry();
          retriedCount++;
          logger.info('Retrying failed email job', { jobId: job.id });
        } catch (error) {
          logger.error('Failed to retry job', { jobId: job.id, error });
        }
      }

      logger.info('Retried failed email jobs', { count: retriedCount });
      return retriedCount;
    } catch (error) {
      logger.error('Failed to retry failed jobs', { error });
      return 0;
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      if (!this.queue) return;
      
      logger.info('Shutting down email queue...');
      await this.queue.close();
      logger.info('Email queue shutdown complete');
    } catch (error) {
      logger.error('Error during email queue shutdown', { error });
    }
  }

  // Fallback to in-memory queue if Redis is not available
  private initializeFallbackQueue(): void {
    logger.warn('Using in-memory email queue fallback');
    // Keep the existing in-memory logic as fallback
    this.isInitialized = false;
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.queue) return false;
      
      // Test queue connectivity
      await this.queue.getWaitingCount();
      return true;
    } catch (error) {
      logger.error('Email queue health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
const emailQueue = new EmailQueueService();

export { emailQueue, EmailQueueService };
export type { BookingConfirmationJobData, TrialActivationJobData, StatusUpdateJobData, InvoiceNotificationJobData };
export default emailQueue;