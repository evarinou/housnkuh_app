# Invoice Generation Monitoring

## Overview
Comprehensive monitoring and metrics collection system for invoice generation processes, built with Prometheus metrics and structured JSON logging.

## Features

### 1. Prometheus Metrics
- **Job Duration**: Tracks complete invoice generation job duration
- **Invoice Generation Duration**: Individual invoice generation timing
- **PDF Generation Duration**: PDF creation performance
- **Email Delivery Duration**: Email sending performance
- **Error Tracking**: Comprehensive error counting and categorization
- **Active Jobs**: Real-time monitoring of concurrent jobs

### 2. Structured Logging with Correlation IDs
Every invoice generation process is tracked with unique correlation IDs:
- **Batch Correlation ID**: Groups all invoices in a single job
- **Individual Correlation ID**: Tracks each invoice generation

### 3. Alert Thresholds
Configurable alert thresholds in `server/src/config/invoiceAlerts.ts`:
- Job duration warnings (15min) and critical alerts (30min)
- Individual invoice generation alerts (10s warning, 30s critical)
- PDF generation alerts (5s warning, 15s critical)
- Email delivery alerts (10s warning, 30s critical)
- Error rate thresholds (5% warning, 10% critical)

## Endpoints

### Prometheus Metrics
```
GET /api/metrics
```
Returns Prometheus-formatted metrics for scraping.

### Invoice Metrics Summary
```
GET /api/metrics/invoice-summary
```
Returns JSON summary of current invoice monitoring status:
```json
{
  "activeJobs": 0,
  "activeGenerations": 0,
  "totalJobsToday": 42,
  "totalGenerationsToday": 150,
  "totalErrorsToday": 2
}
```

## Usage Example

### Manual Invoice Generation with Monitoring
```javascript
// In the invoice generation job
const batchCorrelationId = invoiceMonitoringService.startBatchJob(vendors.length, 'scheduled');

for (const vendor of vendors) {
  const generationCorrelationId = invoiceMonitoringService.startInvoiceGeneration(
    batchCorrelationId,
    vendor.id,
    vendor.name,
    year,
    month
  );

  try {
    // Generate invoice
    const invoice = await generateInvoice(vendor);

    // Record success
    invoiceMonitoringService.completeInvoiceGeneration(
      generationCorrelationId,
      batchCorrelationId,
      true,
      invoice.amount
    );
  } catch (error) {
    // Record failure
    invoiceMonitoringService.completeInvoiceGeneration(
      generationCorrelationId,
      batchCorrelationId,
      false,
      undefined,
      error.message
    );
  }
}

// Complete batch
const metrics = invoiceMonitoringService.completeBatchJob(batchCorrelationId);
```

## Grafana Dashboard Integration

### Prometheus Queries
Example queries for Grafana dashboards:

1. **Invoice Generation Success Rate**:
```promql
rate(invoice_generations_total{status="success"}[5m]) /
rate(invoice_generations_total[5m]) * 100
```

2. **95th Percentile Invoice Generation Time**:
```promql
histogram_quantile(0.95,
  rate(invoice_generation_duration_seconds_bucket[5m])
)
```

3. **Active Invoice Jobs**:
```promql
invoice_active_jobs
```

4. **Error Rate**:
```promql
rate(invoice_generation_errors_total[5m])
```

## Alert Configuration

Alerts are defined in `server/src/config/invoiceAlerts.ts` and can be imported into Prometheus Alert Manager.

### Example Alert Rules
- High invoice generation error rate (>5%)
- Slow invoice generation (>10s average)
- Too many concurrent jobs (>3)
- PDF generation failures

## Monitoring Best Practices

1. **Review Daily**: Check the `/api/metrics/invoice-summary` endpoint daily
2. **Alert Response**: Respond to critical alerts within 15 minutes
3. **Performance Tracking**: Monitor 95th percentile response times
4. **Error Investigation**: Use correlation IDs to trace failed invoices
5. **Capacity Planning**: Track peak concurrent jobs for scaling decisions

## Troubleshooting

### High Error Rates
1. Check database connectivity
2. Verify email service status
3. Review vendor data completeness
4. Check disk space for PDF generation

### Slow Performance
1. Review concurrent job count
2. Check database query performance
3. Verify PDF generation resources
4. Monitor email queue backlog

### Missing Metrics
1. Verify Prometheus scraping configuration
2. Check service health at `/api/health`
3. Review application logs for errors
4. Confirm metrics endpoint accessibility

## Future Enhancements
- Historical trend analysis
- Predictive alerting based on patterns
- Automated remediation for common issues
- Enhanced dashboard visualizations
- Integration with PagerDuty/Slack for alerts