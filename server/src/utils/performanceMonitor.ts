// server/src/utils/performanceMonitor.ts
export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export interface DatabaseMetrics {
  operation: string;
  collection: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PerformanceSummary {
  requests: {
    total: number;
    averageResponseTime: number;
    last5Minutes: number;
    errorRate: number;
    slowRequests: number; // > 2 seconds
  };
  database: {
    totalOperations: number;
    averageResponseTime: number;
    errorRate: number;
    slowQueries: number; // > 1 second
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
  errors: {
    total: number;
    last5Minutes: number;
    recentErrors: Array<{
      message: string;
      timestamp: Date;
      stack?: string;
    }>;
  };
  timestamp: Date;
}

/**
 * Performance Monitor for tracking API response times, database performance,
 * and system metrics with configurable retention and alerting thresholds
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private requestMetrics: RequestMetrics[] = [];
  private databaseMetrics: DatabaseMetrics[] = [];
  private errorLog: Array<{ message: string; timestamp: Date; stack?: string }> = [];
  private readonly maxRetentionHours = 24; // Keep 24 hours of metrics
  private readonly maxRetentionCount = 10000; // Prevent memory overflow
  private cpuUsageStart?: NodeJS.CpuUsage;

  constructor() {
    // Start CPU monitoring
    this.cpuUsageStart = process.cpuUsage();
    
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    console.log('🔍 Performance Monitor initialized');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record API request metrics
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
   */
  getRequestMetrics(limit: number = 100): RequestMetrics[] {
    return this.requestMetrics.slice(-limit);
  }

  /**
   * Get detailed database metrics
   */
  getDatabaseMetrics(limit: number = 100): DatabaseMetrics[] {
    return this.databaseMetrics.slice(-limit);
  }

  /**
   * Get request metrics for specific endpoint
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

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Middleware function for Express
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

// Database operation wrapper
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

export default PerformanceMonitor;