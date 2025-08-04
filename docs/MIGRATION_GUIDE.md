# Migration Guide for M007 Changes

## Prerequisites

Before starting the migration process, ensure you have the following installed and configured:

- **Node.js 16+** (LTS version recommended)
- **MongoDB 4.4+** (local or remote instance)
- **Git** (latest version)
- **NPM** (comes with Node.js)

### System Requirements
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: At least 2GB free space for dependencies
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

## Step 1: Environment Setup

### 1.1 Clone or Update Repository
```bash
# If cloning for the first time
git clone <repository-url> housnkuh_app
cd housnkuh_app

# If updating existing repository
git pull origin main
```

### 1.2 Environment Variables Setup

#### Server Environment Variables
Create `server/.env` file with the following structure:

```bash
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/housnkuh

# JWT Configuration
JWT_SECRET=<generate-secure-secret>

# Server Configuration
PORT=4000
NODE_ENV=development

# Admin Setup
ADMIN_SETUP_KEY=<secure-setup-key>

# Email Configuration (replace with your settings)
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@domain.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Client Environment Variables
Create `client/.env` file:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:4000/api

# Development Server Configuration
HOST=0.0.0.0
PORT=3000
```

### 1.3 Generate Secure Secrets
```bash
# Generate JWT secret (512 characters)
node -e "console.log(require('crypto').randomBytes(256).toString('hex'))"

# Generate admin setup key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.4 Verify .gitignore Configuration
Ensure your `.gitignore` includes:
```
# Environment variables
.env
.env.local
.env.development
.env.test
.env.production

# Dependencies
node_modules/

# Builds
/client/build
/server/dist

# Logs
*.log
```

## Step 2: Database Setup

### 2.1 Install and Start MongoDB
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb

# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Windows (using Chocolatey)
choco install mongodb

# Start MongoDB service
sudo systemctl start mongodb  # Linux
brew services start mongodb/brew/mongodb-community  # macOS
```

### 2.2 Verify MongoDB Connection
```bash
# Test connection
mongo --eval "db.runCommand({ connectionStatus: 1 })"

# Or using MongoDB Compass for GUI management
```

### 2.3 Create Database and Indexes
The application will automatically create necessary indexes on startup, but you can manually verify:

```javascript
// Connect to MongoDB shell
use housnkuh

// Check indexes
db.users.getIndexes()
db.vertraege.getIndexes()
db.monthlyrevenues.getIndexes()
```

## Step 3: Dependencies Installation

### 3.1 Install All Dependencies
```bash
# Install root dependencies and both client/server
npm run install-all

# Alternative: Install manually
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 3.2 Verify Installation
```bash
# Check for vulnerabilities
npm audit

# Check for outdated packages
npm outdated
```

### 3.3 Fix Common Installation Issues

#### Node-gyp Issues (Windows)
```bash
npm install --global windows-build-tools
npm config set msvs_version 2019
```

#### Python Issues
```bash
# Install Python if missing
npm install --global node-gyp
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Step 4: Code Updates and Migration

### 4.1 Import Path Updates
No major import path changes were made in M007, but verify any custom imports:

```typescript
// Verify these imports work correctly
import { performanceMonitor } from '../utils/performanceMonitor';
import HealthCheckService from '../services/healthCheckService';
import AlertingService from '../services/alertingService';
```

### 4.2 Test Configuration Updates
The test configuration has been updated. No manual changes needed, but verify:

```bash
# Run tests to ensure everything works
cd client && npm test -- --watchAll=false
cd server && npm test
```

### 4.3 TypeScript Compilation
Verify TypeScript compilation works correctly:

```bash
# Check client TypeScript
cd client && npx tsc --noEmit

# Check server TypeScript
cd server && npx tsc --noEmit
```

## Step 5: Database Migration

### 5.1 Seed Development Data
```bash
# Navigate to server directory
cd server

# Run database seeding
npm run seed
```

### 5.2 Verify Data Structure
Check that the following collections exist with proper data:

