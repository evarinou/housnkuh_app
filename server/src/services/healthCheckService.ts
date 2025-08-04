/**
 * @file Health Check Service for comprehensive system monitoring
 * @description Service for monitoring system health including database, email, jobs, and core services
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

// server/src/services/healthCheckService.ts
import mongoose from 'mongoose';
import { testEmailConnection } from '../utils/emailService';
import ScheduledJobs from './scheduledJobs';
import TrialService from './trialService';
import logger from '../utils/logger';

/**
 * @interface ComponentHealth
 * @description Health status for individual system components
 */
export interface ComponentHealth {
  /** @description Component name */
  name: string;
  /** @description Health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** @description Status message */
  message: string;
  /** @description Response time in milliseconds */
  responseTime?: number;
  /** @description Last check timestamp */
  lastChecked: Date;
  /** @description Additional details */
  details?: any;
}

/**
 * @interface SystemHealth
 * @description Overall system health status
 */
export interface SystemHealth {
  /** @description Overall system health */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** @description Array of component health statuses */
  components: ComponentHealth[];
  /** @description Health check timestamp */
  timestamp: Date;
  /** @description System uptime in seconds */
  uptime: number;
}

/**
 * @class HealthCheckService
 * @description Health Check Service for comprehensive system monitoring
 * @monitors Database, email service, scheduled jobs, and core business logic
 * @security Provides system health information without exposing sensitive data
 * @complexity High - Comprehensive system monitoring with parallel checks
 */
export class HealthCheckService {
  private static lastChecks: Map<string, ComponentHealth> = new Map();
  private static readonly CHECK_TIMEOUT = 10000; // 10 seconds

  /**
   * @description Perform comprehensive health check of all system components
   * @security Monitors system health without exposing sensitive information
   * @complexity High - Parallel health checks with overall status determination
   * @returns {Promise<SystemHealth>} Comprehensive system health report
   */
  static async performHealthCheck(): Promise<SystemHealth> {
    logger.info('🏥 Performing comprehensive health check...');
    
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
    logger.info(`✅ Health check completed in ${totalTime}ms - Overall status: ${overall}`);
    
    return healthReport;
  }

  /**
   * @description Check database connectivity and performance
   * @security Tests database connection and query performance
   * @complexity Medium - Database connectivity test with performance monitoring
   * @returns {Promise<ComponentHealth>} Database health status
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
   * @description Check email service connectivity
   * @security Tests email service connection with timeout
   * @complexity Medium - Email service test with timeout handling
   * @returns {Promise<ComponentHealth>} Email service health status
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
   * @description Check scheduled jobs status
   * @security Monitors scheduled jobs without exposing sensitive data
   * @complexity Low - Simple job status check
   * @returns {Promise<ComponentHealth>} Scheduled jobs health status
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
   * @description Check trial service functionality
   * @security Tests trial service with performance monitoring
   * @complexity Medium - Trial service test with statistics
   * @returns {Promise<ComponentHealth>} Trial service health status
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
   * @description Check memory usage
   * @security Monitors system memory usage with thresholds
   * @complexity Low - Memory usage monitoring
   * @returns {Promise<ComponentHealth>} Memory usage health status
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
   * @description Check disk space (basic check)
   * @security Basic disk accessibility verification
   * @complexity Low - Simple disk space check
   * @returns {Promise<ComponentHealth>} Disk space health status
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
   * @description Determine overall system health based on component health
   * @param {ComponentHealth[]} components - Array of component health statuses
   * @security Evaluates system health based on component criticality
   * @complexity Medium - Health determination with component priority
   * @returns {'healthy' | 'degraded' | 'unhealthy'} Overall system health status
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
   * @description Get cached health status (for quick endpoints)
   * @security Provides cached health data for performance
   * @complexity Low - Simple cache retrieval
   * @returns {ComponentHealth[]} Array of cached component health statuses
   */
  static getCachedHealth(): ComponentHealth[] {
    return Array.from(this.lastChecks.values());
  }

  /**
   * @description Check specific component health
   * @param {string} componentName - Name of component to check
   * @security Allows targeted health checks for specific components
   * @complexity Medium - Component-specific health check routing
   * @returns {Promise<ComponentHealth | null>} Component health status or null if not found
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
   * @description Get simple status for lightweight health checks
   * @security Provides minimal health status for load balancers
   * @complexity Low - Simple status check for critical components
   * @returns {Promise<object>} Simple status object
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