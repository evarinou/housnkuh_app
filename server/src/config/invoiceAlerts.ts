/**
 * @file invoiceAlerts.ts
 * @purpose Alert thresholds and configuration for invoice generation monitoring
 * @created 2025-01-17
 * @modified 2025-01-17
 */

/**
 * Alert thresholds for invoice generation monitoring
 */
export const INVOICE_ALERT_THRESHOLDS = {
  // Job duration thresholds (in minutes)
  JOB_DURATION: {
    WARNING: 15,      // Warn if job takes longer than 15 minutes
    CRITICAL: 30      // Critical if job takes longer than 30 minutes
  },

  // Individual invoice generation duration (in seconds)
  INVOICE_GENERATION_DURATION: {
    WARNING: 10,      // Warn if single invoice takes longer than 10 seconds
    CRITICAL: 30      // Critical if single invoice takes longer than 30 seconds
  },

  // PDF generation time (in seconds)
  PDF_GENERATION_DURATION: {
    WARNING: 5,       // Warn if PDF generation takes longer than 5 seconds
    CRITICAL: 15      // Critical if PDF generation takes longer than 15 seconds
  },

  // Email delivery time (in seconds)
  EMAIL_DELIVERY_DURATION: {
    WARNING: 10,      // Warn if email delivery takes longer than 10 seconds
    CRITICAL: 30      // Critical if email delivery takes longer than 30 seconds
  },

  // Error rate thresholds (percentage)
  ERROR_RATE: {
    WARNING: 5,       // Warn if more than 5% of invoices fail
    CRITICAL: 10      // Critical if more than 10% of invoices fail
  },

  // Maximum number of concurrent jobs
  CONCURRENT_JOBS: {
    WARNING: 2,       // Warn if more than 2 jobs running simultaneously
    CRITICAL: 3       // Critical if more than 3 jobs running simultaneously
  },

  // Failed invoices in a single batch
  FAILED_INVOICES: {
    WARNING: 3,       // Warn if more than 3 invoices fail in a batch
    CRITICAL: 5       // Critical if more than 5 invoices fail in a batch
  }
} as const;

/**
 * Alert message templates
 */
export const ALERT_MESSAGES = {
  JOB_DURATION_WARNING: (duration: number) =>
    `Invoice generation job is taking longer than expected: ${duration} minutes`,

  JOB_DURATION_CRITICAL: (duration: number) =>
    `Invoice generation job is taking too long: ${duration} minutes`,

  INVOICE_GENERATION_WARNING: (vendorId: string, duration: number) =>
    `Slow invoice generation for vendor ${vendorId}: ${duration} seconds`,

  INVOICE_GENERATION_CRITICAL: (vendorId: string, duration: number) =>
    `Very slow invoice generation for vendor ${vendorId}: ${duration} seconds`,

  PDF_GENERATION_WARNING: (vendorId: string, duration: number) =>
    `Slow PDF generation for vendor ${vendorId}: ${duration} seconds`,

  PDF_GENERATION_CRITICAL: (vendorId: string, duration: number) =>
    `Very slow PDF generation for vendor ${vendorId}: ${duration} seconds`,

  EMAIL_DELIVERY_WARNING: (vendorId: string, duration: number) =>
    `Slow email delivery for vendor ${vendorId}: ${duration} seconds`,

  EMAIL_DELIVERY_CRITICAL: (vendorId: string, duration: number) =>
    `Very slow email delivery for vendor ${vendorId}: ${duration} seconds`,

  ERROR_RATE_WARNING: (rate: number, failed: number, total: number) =>
    `High invoice generation error rate: ${rate}% (${failed}/${total})`,

  ERROR_RATE_CRITICAL: (rate: number, failed: number, total: number) =>
    `Critical invoice generation error rate: ${rate}% (${failed}/${total})`,

  CONCURRENT_JOBS_WARNING: (count: number) =>
    `High number of concurrent invoice jobs: ${count}`,

  CONCURRENT_JOBS_CRITICAL: (count: number) =>
    `Too many concurrent invoice jobs: ${count}`,

  FAILED_INVOICES_WARNING: (failed: number, batchId: string) =>
    `Multiple invoice failures in batch ${batchId}: ${failed} failed`,

  FAILED_INVOICES_CRITICAL: (failed: number, batchId: string) =>
    `Critical number of invoice failures in batch ${batchId}: ${failed} failed`
} as const;

/**
 * Alert configuration
 */
