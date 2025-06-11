# housnkuh Monitoring System

The housnkuh monitoring system provides comprehensive health checks, performance monitoring, and automated alerting for the launch day operations and ongoing system reliability.

## Architecture Overview

The monitoring system consists of several interconnected components:

1. **HealthCheckService** - System component health monitoring
2. **PerformanceMonitor** - API and database performance tracking
3. **AlertingService** - Automated alerting via email
4. **Monitoring Middleware** - Request tracking and background checks
5. **ScheduledJobs** - Automated monitoring tasks
6. **Settings Model** - Configuration management

## Components

### 1. HealthCheckService

**File**: `src/services/healthCheckService.ts`

Monitors the health of critical system components:

- **Database connectivity** - MongoDB connection and query performance
- **Email service** - SMTP connection and delivery capability
- **Scheduled jobs** - Background task status
- **Trial service** - Business logic functionality
- **Memory usage** - System resource monitoring
- **Disk space** - Storage availability

**Key Methods**:
- `performHealthCheck()` - Comprehensive system health check
- `getSimpleStatus()` - Lightweight status for external monitoring
- `checkComponent(name)` - Individual component health check

### 2. PerformanceMonitor

**File**: `src/utils/performanceMonitor.ts`

Tracks system performance metrics:

- **Request metrics** - Response times, error rates, throughput
- **Database metrics** - Query performance and error tracking
- **System metrics** - Memory usage, CPU usage, uptime
- **Error tracking** - Application error logging and frequency

**Key Features**:
- Automatic data retention (24 hours by default)
- Memory-safe with configurable limits
- Real-time performance threshold checking
- Endpoint-specific metrics tracking

### 3. AlertingService

**File**: `src/services/alertingService.ts`

Automated alerting system with email notifications:

- **Health alerts** - Component failures and degraded performance
- **Performance alerts** - Threshold violations and system issues
- **Error alerts** - High error frequencies and critical failures
- **Business alerts** - Trial system and revenue-impacting issues

**Alert Types**:
- `warning` - Non-critical issues requiring attention
- `critical` - System issues affecting functionality
- `emergency` - Severe problems requiring immediate action

### 4. Monitoring Middleware

**File**: `src/middleware/monitoring.ts`

Express middleware for automatic monitoring:

- **Request tracking** - Automatic performance monitoring
- **Error tracking** - Application error recording
- **Rate limiting monitoring** - High-traffic detection
- **Background checks** - Periodic health and performance monitoring
- **Cleanup tasks** - Memory management and data retention

### 5. Settings Model Extensions

**File**: `src/models/Settings.ts`

Configuration management for monitoring:

```javascript
monitoring: {
  enabled: boolean,
  alerting: {
    enabled: boolean,
    adminEmails: string[],
    cooldownMinutes: number,
    thresholds: {
      responseTime: number,
      errorRate: number,
      memoryUsage: number,
      dbResponseTime: number,
      errorFrequency: number
    }
  },
  healthChecks: {
    enabled: boolean,
    intervalMinutes: number,
    components: string[]
  },
  metrics: {
    enabled: boolean,
    retentionHours: number,
    performanceTracking: boolean
  }
}
```

## API Endpoints

### Public Health Checks

```
GET /api/health
GET /api/health/detailed
```

No authentication required. Suitable for external monitoring services.

### Admin Monitoring Endpoints

All admin endpoints require authentication via `/api/admin/*`:

#### Health Monitoring
```
GET /api/admin/health                    # Complete system health
GET /api/admin/health/component/:name    # Individual component health
POST /api/admin/monitoring/health-check  # Manual health check trigger
```

#### Performance Monitoring
```
GET /api/admin/performance/metrics       # Performance summary
GET /api/admin/performance/detailed      # Detailed metrics
GET /api/admin/performance/endpoint/:path # Endpoint-specific metrics
POST /api/admin/monitoring/performance-check # Manual performance check
```

#### Alert Management
```
GET /api/admin/alerts/active            # Active alerts
GET /api/admin/alerts/history           # Alert history
POST /api/admin/alerts/:id/resolve      # Resolve alert
POST /api/admin/alerts/test             # Send test alert
```

#### Configuration
```
GET /api/admin/monitoring/settings      # Get monitoring configuration
PUT /api/admin/monitoring/settings      # Update monitoring configuration
```

#### Dashboard Data
```
GET /api/admin/monitoring/dashboard     # Real-time dashboard data
GET /api/admin/monitoring/statistics    # Monitoring statistics
```

