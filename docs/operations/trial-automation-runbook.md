# Trial Automation Operations Runbook

## Overview
This runbook provides step-by-step procedures for monitoring, troubleshooting, and maintaining the housnkuh trial automation system.

## System Architecture

### Components
- **Trial Service** (`trialService.ts`): Core trial logic and automation
- **Monitoring Service** (`trialMonitoringService.ts`): Metrics collection and health checks
- **Management Service** (`trialManagementService.ts`): Admin tools and manual interventions
- **Feature Flag Service** (`featureFlagService.ts`): Rollout controls and feature toggles
- **Scheduled Jobs** (`scheduledJobs.ts`): Automated tasks and maintenance
- **Email Service** (`emailService.ts`): Automated notifications and reminders

### Data Flow
1. **User Registration** → Trial Started
2. **Scheduled Jobs** → Check for reminders/expirations
3. **Email Service** → Send notifications
4. **Monitoring Service** → Track metrics
5. **Management Service** → Handle admin actions

## Daily Operations

### Morning Health Check (Every Day at 8:00 AM)

#### 1. System Status Check
```bash
# Check all services are running
curl -s https://api.housnkuh.de/api/health/detailed | jq .

# Expected response should show all services as "healthy"
```

#### 2. Trial Metrics Review
```bash
# Get current trial metrics
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/trials/metrics | jq .

# Key metrics to check:
# - conversionRate >= 20% (target: 30%)
# - activeTrials > 0
# - automationNotes for any manual interventions
```

#### 3. Upcoming Expirations
```bash
# Check trials expiring in next 24 hours
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/trials/expiring?daysAhead=1 | jq .

# If > 10 trials expiring, prepare for support inquiries
```

#### 4. Email Queue Status
```bash
# Check email queue health
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/email/queue/stats | jq .

# Look for:
# - High failure rate (>10%)
# - Large backlog (>100 pending)
# - Stalled jobs
```

### Weekly Operations Review (Every Monday at 10:00 AM)

#### 1. Conversion Rate Analysis
- Review weekly conversion trends
- Compare with previous weeks
- Identify any concerning patterns

#### 2. Feature Flag Review
- Check current rollout percentages
- Review any recent changes
- Plan upcoming rollouts

#### 3. Audit Log Review
- Check for unusual admin activities
- Verify bulk operations were successful
- Review any error patterns

## Monitoring and Alerting

### Alert Response Procedures

#### Critical Alert: Low Conversion Rate (< 10%)
**Symptoms**: Conversion rate drops below 10%
**Response Time**: Immediate (within 15 minutes)

**Steps**:
1. **Verify Alert**
   ```bash
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.housnkuh.de/api/admin/monitoring/trials/health | jq .
   ```

2. **Check Email Delivery**
   ```bash
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.housnkuh.de/api/admin/email/queue/stats | jq .
   ```

3. **Review Recent Changes**
   - Check deployment logs
   - Review feature flag changes
   - Check for system errors

4. **Immediate Actions**
   - If email issues: Disable email reminders temporarily
   - If system issues: Reduce rollout percentage
   - If unclear: Escalate to development team

#### High Alert: Mass Email Failures (> 20% failure rate)
**Symptoms**: Email delivery rate drops below 80%
**Response Time**: Within 30 minutes

**Steps**:
1. **Check Email Service Status**
   ```bash
   # Check email service health
   curl -s https://api.housnkuh.de/api/health/detailed | jq '.email'
   ```

2. **Review Email Queue**
   ```bash
   # Get failed jobs
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.housnkuh.de/api/admin/email/queue/failed | jq .
   ```

3. **Identify Root Cause**
   - SMTP server issues
   - Rate limiting
   - DNS problems
   - Authentication failures

4. **Immediate Actions**
   - Restart email service if needed
   - Clear failed jobs queue
   - Temporarily disable reminders if persistent

#### Medium Alert: High Trial Expiration Volume (> 50 in 24h)
**Symptoms**: Unusual number of trials expiring
**Response Time**: Within 1 hour

**Steps**:
1. **Verify Numbers**
   ```bash
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://api.housnkuh.de/api/admin/trials/expiring?daysAhead=1 | jq '.count'
   ```

2. **Check Historical Data**
   - Compare with previous weeks
   - Look for seasonal patterns
   - Check for bulk registration events

3. **Prepare Support Team**
   - Notify customer support
   - Prepare FAQ responses
   - Monitor support ticket volume

### Performance Monitoring

#### Response Time Monitoring
```bash
# Check API response times
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/performance/metrics | jq .

# Alert if average response time > 2 seconds
```

