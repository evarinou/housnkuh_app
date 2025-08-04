/**
 * @file Performance monitoring system for tracking API and database performance
 * @description Comprehensive performance monitoring with request metrics, database operations,
 * error tracking, and system resource monitoring with configurable retention
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Interface for API request metrics
 * @interface RequestMetrics
 * @description Contains detailed metrics for HTTP requests including timing and context
 */
export interface RequestMetrics {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** API endpoint path */
  path: string;
  /** HTTP status code */
  statusCode: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Timestamp of the request */
  timestamp: Date;
  /** Optional user agent string */
  userAgent?: string;
  /** Optional client IP address */
  ip?: string;
  /** Optional authenticated user ID */
  userId?: string;
}

/**
 * Interface for database operation metrics
 * @interface DatabaseMetrics
 * @description Contains performance metrics for database operations
 */
export interface DatabaseMetrics {
  /** Database operation type (find, insert, update, delete) */
  operation: string;
  /** Database collection/table name */
  collection: string;
  /** Operation duration in milliseconds */
  duration: number;
  /** Timestamp of the operation */
  timestamp: Date;
  /** Whether the operation succeeded */
  success: boolean;
  /** Optional error message if operation failed */
  error?: string;
}

/**
 * Interface for comprehensive performance summary
 * @interface PerformanceSummary
 * @description Contains aggregated performance metrics for requests, database, system, and errors
 */
export interface PerformanceSummary {
  /** Request performance metrics */
  requests: {
    /** Total number of requests */
    total: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
    /** Number of requests in last 5 minutes */
    last5Minutes: number;
    /** Error rate as percentage */
    errorRate: number;
    /** Number of slow requests (> 2 seconds) */
    slowRequests: number;
  };
  /** Database performance metrics */
  database: {
    /** Total number of database operations */
    totalOperations: number;
    /** Average database response time in milliseconds */
    averageResponseTime: number;
    /** Database error rate as percentage */
    errorRate: number;
    /** Number of slow queries (> 1 second) */
    slowQueries: number;
  };
  /** System resource metrics */
  system: {
    /** Process uptime in seconds */
    uptime: number;
    /** Memory usage statistics */
    memoryUsage: NodeJS.MemoryUsage;
    /** Optional CPU usage statistics */
    cpuUsage?: NodeJS.CpuUsage;
  };
  /** Error tracking metrics */
  errors: {
    /** Total number of errors */
    total: number;
    /** Number of errors in last 5 minutes */
    last5Minutes: number;
    /** Array of recent error details */
    recentErrors: Array<{
      /** Error message */
      message: string;
      /** Error timestamp */
      timestamp: Date;
      /** Optional stack trace */
      stack?: string;
    }>;
  };
  /** Summary generation timestamp */
  timestamp: Date;
}