## Scheduled Jobs

The monitoring system runs several automated tasks:

1. **Health Checks** (every 5 minutes)
   - Monitors all system components
   - Triggers alerts for unhealthy components
   - Respects monitoring settings configuration

2. **Performance Monitoring** (every 10 minutes)
   - Analyzes system performance metrics
   - Triggers alerts for threshold violations
   - Tracks performance trends

3. **Alert Cleanup** (daily at 2 AM)
   - Removes old resolved alerts
   - Prevents memory bloat
   - Maintains alert history

## Alert Configuration

### Default Thresholds

- **Response Time**: 2000ms average
- **Error Rate**: 10% of requests
- **Memory Usage**: 512MB RSS
- **Database Response Time**: 1000ms average
- **Error Frequency**: 10 errors per 5 minutes

### Alert Cooldowns

- **Database/Service Down**: 5 minutes
- **Email Service Issues**: 10 minutes
- **Performance Issues**: 15-30 minutes

### Email Templates

Monitoring alerts are sent using branded email templates with:
- Severity-specific colors and icons
- Technical details and timestamps
- Recommended actions
- Direct links to admin dashboard

## Integration

### Server Startup

```javascript
import { monitoringMiddleware, errorTrackingMiddleware } from './middleware/monitoring';
import ScheduledJobs from './services/scheduledJobs';

// Add monitoring middleware
app.use(monitoringMiddleware);
app.use(errorTrackingMiddleware);

// Initialize monitoring after database connection
mongoose.connection.once('open', async () => {
  await ScheduledJobs.initialize();
});
```

### Database Operation Monitoring

```javascript
import { withDatabaseMonitoring } from './middleware/monitoring';

// Wrap database operations
const users = await withDatabaseMonitoring(
  'find',
  'users',
  () => User.find({})
);
```

### Manual Error Tracking

```javascript
import { performanceMonitor } from './utils/performanceMonitor';

try {
  // Your code here
} catch (error) {
  performanceMonitor.recordError(error.message, error.stack);
  throw error;
}
```

## Dashboard Integration

The monitoring system provides data for the existing LaunchDayMonitor component:

- Real-time health status indicators
- Performance metrics charts
- Active alert notifications
- System uptime and statistics

## Configuration

### Environment Variables

No additional environment variables are required. The monitoring system uses existing email configuration:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`

### Admin Settings

Configure monitoring through the admin interface:

1. Navigate to Admin Dashboard
2. Go to Monitoring Settings
3. Configure thresholds, intervals, and recipients
4. Enable/disable specific monitoring components

## Testing

### Running Tests

```bash
cd server && npm test -- --testPathPattern=monitoring
```

### Manual Testing

1. **Health Check**: `curl http://localhost:4000/api/health`
2. **Load Testing**: Use tools like `ab` or `wrk` to generate load
3. **Alert Testing**: Use admin interface to send test alerts
4. **Error Simulation**: Temporarily misconfigure database/email

## Troubleshooting

### Common Issues

1. **No Alerts Received**
   - Check email service configuration
   - Verify admin emails in settings
   - Check alert cooldown periods

2. **High Memory Usage**
   - Review metrics retention settings
   - Check for memory leaks in application code
   - Consider reducing retention hours

3. **False Alerts**
   - Adjust threshold values in settings
   - Increase cooldown periods
   - Review alert rules logic

### Logs

Monitor logs for:
- `🏥 Running scheduled health check...`
- `📊 Running scheduled performance monitoring...`
- `🚨 ALERT TRIGGERED:`
- `📧 Alert notification sent to:`

### Performance Impact

The monitoring system is designed to be lightweight:
- Middleware adds ~1-2ms per request
- Health checks run asynchronously
- Metrics are stored in memory with limits
- Background tasks use minimal CPU

## Security Considerations

- All admin endpoints require authentication
- Health check endpoints expose minimal information
- Alert emails contain technical details (admin-only)
- Database operations are monitored but data is not logged
- Monitoring data is retained for limited time

## Future Enhancements

Potential improvements for the monitoring system:

1. **External Integrations**
   - Slack/Discord notifications
   - PagerDuty integration
   - Webhook support

2. **Advanced Metrics**
   - Custom business metrics
   - User behavior tracking
   - Revenue impact monitoring

3. **Visualization**
   - Grafana integration
   - Custom charts and graphs
   - Historical trend analysis

4. **Machine Learning**
   - Anomaly detection
   - Predictive alerting
   - Auto-scaling recommendations