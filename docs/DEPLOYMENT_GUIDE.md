# Deployment Guide and Rollback Procedures

## Pre-Deployment Checklist

### 1. Code Quality Verification
- [ ] All tests passing (client and server)
- [ ] TypeScript compilation successful
- [ ] No ESLint errors or warnings
- [ ] Security audit clean (no high/critical vulnerabilities)
- [ ] Performance benchmarks met
- [ ] Code review completed and approved

### 2. Environment Preparation
- [ ] Production environment variables configured
- [ ] Database backup completed
- [ ] SSL certificates updated (if applicable)
- [ ] Monitoring systems operational
- [ ] Alert systems configured

### 3. Team Notification
- [ ] Deployment scheduled and communicated
- [ ] Rollback plan reviewed with team
- [ ] On-call personnel identified
- [ ] Maintenance window scheduled (if applicable)

## Environment Configuration

### Production Environment Variables

#### Server Configuration (`server/.env`)
```bash
# Database
MONGO_URI=mongodb://production-host:27017/housnkuh_prod

# Security
JWT_SECRET=<512-character-production-secret>
ADMIN_SETUP_KEY=<secure-production-key>

# Server
PORT=4000
NODE_ENV=production

# Email (Production SMTP)
EMAIL_HOST=smtp.production-provider.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=noreply@housnkuh.de
EMAIL_PASS=<secure-app-password>
EMAIL_FROM=noreply@housnkuh.de

# Frontend
FRONTEND_URL=https://housnkuh.de
```

#### Client Configuration (`client/.env.production`)
```bash
# Production API endpoint
REACT_APP_API_URL=https://api.housnkuh.de

# Production optimizations
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### Security Considerations
- Use environment variables only (never hardcode secrets)
- Rotate secrets regularly (quarterly)
- Enable HTTPS in production
- Configure proper CORS settings
- Set up database authentication

## Deployment Process

### Step 1: Pre-Deployment Validation

#### 1.1 Run Full Test Suite
```bash
# Client tests
cd client && npm test -- --coverage --watchAll=false --passWithNoTests

# Server tests
cd server && npm test -- --coverage

# TypeScript compilation
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

#### 1.2 Build Verification
```bash
# Build client for production
cd client && npm run build

# Build server for production
cd server && npm run build

# Verify build artifacts
ls -la client/build/
ls -la server/dist/
```

#### 1.3 Security Scan
```bash
# Vulnerability audit
npm audit --production

# Check for secrets in code
grep -r -i --include="*.ts" --include="*.tsx" --exclude-dir=node_modules -E "(password|secret|key).*=" .
```

### Step 2: Database Migration

#### 2.1 Database Backup
```bash
# Create production backup
mongodump --host production-host:27017 --db housnkuh_prod --out backup/$(date +%Y%m%d_%H%M%S)

# Verify backup integrity
mongorestore --host localhost:27017 --db housnkuh_backup --dir backup/latest/housnkuh_prod/ --dryRun
```

#### 2.2 Run Migration Scripts (if applicable)
```bash
# Example migration script
cd server
node scripts/migrate-production.js

# Verify migration success
node scripts/verify-migration.js
```

#### 2.3 Index Creation
```bash
# Ensure all indexes are created
node scripts/create-indexes.js
```

### Step 3: Application Deployment

#### 3.1 Server Deployment
```bash
# Install production dependencies
cd server
npm ci --only=production

# Build application
npm run build

# Start application with PM2 (recommended)
pm2 start ecosystem.config.js --env production

# Or start with Node.js directly
NODE_ENV=production node dist/index.js
```

#### 3.2 Client Deployment
```bash
# Build client
cd client
npm ci
npm run build

# Deploy to web server (example with nginx)
sudo cp -r build/* /var/www/housnkuh/
sudo systemctl reload nginx
```

