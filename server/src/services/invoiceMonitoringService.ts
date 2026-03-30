/**
 * @file invoiceMonitoringService.ts
 * @purpose Comprehensive monitoring and metrics collection for invoice generation processes
 * @created 2025-01-17
 * @modified 2025-01-17
 */

import * as promClient from 'prom-client';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for invoice generation metrics
 */
export interface InvoiceGenerationMetrics {
  correlationId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  vendorId?: string;
  vendorName?: string;
  year: number;
  month: number;
  status: 'started' | 'generating' | 'pdf_created' | 'email_sent' | 'completed' | 'failed';
  invoiceAmount?: number;
  pdfGenerationTime?: number;
  emailDeliveryTime?: number;
  errorMessage?: string;
  phase: 'calculation' | 'pdf_generation' | 'email_sending' | 'complete';
}

/**
 * Interface for batch job metrics
 */
export interface BatchJobMetrics {
  correlationId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  totalVendors: number;
  processedVendors: number;
  successfulInvoices: number;
  failedInvoices: number;
  skippedInvoices: number;
  totalAmount?: number;
  averageProcessingTime?: number;
  errors: Array<{
    vendorId: string;
    vendorName: string;
    error: string;
    timestamp: Date;
  }>;
}

/**
 * Service for monitoring invoice generation processes
 */
export class InvoiceMonitoringService {
  private static instance: InvoiceMonitoringService;

  // Prometheus metrics
  private readonly invoiceJobDuration: promClient.Histogram;
  private readonly invoiceGenerationDuration: promClient.Histogram;
  private readonly pdfGenerationDuration: promClient.Histogram;
  private readonly emailDeliveryDuration: promClient.Histogram;
  private readonly invoiceJobTotal: promClient.Counter;
  private readonly invoiceGenerationTotal: promClient.Counter;
  private readonly invoiceGenerationErrors: promClient.Counter;
  private readonly invoiceAmount: promClient.Gauge;
  private readonly activeJobs: promClient.Gauge;

  // In-memory tracking for correlation
  private activeGenerations = new Map<string, InvoiceGenerationMetrics>();
  private activeBatchJobs = new Map<string, BatchJobMetrics>();