/**
 * Performance Monitor for tracking API response times, database performance,
 * and system metrics with configurable retention and alerting thresholds
 * @class PerformanceMonitor
 * @description Singleton class for comprehensive performance monitoring with automatic cleanup
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private requestMetrics: RequestMetrics[] = [];
  private databaseMetrics: DatabaseMetrics[] = [];
  private errorLog: Array<{ message: string; timestamp: Date; stack?: string }> = [];
  private readonly maxRetentionHours = 24; // Keep 24 hours of metrics
  private readonly maxRetentionCount = 10000; // Prevent memory overflow
  private cpuUsageStart?: NodeJS.CpuUsage;

  /**
   * Creates a new PerformanceMonitor instance
   * @constructor
   * @description Initializes performance monitoring with CPU tracking and automatic cleanup
   * @complexity O(1)
   */
  constructor() {
    // Start CPU monitoring
    this.cpuUsageStart = process.cpuUsage();
    
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    console.log('🔍 Performance Monitor initialized');
  }

  /**
   * Gets the singleton instance of PerformanceMonitor
   * @method getInstance
   * @static
   * @returns {PerformanceMonitor} The singleton instance
   * @complexity O(1)
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record API request metrics
   * @method recordRequest
   * @description Records API request metrics with automatic timestamp and alerts for slow requests
   * @param {Omit<RequestMetrics, 'timestamp'>} metrics - Request metrics without timestamp
   * @returns {void}
   * @complexity O(1)
   * @security Logs IP addresses and user agents for monitoring
   */
  recordRequest(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    this.requestMetrics.push({
      ...metrics,
      timestamp: new Date()
    });

    // Log slow requests
    if (metrics.responseTime > 2000) {
      console.warn(`🐌 Slow request detected: ${metrics.method} ${metrics.path} - ${metrics.responseTime}ms`);
    }

    // Log errors
    if (metrics.statusCode >= 400) {
      console.warn(`❌ Error response: ${metrics.method} ${metrics.path} - ${metrics.statusCode}`);
    }

    this.enforceRetentionLimits();
  }

  /**
   * Record database operation metrics
   * @method recordDatabaseOperation
   * @description Records database operation metrics with automatic timestamp and alerts for slow queries
   * @param {Omit<DatabaseMetrics, 'timestamp'>} metrics - Database metrics without timestamp
   * @returns {void}
   * @complexity O(1)
   * @security Logs database operations for monitoring and debugging
   */
  recordDatabaseOperation(metrics: Omit<DatabaseMetrics, 'timestamp'>): void {
    this.databaseMetrics.push({
      ...metrics,
      timestamp: new Date()
    });

    // Log slow queries
    if (metrics.duration > 1000) {
      console.warn(`🐌 Slow database query: ${metrics.operation} on ${metrics.collection} - ${metrics.duration}ms`);
    }

    // Log database errors
    if (!metrics.success) {
      console.error(`❌ Database operation failed: ${metrics.operation} on ${metrics.collection} - ${metrics.error}`);
    }

    this.enforceRetentionLimits();
  }

  /**
   * Record application errors
   * @method recordError
   * @description Records application errors with timestamp and optional stack trace
   * @param {string} message - Error message
   * @param {string} stack - Optional stack trace
   * @returns {void}
   * @complexity O(1)
   * @security Logs errors for debugging and monitoring
   */
  recordError(message: string, stack?: string): void {
    this.errorLog.push({
      message,
      timestamp: new Date(),
      stack
    });

    console.error(`🚨 Application error recorded: ${message}`);
    
    // Keep only last 1000 errors
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }
  }

  /**
   * Get comprehensive performance summary
   * @method getPerformanceSummary
   * @description Generates comprehensive performance summary with request, database, system, and error metrics
   * @returns {PerformanceSummary} Complete performance summary
   * @complexity O(n) where n is the number of metrics
   */
  getPerformanceSummary(): PerformanceSummary {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Request metrics
    const recentRequests = this.requestMetrics.filter(r => r.timestamp >= fiveMinutesAgo);
    const errorRequests = this.requestMetrics.filter(r => r.statusCode >= 400);
    const slowRequests = this.requestMetrics.filter(r => r.responseTime > 2000);
    
    const avgResponseTime = this.requestMetrics.length > 0 
      ? this.requestMetrics.reduce((sum, r) => sum + r.responseTime, 0) / this.requestMetrics.length
      : 0;

    // Database metrics
    const dbErrors = this.databaseMetrics.filter(d => !d.success);
    const slowQueries = this.databaseMetrics.filter(d => d.duration > 1000);
    
    const avgDbResponseTime = this.databaseMetrics.length > 0
      ? this.databaseMetrics.reduce((sum, d) => sum + d.duration, 0) / this.databaseMetrics.length
      : 0;

    // Error metrics
    const recentErrors = this.errorLog.filter(e => e.timestamp >= fiveMinutesAgo);

    // System metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = this.cpuUsageStart ? process.cpuUsage(this.cpuUsageStart) : undefined;

    return {
      requests: {
        total: this.requestMetrics.length,
        averageResponseTime: Math.round(avgResponseTime),
        last5Minutes: recentRequests.length,
        errorRate: this.requestMetrics.length > 0 
          ? Math.round((errorRequests.length / this.requestMetrics.length) * 100 * 100) / 100
          : 0,
        slowRequests: slowRequests.length
      },
      database: {
        totalOperations: this.databaseMetrics.length,
        averageResponseTime: Math.round(avgDbResponseTime),
        errorRate: this.databaseMetrics.length > 0
          ? Math.round((dbErrors.length / this.databaseMetrics.length) * 100 * 100) / 100
          : 0,
        slowQueries: slowQueries.length
      },
      system: {
        uptime: Math.round(process.uptime()),
        memoryUsage,
        cpuUsage
      },
      errors: {
        total: this.errorLog.length,
        last5Minutes: recentErrors.length,
        recentErrors: this.errorLog.slice(-10) // Last 10 errors
      },
      timestamp: new Date()
    };
  }

  /**
   * Get detailed request metrics
   * @method getRequestMetrics
   * @description Retrieves recent request metrics with optional limit
   * @param {number} limit - Maximum number of metrics to return (default: 100)
   * @returns {RequestMetrics[]} Array of request metrics
   * @complexity O(1)
   */
  getRequestMetrics(limit: number = 100): RequestMetrics[] {
    return this.requestMetrics.slice(-limit);
  }

  /**
   * Get detailed database metrics
   * @method getDatabaseMetrics
   * @description Retrieves recent database metrics with optional limit
   * @param {number} limit - Maximum number of metrics to return (default: 100)
   * @returns {DatabaseMetrics[]} Array of database metrics
   * @complexity O(1)
   */
  getDatabaseMetrics(limit: number = 100): DatabaseMetrics[] {
    return this.databaseMetrics.slice(-limit);
  }

  /**
   * Get request metrics for specific endpoint
   * @method getEndpointMetrics
   * @description Retrieves performance metrics for a specific API endpoint
   * @param {string} path - API endpoint path to analyze
   * @returns {Object} Endpoint-specific metrics
   * @returns {number} returns.averageResponseTime - Average response time in milliseconds
   * @returns {number} returns.requestCount - Total number of requests
   * @returns {number} returns.errorRate - Error rate as percentage
   * @returns {number} returns.slowRequestCount - Number of slow requests
   * @complexity O(n) where n is the number of request metrics
   */
  getEndpointMetrics(path: string): {
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
    slowRequestCount: number;
  } {
    const endpointRequests = this.requestMetrics.filter(r => r.path === path);
    
    if (endpointRequests.length === 0) {
      return {
        averageResponseTime: 0,
        requestCount: 0,
        errorRate: 0,
        slowRequestCount: 0
      };
    }

    const avgResponseTime = endpointRequests.reduce((sum, r) => sum + r.responseTime, 0) / endpointRequests.length;
    const errorCount = endpointRequests.filter(r => r.statusCode >= 400).length;
    const slowCount = endpointRequests.filter(r => r.responseTime > 2000).length;

    return {
      averageResponseTime: Math.round(avgResponseTime),
      requestCount: endpointRequests.length,
      errorRate: Math.round((errorCount / endpointRequests.length) * 100 * 100) / 100,
      slowRequestCount: slowCount
    };
  }

  /**
   * Check if system performance is within acceptable thresholds
   * @method checkPerformanceThresholds
   * @description Evaluates system performance against predefined thresholds
   * @returns {Object} Performance health status
   * @returns {boolean} returns.healthy - Whether system is performing within thresholds
   * @returns {string[]} returns.issues - Array of performance issues found
   * @complexity O(1)
   * @security Monitors system health for operational security
   */
  checkPerformanceThresholds(): {
    healthy: boolean;
    issues: string[];
  } {
    const summary = this.getPerformanceSummary();
    const issues: string[] = [];

    // Check response time thresholds
    if (summary.requests.averageResponseTime > 1000) {
      issues.push(`High average response time: ${summary.requests.averageResponseTime}ms`);
    }

    // Check error rate thresholds
    if (summary.requests.errorRate > 5) {
      issues.push(`High error rate: ${summary.requests.errorRate}%`);
    }

    // Check database performance
    if (summary.database.averageResponseTime > 500) {
      issues.push(`Slow database queries: ${summary.database.averageResponseTime}ms average`);
    }

    if (summary.database.errorRate > 1) {
      issues.push(`Database errors: ${summary.database.errorRate}%`);
    }

    // Check memory usage
    const memoryUsageMB = Math.round(summary.system.memoryUsage.rss / 1024 / 1024);
    if (memoryUsageMB > 512) {
      issues.push(`High memory usage: ${memoryUsageMB}MB`);
    }

    // Check recent errors
    if (summary.errors.last5Minutes > 10) {
      issues.push(`High error frequency: ${summary.errors.last5Minutes} errors in last 5 minutes`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Reset all metrics (for testing or maintenance)
   * @method reset
   * @description Clears all stored metrics and resets CPU monitoring
   * @returns {void}
   * @complexity O(1)
   * @security Provides clean state for testing and maintenance
   */
  reset(): void {
    this.requestMetrics = [];
    this.databaseMetrics = [];
    this.errorLog = [];
    this.cpuUsageStart = process.cpuUsage();
    console.log('🔄 Performance Monitor metrics reset');
  }

  /**
   * Clean up old metrics to prevent memory leaks
   * @method cleanupOldMetrics
   * @private
   * @description Removes metrics older than retention period and logs cleanup statistics
   * @returns {void}
   * @complexity O(n) where n is the number of metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.maxRetentionHours * 60 * 60 * 1000);
    
    const initialRequestCount = this.requestMetrics.length;
    const initialDbCount = this.databaseMetrics.length;
    const initialErrorCount = this.errorLog.length;

    this.requestMetrics = this.requestMetrics.filter(r => r.timestamp >= cutoffTime);
    this.databaseMetrics = this.databaseMetrics.filter(d => d.timestamp >= cutoffTime);
    this.errorLog = this.errorLog.filter(e => e.timestamp >= cutoffTime);

    this.enforceRetentionLimits();

    const cleanedRequests = initialRequestCount - this.requestMetrics.length;
    const cleanedDb = initialDbCount - this.databaseMetrics.length;
    const cleanedErrors = initialErrorCount - this.errorLog.length;

    if (cleanedRequests > 0 || cleanedDb > 0 || cleanedErrors > 0) {
      console.log(`🧹 Cleaned up old metrics: ${cleanedRequests} requests, ${cleanedDb} db ops, ${cleanedErrors} errors`);
    }
  }

  /**
   * Enforce maximum retention limits to prevent memory overflow
   * @method enforceRetentionLimits
   * @private
   * @description Ensures metrics arrays don't exceed maximum size limits
   * @returns {void}
   * @complexity O(1)
   * @security Prevents memory exhaustion attacks
   */
  private enforceRetentionLimits(): void {
    if (this.requestMetrics.length > this.maxRetentionCount) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxRetentionCount);
    }

    if (this.databaseMetrics.length > this.maxRetentionCount) {
      this.databaseMetrics = this.databaseMetrics.slice(-this.maxRetentionCount);
    }
  }
}

