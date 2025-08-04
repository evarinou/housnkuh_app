#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Comprehensive Security Audit Script
 * 
 * This script performs automated security checks on the codebase:
 * - XSS vulnerability detection
 * - Console logging audit
 * - Dependency vulnerability scan
 * - Code quality security checks
 */

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.stats = {
      filesScanned: 0,
      xssVulnerabilities: 0,
      consoleStatements: 0,
      dependencyVulnerabilities: 0,
      securityHeaders: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  addIssue(type, file, line, message, severity = 'medium') {
    this.issues.push({
      type,
      file,
      line,
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  async scanForXSSVulnerabilities() {
    this.log('🔍 Scanning for XSS vulnerabilities...');
    
    const dangerousPatterns = [
      { pattern: /dangerouslySetInnerHTML\s*=\s*{[^}]*__html:\s*[^}]*}/, message: 'Potentially unsafe dangerouslySetInnerHTML usage' },
      { pattern: /innerHTML\s*=\s*[^;]*[^.](sanitize|escape)/, message: 'Unsafe innerHTML usage without sanitization' },
      { pattern: /outerHTML\s*=\s*[^;]*[^.](sanitize|escape)/, message: 'Unsafe outerHTML usage without sanitization' },
      { pattern: /document\.write\s*\(/, message: 'Dangerous document.write usage' },
      { pattern: /eval\s*\(/, message: 'Dangerous eval usage' },
      { pattern: /Function\s*\(/, message: 'Dangerous Function constructor usage' },
      { pattern: /javascript:\s*/, message: 'JavaScript protocol usage' },
      { pattern: /vbscript:\s*/, message: 'VBScript protocol usage' },
      { pattern: /on\w+\s*=\s*"[^"]*"/, message: 'Inline event handler detected' },
      { pattern: /on\w+\s*=\s*'[^']*'/, message: 'Inline event handler detected' }
    ];

    await this.scanFiles(['client/src', 'server/src'], /\.(tsx?|jsx?)$/, (file, content) => {
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        dangerousPatterns.forEach(({ pattern, message }) => {
          if (pattern.test(line)) {
            this.addIssue('xss', file, index + 1, message, 'high');
            this.stats.xssVulnerabilities++;
          }
        });
      });
    });

    this.log(`Found ${this.stats.xssVulnerabilities} potential XSS vulnerabilities`);
  }

  async scanForConsoleStatements() {
    this.log('🔍 Scanning for console statements...');
    
    const consolePattern = /console\.(log|error|warn|info|debug|trace)\s*\(/;
    
    await this.scanFiles(['client/src', 'server/src'], /\.(tsx?|jsx?)$/, (file, content) => {
      // Skip test files
      if (file.includes('test') || file.includes('spec')) {
        return;
      }
      
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (consolePattern.test(line)) {
          this.addIssue('console', file, index + 1, 'Console statement found in production code', 'medium');
          this.stats.consoleStatements++;
        }
      });
    });

    this.log(`Found ${this.stats.consoleStatements} console statements`);
  }

  async scanForSecurityHeaders() {
    this.log('🔍 Scanning for security headers configuration...');
    
    const securityHeaderPatterns = [
      { pattern: /Content-Security-Policy/i, message: 'CSP header configured' },
      { pattern: /X-Frame-Options/i, message: 'X-Frame-Options header configured' },
      { pattern: /X-Content-Type-Options/i, message: 'X-Content-Type-Options header configured' },
      { pattern: /X-XSS-Protection/i, message: 'X-XSS-Protection header configured' },
      { pattern: /Strict-Transport-Security/i, message: 'HSTS header configured' },
      { pattern: /helmet\(/i, message: 'Helmet middleware detected' }
    ];

    await this.scanFiles(['server/src'], /\.(tsx?|jsx?)$/, (file, content) => {
      securityHeaderPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(content)) {
          this.stats.securityHeaders++;
          this.log(`✅ ${message} in ${file}`);
        }
      });
    });

    this.log(`Found ${this.stats.securityHeaders} security header configurations`);
  }

  async scanForHardcodedSecrets() {
    this.log('🔍 Scanning for hardcoded secrets...');
    
    const secretPatterns = [
      { pattern: /password\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded password detected' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded API key detected' },
      { pattern: /secret\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded secret detected' },
      { pattern: /token\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded token detected' },
      { pattern: /bearer\s+[a-zA-Z0-9-._~+/]+=*/, message: 'Bearer token detected' },
      { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, message: 'Private key detected' }
    ];

    await this.scanFiles(['client/src', 'server/src'], /\.(tsx?|jsx?)$/, (file, content) => {
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }
        
        secretPatterns.forEach(({ pattern, message }) => {
          if (pattern.test(line)) {
            this.addIssue('secrets', file, index + 1, message, 'critical');
          }
        });
      });
    });
  }

  async scanDependencyVulnerabilities() {
    this.log('🔍 Scanning for dependency vulnerabilities...');
    
    try {
      // Client dependencies
      const clientAudit = await execAsync('cd client && npm audit --audit-level high --json', { 
        timeout: 30000 
      });
      const clientResults = JSON.parse(clientAudit.stdout);
      
      if (clientResults.metadata && clientResults.metadata.vulnerabilities) {
        const clientVulns = clientResults.metadata.vulnerabilities;
        this.stats.dependencyVulnerabilities += clientVulns.high || 0;
        this.stats.dependencyVulnerabilities += clientVulns.critical || 0;
        
        if (clientVulns.high > 0 || clientVulns.critical > 0) {
          this.addIssue('dependencies', 'client/package.json', 1, 
            `Found ${clientVulns.high || 0} high and ${clientVulns.critical || 0} critical vulnerabilities`, 'high');
        }
      }

      // Server dependencies
      const serverAudit = await execAsync('cd server && npm audit --audit-level high --json', { 
        timeout: 30000 
      });
      const serverResults = JSON.parse(serverAudit.stdout);
      
      if (serverResults.metadata && serverResults.metadata.vulnerabilities) {
        const serverVulns = serverResults.metadata.vulnerabilities;
        this.stats.dependencyVulnerabilities += serverVulns.high || 0;
        this.stats.dependencyVulnerabilities += serverVulns.critical || 0;
        
        if (serverVulns.high > 0 || serverVulns.critical > 0) {
          this.addIssue('dependencies', 'server/package.json', 1, 
            `Found ${serverVulns.high || 0} high and ${serverVulns.critical || 0} critical vulnerabilities`, 'high');
        }
      }

    } catch (error) {
      this.log(`Warning: Could not run dependency audit: ${error.message}`, 'warn');
    }

    this.log(`Found ${this.stats.dependencyVulnerabilities} dependency vulnerabilities`);
  }

  async scanFiles(directories, filePattern, callback) {
    const scanDirectory = async (dir) => {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (item.isFile() && filePattern.test(item.name)) {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            callback(fullPath, content);
            this.stats.filesScanned++;
          } catch (error) {
            this.log(`Error reading ${fullPath}: ${error.message}`, 'error');
          }
        }
      }
    };

    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        await scanDirectory(dir);
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      issues: this.issues,
      summary: {
        total: this.issues.length,
        critical: this.issues.filter(i => i.severity === 'critical').length,
        high: this.issues.filter(i => i.severity === 'high').length,
        medium: this.issues.filter(i => i.severity === 'medium').length,
        low: this.issues.filter(i => i.severity === 'low').length
      }
    };

    // Save detailed report
    const reportPath = path.join(__dirname, `../security-audit-${Date.now()}.json`);
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Print summary
    this.log('\n📊 SECURITY AUDIT SUMMARY');
    this.log('=' * 50);
    this.log(`Files Scanned: ${this.stats.filesScanned}`);
    this.log(`XSS Vulnerabilities: ${this.stats.xssVulnerabilities}`);
    this.log(`Console Statements: ${this.stats.consoleStatements}`);
    this.log(`Dependency Vulnerabilities: ${this.stats.dependencyVulnerabilities}`);
    this.log(`Security Headers: ${this.stats.securityHeaders}`);
    this.log('\n🚨 ISSUES BY SEVERITY');
    this.log(`Critical: ${report.summary.critical}`);
    this.log(`High: ${report.summary.high}`);
    this.log(`Medium: ${report.summary.medium}`);
    this.log(`Low: ${report.summary.low}`);
    this.log(`Total Issues: ${report.summary.total}`);
    
    // Show top issues
    if (this.issues.length > 0) {
      this.log('\n🔍 TOP SECURITY ISSUES');
      this.issues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 10)
        .forEach(issue => {
          this.log(`${issue.severity.toUpperCase()}: ${issue.message} (${issue.file}:${issue.line})`);
        });
    }
    
    return report;
  }

  async run() {
    this.log('🚀 Starting comprehensive security audit...');
    
    try {
      await this.scanForXSSVulnerabilities();
      await this.scanForConsoleStatements();
      await this.scanForSecurityHeaders();
      await this.scanForHardcodedSecrets();
      await this.scanDependencyVulnerabilities();
      
      const report = await this.generateReport();
      
      this.log('\n✅ Security audit completed successfully!');
      
      // Exit with error code if critical or high issues found
      if (report.summary.critical > 0 || report.summary.high > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`❌ Security audit failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.run();
}

module.exports = SecurityAuditor;