  constructor() {
    // Initialize Prometheus metrics
    this.invoiceJobDuration = new promClient.Histogram({
      name: 'invoice_job_duration_seconds',
      help: 'Duration of complete invoice generation job in seconds',
      labelNames: ['job_type', 'status'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600] // 1s to 10m
    });

    this.invoiceGenerationDuration = new promClient.Histogram({
      name: 'invoice_generation_duration_seconds',
      help: 'Duration of individual invoice generation in seconds',
      labelNames: ['vendor_id', 'status', 'phase'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30] // 100ms to 30s
    });

    this.pdfGenerationDuration = new promClient.Histogram({
      name: 'invoice_pdf_generation_duration_seconds',
      help: 'Duration of PDF generation in seconds',
      labelNames: ['vendor_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10] // 100ms to 10s
    });

    this.emailDeliveryDuration = new promClient.Histogram({
      name: 'invoice_email_delivery_duration_seconds',
      help: 'Duration of email delivery in seconds',
      labelNames: ['vendor_id', 'status'],
      buckets: [0.5, 1, 2, 5, 10, 30] // 500ms to 30s
    });

    this.invoiceJobTotal = new promClient.Counter({
      name: 'invoice_jobs_total',
      help: 'Total number of invoice generation jobs',
      labelNames: ['job_type', 'status']
    });

    this.invoiceGenerationTotal = new promClient.Counter({
      name: 'invoice_generations_total',
      help: 'Total number of invoice generations',
      labelNames: ['status', 'vendor_id']
    });

    this.invoiceGenerationErrors = new promClient.Counter({
      name: 'invoice_generation_errors_total',
      help: 'Total number of invoice generation errors',
      labelNames: ['error_type', 'phase', 'vendor_id']
    });

    this.invoiceAmount = new promClient.Gauge({
      name: 'invoice_amount_euros',
      help: 'Invoice amount in euros',
      labelNames: ['vendor_id', 'year', 'month']
    });

    this.activeJobs = new promClient.Gauge({
      name: 'invoice_active_jobs',
      help: 'Number of currently active invoice generation jobs'
    });

    // Register metrics with default registry
    promClient.register.registerMetric(this.invoiceJobDuration);
    promClient.register.registerMetric(this.invoiceGenerationDuration);
    promClient.register.registerMetric(this.pdfGenerationDuration);
    promClient.register.registerMetric(this.emailDeliveryDuration);
    promClient.register.registerMetric(this.invoiceJobTotal);
    promClient.register.registerMetric(this.invoiceGenerationTotal);
    promClient.register.registerMetric(this.invoiceGenerationErrors);
    promClient.register.registerMetric(this.invoiceAmount);
    promClient.register.registerMetric(this.activeJobs);

    logger.info('Invoice Monitoring Service initialized with Prometheus metrics');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): InvoiceMonitoringService {
    if (!InvoiceMonitoringService.instance) {
      InvoiceMonitoringService.instance = new InvoiceMonitoringService();
    }
    return InvoiceMonitoringService.instance;
  }

  /**
   * Start tracking a batch invoice generation job
   */
  startBatchJob(totalVendors: number, jobType: 'scheduled' | 'manual' = 'scheduled'): string {
    const correlationId = uuidv4();
    const startTime = new Date();

    const batchMetrics: BatchJobMetrics = {
      correlationId,
      startTime,
      totalVendors,
      processedVendors: 0,
      successfulInvoices: 0,
      failedInvoices: 0,
      skippedInvoices: 0,
      errors: []
    };

    this.activeBatchJobs.set(correlationId, batchMetrics);
    this.activeJobs.inc();

    logger.info('Invoice batch job started', {
      correlationId,
      totalVendors,
      jobType,
      timestamp: startTime.toISOString()
    });

    return correlationId;
  }

  /**
   * Start tracking individual invoice generation
   */
  startInvoiceGeneration(
    batchCorrelationId: string,
    vendorId: string,
    vendorName: string,
    year: number,
    month: number
  ): string {
    const correlationId = uuidv4();
    const startTime = new Date();

    const metrics: InvoiceGenerationMetrics = {
      correlationId,
      startTime,
      vendorId,
      vendorName,
      year,
      month,
      status: 'started',
      phase: 'calculation'
    };

    this.activeGenerations.set(correlationId, metrics);

    logger.info('Invoice generation started', {
      correlationId,
      batchCorrelationId,
      vendorId,
      vendorName,
      year,
      month,
      timestamp: startTime.toISOString()
    });

    return correlationId;
  }

  /**
   * Update invoice generation phase
   */
  updatePhase(
    correlationId: string,
    phase: 'calculation' | 'pdf_generation' | 'email_sending' | 'complete',
    additionalData?: Partial<InvoiceGenerationMetrics>
  ): void {
    const metrics = this.activeGenerations.get(correlationId);
    if (!metrics) {
      logger.warn('Invoice generation metrics not found for correlation ID', { correlationId });
      return;
    }

    metrics.phase = phase;
    if (additionalData) {
      Object.assign(metrics, additionalData);
    }

    logger.debug('Invoice generation phase updated', {
      correlationId,
      phase,
      vendorId: metrics.vendorId,
      additionalData
    });
  }

  /**
   * Record PDF generation time
   */
  recordPdfGeneration(correlationId: string, durationMs: number): void {
    const metrics = this.activeGenerations.get(correlationId);
    if (!metrics) return;

    const durationSeconds = durationMs / 1000;
    metrics.pdfGenerationTime = durationMs;

    this.pdfGenerationDuration
      .labels(metrics.vendorId || 'unknown')
      .observe(durationSeconds);

    logger.debug('PDF generation recorded', {
      correlationId,
      vendorId: metrics.vendorId,
      durationMs,
      durationSeconds
    });
  }

  /**
   * Record email delivery time
   */
  recordEmailDelivery(correlationId: string, durationMs: number, success: boolean): void {
    const metrics = this.activeGenerations.get(correlationId);
    if (!metrics) return;

    const durationSeconds = durationMs / 1000;
    metrics.emailDeliveryTime = durationMs;

    this.emailDeliveryDuration
      .labels(metrics.vendorId || 'unknown', success ? 'success' : 'failed')
      .observe(durationSeconds);

    logger.debug('Email delivery recorded', {
      correlationId,
      vendorId: metrics.vendorId,
      durationMs,
      success
    });
  }

  /**
   * Complete individual invoice generation
   */
  completeInvoiceGeneration(
    correlationId: string,
    batchCorrelationId: string,
    success: boolean,
    invoiceAmount?: number,
    errorMessage?: string
  ): void {
    const metrics = this.activeGenerations.get(correlationId);
    if (!metrics) {
      logger.warn('Invoice generation metrics not found for completion', { correlationId });
      return;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - metrics.startTime.getTime();

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.status = success ? 'completed' : 'failed';
    metrics.invoiceAmount = invoiceAmount;
    metrics.errorMessage = errorMessage;

    // Record Prometheus metrics
    const durationSeconds = duration / 1000;
    const status = success ? 'success' : 'failed';

    this.invoiceGenerationDuration
      .labels(metrics.vendorId || 'unknown', status, metrics.phase)
      .observe(durationSeconds);

    this.invoiceGenerationTotal
      .labels(status, metrics.vendorId || 'unknown')
      .inc();

    if (invoiceAmount && success) {
      this.invoiceAmount
        .labels(metrics.vendorId || 'unknown', metrics.year.toString(), metrics.month.toString())
        .set(invoiceAmount);
    }

    if (!success && errorMessage) {
      this.invoiceGenerationErrors
        .labels('generation_failed', metrics.phase, metrics.vendorId || 'unknown')
        .inc();
    }

    // Update batch job metrics
    const batchMetrics = this.activeBatchJobs.get(batchCorrelationId);
    if (batchMetrics) {
      batchMetrics.processedVendors++;
      if (success) {
        batchMetrics.successfulInvoices++;
        if (invoiceAmount) {
          batchMetrics.totalAmount = (batchMetrics.totalAmount || 0) + invoiceAmount;
        }
      } else {
        batchMetrics.failedInvoices++;
        if (errorMessage) {
          batchMetrics.errors.push({
            vendorId: metrics.vendorId || 'unknown',
            vendorName: metrics.vendorName || 'Unknown',
            error: errorMessage,
            timestamp: endTime
          });
        }
      }
    }

    logger.info('Invoice generation completed', {
      correlationId,
      batchCorrelationId,
      vendorId: metrics.vendorId,
      vendorName: metrics.vendorName,
      success,
      duration,
      durationSeconds,
      invoiceAmount,
      errorMessage,
      pdfGenerationTime: metrics.pdfGenerationTime,
      emailDeliveryTime: metrics.emailDeliveryTime
    });

    // Clean up active tracking
    this.activeGenerations.delete(correlationId);
  }

  /**
   * Complete batch job
   */
  completeBatchJob(correlationId: string, jobType: 'scheduled' | 'manual' = 'scheduled'): BatchJobMetrics | null {
    const batchMetrics = this.activeBatchJobs.get(correlationId);
    if (!batchMetrics) {
      logger.warn('Batch job metrics not found for completion', { correlationId });
      return null;
    }

    const endTime = new Date();
    const totalDuration = endTime.getTime() - batchMetrics.startTime.getTime();

    batchMetrics.endTime = endTime;
    batchMetrics.totalDuration = totalDuration;

    if (batchMetrics.successfulInvoices > 0) {
      batchMetrics.averageProcessingTime = totalDuration / batchMetrics.processedVendors;
    }

    // Record Prometheus metrics
    const durationSeconds = totalDuration / 1000;
    const status = batchMetrics.failedInvoices === 0 ? 'success' : 'partial_failure';

    this.invoiceJobDuration
      .labels(jobType, status)
      .observe(durationSeconds);

    this.invoiceJobTotal
      .labels(jobType, status)
      .inc();

    this.activeJobs.dec();

    logger.info('Invoice batch job completed', {
      correlationId,
      totalDuration,
      durationSeconds,
      totalVendors: batchMetrics.totalVendors,
      processedVendors: batchMetrics.processedVendors,
      successfulInvoices: batchMetrics.successfulInvoices,
      failedInvoices: batchMetrics.failedInvoices,
      skippedInvoices: batchMetrics.skippedInvoices,
      totalAmount: batchMetrics.totalAmount,
      averageProcessingTime: batchMetrics.averageProcessingTime,
      errorCount: batchMetrics.errors.length
    });

    // Clean up active tracking
    this.activeBatchJobs.delete(correlationId);

    return batchMetrics;
  }

  /**
   * Record invoice skip (when invoice already exists)
   */
  recordInvoiceSkip(batchCorrelationId: string, vendorId: string, vendorName: string, reason: string): void {
    const batchMetrics = this.activeBatchJobs.get(batchCorrelationId);
    if (batchMetrics) {
      batchMetrics.skippedInvoices++;
      batchMetrics.processedVendors++;
    }

    logger.info('Invoice generation skipped', {
      batchCorrelationId,
      vendorId,
      vendorName,
      reason
    });
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): {
    activeJobs: number;
    activeGenerations: number;
    totalJobsToday: number;
    totalGenerationsToday: number;
    totalErrorsToday: number;
  } {
    // Note: These would typically come from a time-series database
    // For now, return current active counts
    return {
      activeJobs: this.activeBatchJobs.size,
      activeGenerations: this.activeGenerations.size,
      totalJobsToday: 0, // Would be calculated from metrics store
      totalGenerationsToday: 0, // Would be calculated from metrics store
      totalErrorsToday: 0 // Would be calculated from metrics store
    };
  }

  /**
   * Get Prometheus metrics endpoint data
   */
  async getPrometheusMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}

export default InvoiceMonitoringService.getInstance();