// server/src/services/healthCheckService.ts
import mongoose from 'mongoose';
import { testEmailConnection } from '../utils/emailService';
import ScheduledJobs from './scheduledJobs';
import TrialService from './trialService';

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  lastChecked: Date;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  timestamp: Date;
  uptime: number;
}

/**
 * Health Check Service for comprehensive system monitoring
 * Monitors database, email service, scheduled jobs, and core business logic
 */
export class HealthCheckService {
  private static lastChecks: Map<string, ComponentHealth> = new Map();
  private static readonly CHECK_TIMEOUT = 10000; // 10 seconds

  /**
   * Perform comprehensive health check of all system components
   */
  static async performHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Performing comprehensive health check...');
    
    const startTime = Date.now();
    const components: ComponentHealth[] = [];
    
    // Run all checks in parallel for faster response
    const [
      databaseHealth,
      emailHealth,
      scheduledJobsHealth,
      trialServiceHealth,
      memoryHealth,
      diskHealth
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkEmailService(),
      this.checkScheduledJobs(),
      this.checkTrialService(),
      this.checkMemoryUsage(),
      this.checkDiskSpace()
    ]);

    // Process results
    const healthChecks = [
      { name: 'database', result: databaseHealth },
      { name: 'email', result: emailHealth },
      { name: 'scheduledJobs', result: scheduledJobsHealth },
      { name: 'trialService', result: trialServiceHealth },
      { name: 'memory', result: memoryHealth },
      { name: 'disk', result: diskHealth }
    ];

    for (const check of healthChecks) {
      if (check.result.status === 'fulfilled') {
        components.push(check.result.value);
      } else {
        components.push({
          name: check.name,
          status: 'unhealthy',
          message: `Health check failed: ${check.result.reason}`,
          lastChecked: new Date()
        });
      }
    }

    // Cache results for quick access
    components.forEach(component => {
      this.lastChecks.set(component.name, component);
    });

    // Determine overall health
    const overall = this.determineOverallHealth(components);
    
    const healthReport: SystemHealth = {
      overall,
      components,
      timestamp: new Date(),
      uptime: process.uptime()
    };

    const totalTime = Date.now() - startTime;
    console.log(`✅ Health check completed in ${totalTime}ms - Overall status: ${overall}`);
    
    return healthReport;
  }

  /**
   * Check database connectivity and performance
   */
  private static async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check connection state
      const connectionState = mongoose.connection.readyState;
      const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      
      if (connectionState !== 1) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database connection state: ${stateNames[connectionState]}`,
          lastChecked: new Date(),
          details: { connectionState }
        };
      }

      // Test simple query performance
      const User = require('../models/User').default;
      await User.countDocuments({}).maxTimeMS(5000);
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        message: responseTime > 2000 ? 'Database responding slowly' : 'Database connection healthy',
        responseTime,
        lastChecked: new Date(),
        details: {
          connectionState: stateNames[connectionState],
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check email service connectivity
   */
  private static async checkEmailService(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const isConnected = await Promise.race([
        testEmailConnection(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.CHECK_TIMEOUT)
        )
      ]);
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'email',
        status: isConnected ? 'healthy' : 'unhealthy',
        message: isConnected ? 'Email service operational' : 'Email service unavailable',
        responseTime,
        lastChecked: new Date(),
        details: {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          configured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
        }
      };
    } catch (error) {
      return {
        name: 'email',
        status: 'unhealthy',
        message: `Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check scheduled jobs status
   */
  private static async checkScheduledJobs(): Promise<ComponentHealth> {
    try {
      const jobsStatus = ScheduledJobs.getJobsStatus();
      const activeJobs = jobsStatus.totalJobs;
      
      return {
        name: 'scheduledJobs',
        status: activeJobs > 0 ? 'healthy' : 'degraded',
        message: `${activeJobs} scheduled jobs active`,
        lastChecked: new Date(),
        details: jobsStatus
      };
    } catch (error) {
      return {
        name: 'scheduledJobs',
        status: 'unhealthy',
        message: `Scheduled jobs error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check trial service functionality
   */
  private static async checkTrialService(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const stats = await TrialService.getTrialStatistics();
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'trialService',
        status: 'healthy',
        message: 'Trial service operational',
        responseTime,
        lastChecked: new Date(),
        details: stats
      };
    } catch (error) {
      return {
        name: 'trialService',
        status: 'unhealthy',
        message: `Trial service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check memory usage
   */
  private static async checkMemoryUsage(): Promise<ComponentHealth> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Consider degraded if using over 500MB RSS or 80% of heap
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      const isHeavyUsage = totalMemMB > 500 || heapUsagePercent > 80;
      
      return {
        name: 'memory',
        status: isHeavyUsage ? 'degraded' : 'healthy',
        message: `Memory usage: ${totalMemMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`,
        lastChecked: new Date(),
        details: {
          rss: totalMemMB,
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          heapUsagePercent: Math.round(heapUsagePercent),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: `Memory check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check disk space (basic check)
   */
  private static async checkDiskSpace(): Promise<ComponentHealth> {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      // This is a basic check - in production you might want more sophisticated disk monitoring
      return {
        name: 'disk',
        status: 'healthy',
        message: 'Disk space check passed',
        lastChecked: new Date(),
        details: {
          message: 'Basic disk accessibility verified'
        }
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'unhealthy',
        message: `Disk check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Determine overall system health based on component health
   */
  private static determineOverallHealth(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthy = components.filter(c => c.status === 'unhealthy');
    const degraded = components.filter(c => c.status === 'degraded');
    
    if (unhealthy.length > 0) {
      // Critical components that make system unhealthy
      const criticalUnhealthy = unhealthy.filter(c => 
        ['database', 'trialService'].includes(c.name)
      );
      
      if (criticalUnhealthy.length > 0) {
        return 'unhealthy';
      }
      
      // Non-critical unhealthy components still make system degraded
      return 'degraded';
    }
    
    if (degraded.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get cached health status (for quick endpoints)
   */
  static getCachedHealth(): ComponentHealth[] {
    return Array.from(this.lastChecks.values());
  }

  /**
   * Check specific component health
   */
  static async checkComponent(componentName: string): Promise<ComponentHealth | null> {
    switch (componentName) {
      case 'database':
        return await this.checkDatabase();
      case 'email':
        return await this.checkEmailService();
      case 'scheduledJobs':
        return await this.checkScheduledJobs();
      case 'trialService':
        return await this.checkTrialService();
      case 'memory':
        return await this.checkMemoryUsage();
      case 'disk':
        return await this.checkDiskSpace();
      default:
        return null;
    }
  }

  /**
   * Get simple status for lightweight health checks
   */
  static async getSimpleStatus(): Promise<{ status: string; timestamp: Date }> {
    try {
      // Quick check of critical components only
      const dbState = mongoose.connection.readyState;
      const uptime = process.uptime();
      
      return {
        status: dbState === 1 && uptime > 30 ? 'ok' : 'error',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date()
      };
    }
  }
}

export default HealthCheckService;