#### 3.3 Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name housnkuh.de www.housnkuh.de;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name housnkuh.de www.housnkuh.de;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Serve React app
    location / {
        root /var/www/housnkuh;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 4: Post-Deployment Verification

#### 4.1 Health Checks
```bash
# Check application status
curl -f https://api.housnkuh.de/health

# Check specific endpoints
curl -f https://api.housnkuh.de/api/public/health
curl -f https://housnkuh.de/

# Check database connectivity
mongo production-host:27017/housnkuh_prod --eval "db.stats()"
```

#### 4.2 Smoke Tests
```bash
# Test critical user flows
# 1. User registration
# 2. Admin login
# 3. Vendor registration
# 4. API endpoints
# 5. Database operations

# Run automated tests against production
npm run test:production
```

#### 4.3 Performance Verification
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://housnkuh.de/

# Monitor initial traffic
tail -f /var/log/nginx/access.log
pm2 logs housnkuh-server
```

## Monitoring and Alerting

### Application Monitoring
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await mongoose.connection.db.admin().ping();
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      database: dbStatus ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message
    });
  }
});
```

### Log Monitoring
```bash
# Set up log rotation
sudo logrotate -f /etc/logrotate.d/housnkuh

# Monitor application logs
tail -f /var/log/housnkuh/application.log

# Monitor error logs
tail -f /var/log/housnkuh/error.log
```

### Performance Monitoring
- Response time monitoring
- Database query performance
- Memory usage tracking
- CPU utilization monitoring
- Error rate tracking

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

#### 1. Application Rollback
```bash
# Stop current application
pm2 stop housnkuh-server

# Switch to previous version
cd /var/www/housnkuh-server-previous
pm2 start ecosystem.config.js --env production

# Revert client files
sudo rm -rf /var/www/housnkuh/*
sudo cp -r /var/www/housnkuh-backup/* /var/www/housnkuh/
sudo systemctl reload nginx
```

#### 2. Environment Variables Restoration
```bash
# Restore previous environment configuration
cp .env.backup .env

# Restart application with previous config
pm2 restart housnkuh-server
```

### Database Rollback (< 15 minutes)

#### 1. Stop Application
```bash
# Stop application to prevent data corruption
pm2 stop housnkuh-server
```

#### 2. Restore Database
```bash
# Restore from backup
mongorestore --host production-host:27017 --db housnkuh_prod --drop backup/pre-deployment/housnkuh_prod/

# Verify restoration
mongo production-host:27017/housnkuh_prod --eval "db.stats()"
```

#### 3. Restart Application
```bash
# Start application with restored database
pm2 start housnkuh-server
```

### Full System Rollback (< 30 minutes)

#### 1. Complete Environment Restoration
```bash
# Restore complete application directory
sudo rm -rf /var/www/housnkuh-server
sudo cp -r /var/www/housnkuh-server-backup /var/www/housnkuh-server

# Restore client files
sudo rm -rf /var/www/housnkuh
sudo cp -r /var/www/housnkuh-backup /var/www/housnkuh

# Restore nginx configuration
sudo cp /etc/nginx/sites-available/housnkuh.backup /etc/nginx/sites-available/housnkuh
sudo systemctl reload nginx
```

#### 2. Database and Application Restart
```bash
# Restore database
mongorestore --host production-host:27017 --db housnkuh_prod --drop backup/pre-deployment/

# Restart application
cd /var/www/housnkuh-server
pm2 delete housnkuh-server
pm2 start ecosystem.config.js --env production
```

#### 3. Verification
```bash
# Verify rollback success
curl -f https://housnkuh.de/health
curl -f https://api.housnkuh.de/api/health

# Monitor logs for errors
pm2 logs housnkuh-server
tail -f /var/log/nginx/error.log
```

## Deployment Environments

### Staging Environment
```bash
# Staging configuration
MONGO_URI=mongodb://staging-host:27017/housnkuh_staging
FRONTEND_URL=https://staging.housnkuh.de
NODE_ENV=staging
```

### Production Environment
```bash
# Production configuration
MONGO_URI=mongodb://production-host:27017/housnkuh_prod
FRONTEND_URL=https://housnkuh.de
NODE_ENV=production
```

## Backup Strategy

### Automated Backups
```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/backups/housnkuh/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Database backup
mongodump --host production-host:27017 --db housnkuh_prod --out $BACKUP_DIR/database

# Application files backup
tar -czf $BACKUP_DIR/application.tar.gz /var/www/housnkuh-server

# Retain backups for 30 days
find /backups/housnkuh -type d -mtime +30 -exec rm -rf {} \;
```

### Backup Verification
```bash
# Weekly backup verification
mongorestore --host localhost:27017 --db housnkuh_verify --dir /backups/housnkuh/latest/database/housnkuh_prod/ --dryRun
```

## Emergency Procedures

### Critical Issue Response
1. **Immediate**: Put site in maintenance mode
2. **Assess**: Determine scope and impact
3. **Communicate**: Notify stakeholders
4. **Execute**: Implement rollback or hotfix
5. **Verify**: Confirm resolution
6. **Monitor**: Watch for additional issues

### Maintenance Mode
```html
<!-- maintenance.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Scheduled Maintenance - housnkuh</title>
</head>
<body>
    <h1>Scheduled Maintenance</h1>
    <p>We're currently performing scheduled maintenance. Please check back shortly.</p>
</body>
</html>
```

```nginx
# Nginx maintenance configuration
location / {
    return 503;
    add_header Retry-After 120 always;
}

error_page 503 @maintenance;
location @maintenance {
    root /var/www/maintenance;
    rewrite ^(.*)$ /maintenance.html break;
}
```

## Post-Deployment Tasks

### 1. Performance Monitoring
- Monitor response times for 24 hours
- Check error rates and logs
- Verify database performance
- Monitor resource utilization

### 2. User Communication
- Announce successful deployment
- Provide support contact information
- Monitor user feedback and support tickets

### 3. Documentation Updates
- Update deployment logs
- Document any issues encountered
- Update procedures based on lessons learned

### 4. Team Retrospective
- Review deployment process
- Identify areas for improvement
- Update procedures and checklists

---

**Emergency Contacts:**
- On-call Engineer: [Phone/Email]
- Database Administrator: [Phone/Email]
- DevOps Team Lead: [Phone/Email]

**Remember:** Always test rollback procedures in staging environment before production deployment.