#### Database Performance
```bash
# Check database metrics
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/database/metrics | jq .

# Alert if query time > 1 second
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Vendors Not Receiving Reminder Emails
**Symptoms**: Low email delivery rate, user complaints

**Diagnosis Steps**:
1. Check email service status
2. Verify email addresses are valid
3. Check spam folder instructions
4. Review email templates

**Solutions**:
```bash
# Check specific user's email status
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/users/USER_ID/email-status | jq .

# Resend reminder manually
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/trials/USER_ID/resend-reminder

# Reset reminder flags
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/trials/bulk-update \
  -d '{"userIds": ["USER_ID"], "action": "reset_reminders"}'
```

#### Issue: Trials Not Expiring Automatically
**Symptoms**: Expired trials still showing as active

**Diagnosis Steps**:
1. Check scheduled jobs status
2. Verify trial automation feature flags
3. Check for database connection issues

**Solutions**:
```bash
# Check scheduled jobs
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/scheduled-jobs | jq .

# Manual expiration if needed
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/trials/bulk-update \
  -d '{"userIds": ["USER_ID"], "action": "expire"}'
```

#### Issue: Feature Flags Not Working
**Symptoms**: Feature changes not taking effect

**Diagnosis Steps**:
1. Check feature flag cache
2. Verify feature flag service
3. Check for deployment issues

**Solutions**:
```bash
# Clear feature flag cache
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/feature-flags/clear-cache

# Verify current flags
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/feature-flags | jq .
```

### System Recovery Procedures

#### Emergency Rollback
```bash
# Disable all trial automation
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/feature-flags/trial-automation/rollout \
  -d '{"enabled": false, "rolloutPercentage": 0}'

# Stop email reminders
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/feature-flags \
  -d '{"trialAutomation": {"emailReminders": false}}'
```

#### Database Recovery
```bash
# Backup current state
mongodump --db housnkuh --out /backups/emergency-$(date +%Y%m%d-%H%M%S)

# Restore from backup (if needed)
mongorestore --db housnkuh /backups/backup-directory/
```

## Maintenance Procedures

### Weekly Maintenance (Every Sunday at 2:00 AM)

#### 1. Database Cleanup
```bash
# Clean up old audit logs (keep 30 days)
mongo housnkuh --eval "
  db.auditlogs.deleteMany({
    timestamp: { \$lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  })
"
```

#### 2. Performance Metrics Cleanup
```bash
# Clear old performance metrics
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/cleanup
```

#### 3. Email Queue Cleanup
```bash
# Remove old completed jobs
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/email/queue/cleanup
```

### Monthly Maintenance (First Sunday of Month)

#### 1. Feature Flag Review
- Review rollout percentages
- Plan upcoming feature releases
- Document any changes

#### 2. Performance Analysis
- Review monthly metrics
- Identify optimization opportunities
- Update monitoring thresholds

#### 3. Security Review
- Check for failed login attempts
- Review admin access logs
- Update security configurations

## Escalation Procedures

### Level 1: Operations Team
**Triggers**: Routine alerts, minor issues
**Response Time**: Within 1 hour
**Actions**: Standard troubleshooting, basic fixes

### Level 2: Development Team
**Triggers**: Code-related issues, complex problems
**Response Time**: Within 4 hours
**Actions**: Code fixes, architecture changes

### Level 3: Management
**Triggers**: Critical business impact, major outages
**Response Time**: Within 30 minutes
**Actions**: Business decisions, external communication

## Contact Information

### Emergency Contacts
- **Operations**: ops@housnkuh.de / +49 157 35711257
- **Development**: dev@housnkuh.de / +49 157 35711258
- **Management**: management@housnkuh.de / +49 157 35711259

### External Services
- **Email Service**: support@emailprovider.com
- **Database**: admin@mongodb.com
- **Hosting**: support@hosting.com

## Tools and Resources

### Monitoring Tools
- **Admin Dashboard**: https://admin.housnkuh.de/monitoring
- **Database Monitor**: https://db.housnkuh.de/monitoring
- **Email Dashboard**: https://email.housnkuh.de/admin

### Documentation
- **API Documentation**: https://docs.housnkuh.de/api
- **System Architecture**: https://docs.housnkuh.de/architecture
- **Deployment Guide**: https://docs.housnkuh.de/deployment

### Useful Commands
```bash
# Quick health check
curl -s https://api.housnkuh.de/api/health | jq .healthy

# Get system stats
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/monitoring/dashboard | jq .

# Emergency shutdown
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.housnkuh.de/api/admin/system/emergency-stop
```

## Change Log

### Version 1.0 (2024-01-15)
- Initial runbook creation
- Basic monitoring procedures
- Emergency response procedures

### Version 1.1 (2024-01-20)
- Added performance monitoring
- Enhanced troubleshooting guide
- Updated contact information

---

**Last Updated**: January 2024  
**Next Review**: March 2024  
**Maintained By**: Operations Team