export const ALERT_CONFIG = {
  // Enable/disable specific alert types
  ENABLED_ALERTS: {
    JOB_DURATION: true,
    INVOICE_GENERATION_DURATION: true,
    PDF_GENERATION_DURATION: true,
    EMAIL_DELIVERY_DURATION: true,
    ERROR_RATE: true,
    CONCURRENT_JOBS: true,
    FAILED_INVOICES: true
  },

  // Alert notification channels
  NOTIFICATION_CHANNELS: {
    EMAIL: {
      enabled: true,
      recipients: ['admin@housnkuh.de']
    },
    SLACK: {
      enabled: false,
      webhook: process.env.SLACK_WEBHOOK_URL
    },
    DISCORD: {
      enabled: false,
      webhook: process.env.DISCORD_WEBHOOK_URL
    }
  },

  // Alert cooldown periods (in minutes)
  COOLDOWN_PERIODS: {
    JOB_DURATION: 60,           // Don't repeat job duration alerts for 1 hour
    INVOICE_GENERATION: 30,     // Don't repeat individual invoice alerts for 30 minutes
    PDF_GENERATION: 30,         // Don't repeat PDF alerts for 30 minutes
    EMAIL_DELIVERY: 30,         // Don't repeat email alerts for 30 minutes
    ERROR_RATE: 60,             // Don't repeat error rate alerts for 1 hour
    CONCURRENT_JOBS: 15,        // Don't repeat concurrent job alerts for 15 minutes
    FAILED_INVOICES: 30         // Don't repeat failed invoice alerts for 30 minutes
  }
} as const;

/**
 * Prometheus alerting rules for Grafana/Alertmanager
 * These can be imported into your monitoring stack
 */
export const PROMETHEUS_ALERT_RULES = `
groups:
  - name: invoice_generation
    rules:
      - alert: InvoiceJobDurationHigh
        expr: histogram_quantile(0.95, rate(invoice_job_duration_seconds_bucket[5m])) > ${INVOICE_ALERT_THRESHOLDS.JOB_DURATION.WARNING * 60}
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Invoice generation job taking too long"
          description: "95th percentile of invoice job duration is {{ $value }} seconds"

      - alert: InvoiceJobDurationCritical
        expr: histogram_quantile(0.95, rate(invoice_job_duration_seconds_bucket[5m])) > ${INVOICE_ALERT_THRESHOLDS.JOB_DURATION.CRITICAL * 60}
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Invoice generation job duration critical"
          description: "95th percentile of invoice job duration is {{ $value }} seconds"

      - alert: InvoiceGenerationErrorRateHigh
        expr: (rate(invoice_generation_errors_total[5m]) / rate(invoice_generations_total[5m])) * 100 > ${INVOICE_ALERT_THRESHOLDS.ERROR_RATE.WARNING}
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High invoice generation error rate"
          description: "Invoice generation error rate is {{ $value }}%"

      - alert: InvoiceGenerationErrorRateCritical
        expr: (rate(invoice_generation_errors_total[5m]) / rate(invoice_generations_total[5m])) * 100 > ${INVOICE_ALERT_THRESHOLDS.ERROR_RATE.CRITICAL}
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical invoice generation error rate"
          description: "Invoice generation error rate is {{ $value }}%"

      - alert: TooManyActiveInvoiceJobs
        expr: invoice_active_jobs > ${INVOICE_ALERT_THRESHOLDS.CONCURRENT_JOBS.WARNING}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Too many active invoice jobs"
          description: "{{ $value }} invoice jobs are currently active"

      - alert: InvoicePDFGenerationSlow
        expr: histogram_quantile(0.95, rate(invoice_pdf_generation_duration_seconds_bucket[5m])) > ${INVOICE_ALERT_THRESHOLDS.PDF_GENERATION_DURATION.WARNING}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow PDF generation for invoices"
          description: "95th percentile of PDF generation time is {{ $value }} seconds"

      - alert: InvoiceEmailDeliverySlow
        expr: histogram_quantile(0.95, rate(invoice_email_delivery_duration_seconds_bucket[5m])) > ${INVOICE_ALERT_THRESHOLDS.EMAIL_DELIVERY_DURATION.WARNING}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow email delivery for invoices"
          description: "95th percentile of email delivery time is {{ $value }} seconds"
`;

export default {
  INVOICE_ALERT_THRESHOLDS,
  ALERT_MESSAGES,
  ALERT_CONFIG,
  PROMETHEUS_ALERT_RULES
};