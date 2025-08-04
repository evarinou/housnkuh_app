# M006 Deployment Guide
## Admin Revenue Overview and Trial Month Implementation

### Table of Contents
1. [Overview](#overview)
2. [Pre-deployment Checklist](#pre-deployment-checklist)
3. [Environment Variables](#environment-variables)
4. [Database Migrations](#database-migrations)
5. [Deployment Steps](#deployment-steps)
6. [Post-deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This deployment guide covers the implementation of Milestone M006, which includes:
- Admin revenue management dashboard
- Trial month functionality for vendors
- Enhanced booking system with trial support
- Revenue calculation and reporting features
- Database schema updates for trial contracts

**Deployment Risk Level**: Medium  
**Estimated Downtime**: 5-10 minutes for migrations  
**Rollback Complexity**: Low (automated rollback available)

---

## Pre-deployment Checklist

### Technical Prerequisites
- [ ] Database backup completed and verified
- [ ] Production environment health check passed
- [ ] SSL certificates are valid and current
- [ ] CDN and static assets prepared
- [ ] Load balancer configuration reviewed

### Code and Configuration
- [ ] All tests passing in CI/CD pipeline
- [ ] Code review completed and approved
- [ ] Environment variables documented and prepared
- [ ] Migration scripts tested on staging
- [ ] Rollback plan prepared and documented

### Team Preparation
- [ ] Deployment team briefed and available
- [ ] Stakeholders notified of deployment window
- [ ] Support team prepared for post-deployment issues
- [ ] Communication plan activated

### Monitoring and Alerting
- [ ] Monitoring dashboards updated for new features
- [ ] Alert thresholds configured for revenue calculations
- [ ] Log aggregation prepared for new components
- [ ] Performance baselines established

---

## Environment Variables

### New Environment Variables for M006

```env
# Revenue calculation schedule (cron format)
# Run monthly revenue calculation on 1st of each month at 2 AM
REVENUE_CALCULATION_SCHEDULE="0 2 1 * *"

# Export file storage configuration
EXPORT_FILES_PATH="/var/exports"
EXPORT_FILES_MAX_SIZE="50MB"
EXPORT_FILES_TTL="24h"

# Trial notification settings
TRIAL_WARNING_DAYS=7
TRIAL_DURATION_DAYS=30
TRIAL_NOTIFICATION_EMAIL="trial-support@housnkuh.com"

# Revenue dashboard caching
REVENUE_CACHE_TTL=300
REVENUE_CACHE_PREFIX="revenue:"

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1

# Email queue configuration for trial notifications
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=30000

# Database performance
DB_CONNECTION_POOL_SIZE=20
DB_QUERY_TIMEOUT=30000
```

### Updated Environment Variables

```env
# Existing variables that need updates
MONGO_URI="mongodb://localhost:27017/housnkuh"
JWT_SECRET="your-secure-jwt-secret-here"

# Enhanced logging for revenue features
LOG_LEVEL="info"
LOG_REVENUE_CALCULATIONS=true
LOG_TRIAL_OPERATIONS=true

# API rate limiting updates
API_RATE_LIMIT_ADMIN=1000
API_RATE_LIMIT_VENDOR=500
```

---

## Database Migrations

### Migration Sequence

The following migrations must be run in order:

#### 1. Trial Fields Migration
```bash
# Add trial-related fields to existing contracts
npm run migrate:up add-trial-fields-to-vertrag
```

#### 2. Revenue Collection Indexes
```bash
# Create indexes for efficient revenue queries
npm run migrate:up create-revenue-indexes
```

#### 3. User Trial Status Migration
```bash
# Update user model with trial status fields
npm run migrate:up add-trial-status-to-users
```

### Migration Validation
```bash
# Verify migrations completed successfully
npm run migrate:verify
```

### Detailed Migration Steps

#### Step 1: Pre-migration Backup
```bash
# Create full database backup
mongodump --uri="$MONGO_URI" --out="/backup/pre-m006-$(date +%Y%m%d_%H%M%S)"

# Verify backup integrity
mongorestore --uri="$TEST_MONGO_URI" --drop "/backup/pre-m006-*" --dryRun
```

#### Step 2: Run Migrations
```bash
cd server

# Run all pending migrations
npm run migrate:up

# Expected output:
# ✓ Migration 002: Add trial fields to Vertrag collection
# ✓ Migration 003: Create revenue calculation indexes
# ✓ Migration 004: Add trial status to User model
```

#### Step 3: Validate Migration Results
```bash
# Check migration status
npm run migrate:status

# Validate data integrity
npm run migrate:validate
```

---

## Deployment Steps

### Phase 1: Backend Deployment

#### 1. Stop Application Services
```bash
# Stop the application (if using PM2)
pm2 stop housnkuh-server

# Or if using systemd
sudo systemctl stop housnkuh-server
```

#### 2. Deploy Backend Code
```bash
# Pull latest code
git fetch origin
git checkout v1.6.0-m006

# Install dependencies
cd server
npm ci --production

# Build application
npm run build
```

#### 3. Run Database Migrations
```bash
# Run migrations
npm run migrate:up

# Verify migration success
npm run migrate:verify
```

#### 4. Update Configuration
```bash
# Update environment variables
source /path/to/new/environment/variables

# Verify configuration
npm run config:verify
```

#### 5. Start Backend Services
```bash
# Start the application
pm2 start ecosystem.config.js

# Or with systemd
sudo systemctl start housnkuh-server
```

### Phase 2: Frontend Deployment

#### 1. Build Frontend
```bash
cd client
npm ci
npm run build
```

#### 2. Deploy Static Assets
```bash
# Copy build files to web server
rsync -av build/ /var/www/housnkuh/

# Update CDN if applicable
aws s3 sync build/ s3://housnkuh-assets/
aws cloudfront create-invalidation --distribution-id $CDN_ID --paths "/*"
```

#### 3. Update Web Server Configuration
```bash
# Reload nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

### Phase 3: Scheduled Jobs Setup

#### 1. Configure Revenue Calculation Job
```bash
# Add cron job for revenue calculations
crontab -e

# Add line:
# 0 2 1 * * /usr/local/bin/node /path/to/server/dist/jobs/revenueCalculation.js
```

#### 2. Setup Monitoring Jobs
```bash
# Configure monitoring scripts
cp scripts/monitoring/* /opt/monitoring/
chmod +x /opt/monitoring/*.sh
```

---

## Post-deployment Verification

### 1. Health Checks

#### Application Health
```bash
# Check application status
curl -f http://localhost:4000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-05-20T10:00:00Z",
#   "version": "1.6.0-m006",
#   "database": "connected",
#   "features": {
#     "revenue_dashboard": "enabled",
#     "trial_bookings": "enabled"
#   }
# }
```

#### Database Health
```bash
# Check database connectivity
npm run db:ping

# Verify migrations
npm run migrate:status
```

### 2. Feature Verification

#### Admin Revenue Dashboard
```bash
# Test admin revenue endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:4000/api/admin/revenue/overview

# Verify response structure and data
```

#### Trial Booking System
```bash
# Test trial booking creation
curl -X POST \
     -H "Authorization: Bearer $VENDOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"mietfachId":"...","startdatum":"...","preis":100}' \
     http://localhost:4000/api/vendor/contracts

# Verify trial booking properties
```

#### Revenue Calculation
```bash
# Trigger manual revenue calculation
curl -X POST \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:4000/api/admin/revenue/calculate

# Check calculation results
```

### 3. Performance Verification

#### Load Testing
```bash
# Run basic load test
npm run test:load

# Monitor response times and error rates
```

#### Database Performance
```bash
# Check slow query log
tail -f /var/log/mongodb/mongod.log | grep "SLOW"

# Monitor connection pool usage
mongostat --host localhost:27017
```

### 4. Integration Testing

#### Email Notifications
```bash
# Test trial notification emails
npm run test:email-notifications

# Verify email delivery and content
```

#### Export Functionality
```bash
# Test revenue data export
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:4000/api/admin/revenue/export?type=summary&startYear=2024&startMonth=1&endYear=2024&endMonth=12"

# Verify file generation and download
```

---

## Rollback Procedures

### Automatic Rollback Triggers
- Health check failures lasting > 5 minutes
- Error rate exceeding 5% for > 2 minutes
- Database query timeout rate > 10%
- Critical security vulnerabilities detected

### Manual Rollback Steps

#### 1. Application Rollback
```bash
# Stop current version
pm2 stop housnkuh-server

# Revert to previous version
git checkout v1.5.0-m005

# Rebuild and restart
npm ci --production
npm run build
pm2 start ecosystem.config.js
```

#### 2. Database Rollback
```bash
# Rollback migrations (in reverse order)
npm run migrate:down add-trial-status-to-users
npm run migrate:down create-revenue-indexes
npm run migrate:down add-trial-fields-to-vertrag

# Verify rollback success
npm run migrate:status
```

#### 3. Frontend Rollback
```bash
# Revert frontend deployment
git checkout v1.5.0-m005
cd client
npm run build
rsync -av build/ /var/www/housnkuh/
```

#### 4. Configuration Rollback
```bash
# Restore previous environment variables
source /backup/environment/pre-m006.env

# Restart services with old configuration
pm2 restart housnkuh-server
```

### Rollback Verification
```bash
# Verify application functionality
npm run test:smoke

# Check data integrity
npm run db:verify-integrity

# Confirm all services operational
npm run health:check
```

---

## Monitoring and Alerts

### Key Performance Indicators

#### Revenue Dashboard Performance
- Page load time < 2 seconds
- API response time < 500ms
- Data accuracy 100%
- Cache hit rate > 80%

#### Trial Booking System
- Booking success rate > 99%
- Trial conversion rate tracking
- Email delivery rate > 98%
- Data consistency 100%

### Alert Configuration

#### Critical Alerts
```yaml
# Revenue calculation failures
- alert: RevenueCalculationFailed
  expr: revenue_calculation_error_rate > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    description: "Revenue calculation failed"

# Trial booking errors
- alert: TrialBookingErrors
  expr: trial_booking_error_rate > 0.05
  for: 2m
  labels:
    severity: warning
  annotations:
    description: "Trial booking error rate elevated"
```

#### Performance Alerts
```yaml
# Dashboard response time
- alert: DashboardSlow
  expr: revenue_dashboard_response_time > 2
  for: 3m
  labels:
    severity: warning

# Database performance
- alert: DatabaseSlow
  expr: mongodb_query_time > 1000
  for: 2m
  labels:
    severity: warning
```

### Monitoring Dashboard

#### Grafana Dashboard Panels
1. **Revenue System Health**
   - Calculation success rate
   - Dashboard response times
   - Data accuracy metrics

2. **Trial System Metrics**
   - Active trial users
   - Trial conversion rates
   - Booking success rates

3. **Database Performance**
   - Query execution times
   - Connection pool usage
   - Index utilization

4. **Error Tracking**
   - Error rates by endpoint
   - Failed operations breakdown
   - User error patterns

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Revenue Calculation Errors

**Symptom**: Revenue calculations failing or producing incorrect results

**Possible Causes**:
- Database connection timeout
- Data integrity issues
- Memory limitations

**Solutions**:
```bash
# Check database connectivity
npm run db:ping

# Verify data integrity
npm run db:verify-revenue-data

# Increase memory allocation
export NODE_OPTIONS="--max-old-space-size=4096"

# Re-run calculation
npm run revenue:calculate --force
```

#### 2. Trial Booking Failures

**Symptom**: Trial bookings not being created or marked incorrectly

**Possible Causes**:
- User trial status not properly set
- Migration incomplete
- Validation errors

**Solutions**:
```bash
# Check user trial status
npm run debug:user-trial-status <userId>

# Verify migration status
npm run migrate:status

# Check validation rules
npm run debug:booking-validation <bookingData>
```

#### 3. Dashboard Performance Issues

**Symptom**: Admin dashboard loading slowly or timing out

**Possible Causes**:
- Large dataset queries
- Missing indexes
- Cache issues

**Solutions**:
```bash
# Check query performance
npm run debug:slow-queries

# Verify indexes
npm run db:check-indexes

# Clear cache
npm run cache:clear revenue

# Optimize queries
npm run db:optimize-revenue-queries
```

#### 4. Migration Failures

**Symptom**: Database migrations failing to complete

**Possible Causes**:
- Data inconsistency
- Insufficient permissions
- Concurrent access

**Solutions**:
```bash
# Check migration logs
tail -f logs/migration.log

# Verify database permissions
npm run db:check-permissions

# Run migration in safe mode
npm run migrate:up --safe-mode

# If necessary, rollback and retry
npm run migrate:down <migration-name>
npm run migrate:up <migration-name>
```

### Emergency Contacts

**Technical Lead**: [Name] - [Phone] - [Email]  
**Database Administrator**: [Name] - [Phone] - [Email]  
**DevOps Engineer**: [Name] - [Phone] - [Email]  
**Product Owner**: [Name] - [Phone] - [Email]

### Emergency Procedures

#### Complete System Failure
1. Activate incident response team
2. Execute immediate rollback procedures
3. Restore from latest backup if necessary
4. Communicate with stakeholders
5. Document incident for post-mortem

#### Data Corruption
1. Stop all write operations immediately
2. Assess extent of corruption
3. Restore from clean backup
4. Re-apply safe migrations
5. Verify data integrity before resuming operations

---

## Success Criteria

### Technical Success Metrics
- [ ] All health checks passing
- [ ] Response times within acceptable limits
- [ ] Zero critical errors in first 24 hours
- [ ] All new features functional
- [ ] Migration completed successfully

### Business Success Metrics
- [ ] Revenue calculations 100% accurate
- [ ] Trial booking workflow operational
- [ ] Admin dashboard providing required insights
- [ ] No user-reported critical issues
- [ ] Support ticket volume normal

### Performance Success Metrics
- [ ] Page load times < 2 seconds
- [ ] API response times < 500ms
- [ ] Database query performance acceptable
- [ ] Error rates < 1%
- [ ] Uptime > 99.9%

---

## Post-Deployment Actions

### Week 1: Monitoring and Stabilization
- [ ] Monitor all system metrics closely
- [ ] Address any performance issues
- [ ] Collect user feedback
- [ ] Fine-tune configurations

### Week 2: Optimization
- [ ] Analyze performance data
- [ ] Optimize slow queries
- [ ] Adjust cache settings
- [ ] Update monitoring thresholds

### Week 3: Documentation and Training
- [ ] Update operational documentation
- [ ] Train support team on new features
- [ ] Create user guides if needed
- [ ] Document lessons learned

### Week 4: Review and Planning
- [ ] Conduct post-deployment review
- [ ] Analyze success metrics
- [ ] Plan optimizations for next release
- [ ] Update deployment procedures based on experience

---

*This deployment guide should be reviewed and updated before each deployment. All team members involved in deployment should be familiar with this document.*