/**
 * Singleton instance of PerformanceMonitor
 * @constant {PerformanceMonitor} performanceMonitor
 * @description Application-wide performance monitor instance
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Express middleware for automatic performance monitoring
 * @function performanceMiddleware
 * @description Middleware that automatically tracks request performance metrics
 * @param {any} req - Express request object
 * @param {any} res - Express response object
 * @param {any} next - Express next function
 * @returns {void}
 * @complexity O(1)
 * @security Captures request metadata for monitoring
 */
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.recordRequest({
      method: req.method,
      path: req.route?.path || req.path || req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id
    });
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Database operation wrapper for performance tracking
 * @function trackDatabaseOperation
 * @template T - Return type of the database operation
 * @description Wraps database operations to automatically track performance metrics
 * @param {string} operation - Database operation type (find, insert, update, delete)
 * @param {string} collection - Database collection/table name
 * @param {Function} dbFunction - Database operation function to execute
 * @returns {Promise<T>} Result of the database operation
 * @complexity O(f) where f is the complexity of dbFunction
 * @security Tracks database operations for monitoring and debugging
 */
export const trackDatabaseOperation = async <T>(
  operation: string,
  collection: string,
  dbFunction: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  let success = true;
  let error: string | undefined;
  
  try {
    const result = await dbFunction();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    
    performanceMonitor.recordDatabaseOperation({
      operation,
      collection,
      duration,
      success,
      error
    });
  }
};

/**
 * Default export of PerformanceMonitor class
 * @default PerformanceMonitor
 */
export default PerformanceMonitor;