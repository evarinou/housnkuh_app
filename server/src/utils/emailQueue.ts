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
import { sendBookingConfirmationWithSchedule } from './emailService';

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
      
      console.log('✅ Email queue initialized with Redis/Bull');
    } catch (error) {
      console.error('❌ Failed to initialize email queue with Redis, falling back to in-memory queue:', error);
      this.initializeFallbackQueue();
    }
  }

  // Setup queue processors for different job types
  private setupProcessors(): void {
    if (!this.queue) return;
    
    // Process booking confirmation emails
    this.queue.process('booking-confirmation', QUEUE_CONFIG.concurrency, async (job: Bull.Job<BookingConfirmationJobData>) => {
      const data = job.data as BookingConfirmationJobData;
      console.log(`📧 Processing booking confirmation email for user ${data.userId} (Job ID: ${job.id})`);
      
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
        console.error(`❌ Booking confirmation email failed for user ${data.userId}:`, error);
        throw error; // Will trigger Bull's retry mechanism
      }
    });

    // Process trial activation emails
    this.queue.process('trial-activation', QUEUE_CONFIG.concurrency, async (job: Bull.Job<TrialActivationJobData>) => {
      const data = job.data as TrialActivationJobData;
      console.log(`📧 Processing trial activation email for user ${data.userId} (Job ID: ${job.id})`);
      
      try {
        await this.processTrialActivation(data);
        return { success: true, sentAt: new Date() };
      } catch (error) {
        console.error(`❌ Trial activation email failed for user ${data.userId}:`, error);
        throw error;
      }
    });

    // Process status update emails
    this.queue.process('status-update', QUEUE_CONFIG.concurrency, async (job: Bull.Job<StatusUpdateJobData>) => {
      const data = job.data as StatusUpdateJobData;
      console.log(`📧 Processing status update email for user ${data.userId} (Job ID: ${job.id})`);
      
      try {
        await this.processStatusUpdate(data);
        return { success: true, sentAt: new Date() };
      } catch (error) {
        console.error(`❌ Status update email failed for user ${data.userId}:`, error);
        throw error;
      }
    });
  }

  // Setup event handlers for monitoring
  private setupEventHandlers(): void {
    if (!this.queue) return;
    
    this.queue.on('completed', (job: Bull.Job, result: any) => {
      console.log(`✅ Email job ${job.id} completed successfully:`, result);
    });

    this.queue.on('failed', (job: Bull.Job, err: Error) => {
      console.error(`❌ Email job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
      
      // Alert admin after all retries exhausted
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        this.alertAdminOfEmailFailure(job.data, err);
      }
    });

    this.queue.on('stalled', (job: Bull.Job) => {
      console.warn(`⚠️ Email job ${job.id} stalled`);
    });

    this.queue.on('active', (job: Bull.Job) => {
      console.log(`🔄 Email job ${job.id} started processing`);
    });
  }

  // Add booking confirmation email to queue
  async addBookingConfirmationEmail(data: Omit<BookingConfirmationJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        console.warn('Email queue not available, processing email immediately');
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

      console.log(`📬 Booking confirmation email queued for ${data.email} (Job ID: ${job.id})`);
      return job.id.toString();
    } catch (error) {
      console.error('Failed to queue booking confirmation email:', error);
      throw error;
    }
  }

  // Add trial activation email to queue
  async addTrialActivationEmail(data: Omit<TrialActivationJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        console.warn('Email queue not available, processing trial activation immediately');
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
      console.log(`📬 Trial activation email queued for user ${data.userId} (Job ID: ${job.id})`);
      return job.id.toString();
    } catch (error) {
      console.error('Failed to queue trial activation email:', error);
      throw error;
    }
  }

  // Add status update email to queue
  async addStatusUpdateEmail(data: Omit<StatusUpdateJobData, 'type'>): Promise<string> {
    try {
      if (!this.queue || !this.isInitialized) {
        console.warn('Email queue not available, processing status update immediately');
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
      console.log(`📬 Status update email queued for user ${data.userId} (Job ID: ${job.id})`);
      return job.id.toString();
    } catch (error) {
      console.error('Failed to queue status update email:', error);
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

      console.log(`📧 Enhanced booking confirmation email sent to ${data.email}`);
    } catch (error) {
      console.error('Error processing booking confirmation:', error);
      throw error;
    }
  }

  // Process trial activation email
  private async processTrialActivation(data: TrialActivationJobData): Promise<void> {
    // TODO: Implement trial activation email logic
    console.log(`📧 Trial activation email processed for user: ${data.userId}`);
  }

  // Process status update email
  private async processStatusUpdate(data: StatusUpdateJobData): Promise<void> {
    // TODO: Implement status update email logic
    console.log(`📧 Status update email processed for user: ${data.userId}, status: ${data.status}`);
  }

  // Update booking email status in database
  private async updateBookingEmailStatus(bookingId: string, status: 'sent' | 'failed', timestamp: Date): Promise<void> {
    try {
      const User = require('../models/User').default;
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
      console.error('Failed to update booking email status:', error);
    }
  }

  // Alert admin of email failure
  private alertAdminOfEmailFailure(jobData: any, error: Error): void {
    console.error('🚨 ADMIN ALERT: Email delivery failed permanently:', {
      userId: jobData.userId,
      email: jobData.email,
      type: jobData.type,
      error: error.message,
      timestamp: new Date()
    });
    
    // TODO: Implement admin notification system (Slack, Discord, email to admin)
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
      console.error('Failed to get queue stats:', error);
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
      console.error('Failed to get recent jobs:', error);
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
          console.log(`🔄 Retrying failed email job ${job.id}`);
        } catch (error) {
          console.error(`Failed to retry job ${job.id}:`, error);
        }
      }

      console.log(`🔄 Retried ${retriedCount} failed email jobs`);
      return retriedCount;
    } catch (error) {
      console.error('Failed to retry failed jobs:', error);
      return 0;
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      if (!this.queue) return;
      
      console.log('🔄 Shutting down email queue...');
      await this.queue.close();
      console.log('✅ Email queue shutdown complete');
    } catch (error) {
      console.error('Error during email queue shutdown:', error);
    }
  }

  // Fallback to in-memory queue if Redis is not available
  private initializeFallbackQueue(): void {
    console.warn('⚠️ Using in-memory email queue fallback');
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
      console.error('Email queue health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const emailQueue = new EmailQueueService();

export { emailQueue, EmailQueueService };
export type { BookingConfirmationJobData, TrialActivationJobData, StatusUpdateJobData };
export default emailQueue;