```javascript
// MongoDB shell commands
use housnkuh

// Check collections
show collections

// Verify sample data
db.users.findOne()
db.mietfachs.findOne()
db.vertraege.findOne()
```

### 5.3 Migration Scripts (if applicable)
If you have existing data, run any necessary migration scripts:

```bash
# Example migration script (create if needed)
cd server
node scripts/migrate-data.js
```

## Step 6: Testing and Verification

### 6.1 Run Full Test Suite
```bash
# Test client
cd client && npm test -- --coverage --watchAll=false

# Test server
cd server && npm test -- --coverage

# Test TypeScript compilation
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

### 6.2 Build Verification
```bash
# Build client for production
cd client && npm run build

# Build server for production
cd server && npm run build
```

### 6.3 Application Functionality Test
```bash
# Start the development environment
npm run dev

# Verify the following:
# 1. Frontend loads at http://localhost:3000
# 2. Backend API responds at http://localhost:4000/api
# 3. Database connection works
# 4. Authentication flows work
# 5. Admin and vendor interfaces load
```

## Step 7: Team Onboarding Checklist

### 7.1 Developer Setup Checklist
- [ ] Prerequisites installed (Node.js, MongoDB, Git)
- [ ] Repository cloned/updated
- [ ] Environment variables configured
- [ ] Dependencies installed successfully
- [ ] Database connection verified
- [ ] Tests pass locally
- [ ] Application runs in development mode
- [ ] Production build completes successfully

### 7.2 Development Environment Verification
```bash
# Run this verification script
echo "=== Environment Verification ==="

# Check Node.js version
node --version

# Check NPM version
npm --version

# Check MongoDB status
mongod --version

# Check Git configuration
git config --global user.name
git config --global user.email

# Test application startup
npm run dev
```

### 7.3 IDE Configuration
Recommended VS Code extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier - Code formatter
- MongoDB for VS Code
- Thunder Client (API testing)
- Git Graph

## Troubleshooting Common Issues

### Issue: MongoDB Connection Failed
```bash
# Check MongoDB service status
sudo systemctl status mongodb

# Check if MongoDB is running on correct port
netstat -an | grep 27017

# Restart MongoDB service
sudo systemctl restart mongodb
```

### Issue: Port Already in Use
```bash
# Find process using port 3000 or 4000
lsof -i :3000
lsof -i :4000

# Kill process if needed
kill -9 <PID>
```

### Issue: Permission Errors
```bash
# Fix npm permissions (macOS/Linux)
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Issue: TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npx tsc --build --clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Test Failures
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests in verbose mode
npm test -- --verbose

# Run specific test file
npm test -- --testPathPattern=<test-file-name>
```

## Development Workflow

### 1. Daily Development
```bash
# Start development environment
npm run dev

# Run tests in watch mode (separate terminal)
cd client && npm test -- --watch
cd server && npm run test:watch
```

### 2. Before Committing
```bash
# Run full test suite
npm test

# Check TypeScript compilation
npm run type-check

# Build for production
npm run build-all
```

### 3. Code Quality Checks
```bash
# Lint code (if configured)
npm run lint

# Format code (if configured)
npm run format

# Security audit
npm audit
```

## Performance Optimization

### 1. Development Performance
```bash
# Clear caches if development is slow
rm -rf node_modules/.cache
rm -rf client/build
rm -rf server/dist

# Use faster installations
npm ci  # instead of npm install (in CI/CD)
```

### 2. Build Optimization
```bash
# Analyze bundle size
cd client && npm run build
npx serve -s build

# Use production build for testing
npm run build-all
```

## Support and Resources

### Documentation
- [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) - Development best practices
- [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md) - Performance analysis
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security guidelines

### Getting Help
1. Check this migration guide first
2. Review error logs carefully
3. Search existing issues in the repository
4. Create a detailed issue if problem persists

### Emergency Contacts
- Technical Lead: [Contact Information]
- DevOps Team: [Contact Information]
- Database Administrator: [Contact Information]

---

**Note**: This migration guide is for M007 milestone changes. For future migrations, refer to the specific migration guide for that version.