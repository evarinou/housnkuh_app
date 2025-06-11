// server/src/middleware/monitoring.ts
import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../utils/performanceMonitor';
import HealthCheckService from '../services/healthCheckService';
import AlertingService from '../services/alertingService';

/**
 * Monitoring middleware that automatically tracks requests and triggers alerts
 */
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Track original end method
  const originalEnd = res.end;
  const originalSend = res.send;
  
  // Override res.end to capture metrics
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    performanceMonitor.recordRequest({
      method: req.method,
      path: req.route?.path || req.path || req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
      userId: (req as any).user?.id
    });
    
    // Log slow requests
    if (responseTime > 3000) {
      console.warn(`🐌 Very slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    // Track errors for alerting
    if (res.statusCode >= 500) {
      performanceMonitor.recordError(
        `HTTP ${res.statusCode} error on ${req.method} ${req.path}`,
        `Status: ${res.statusCode}, Method: ${req.method}, Path: ${req.path}, Response Time: ${responseTime}ms`
      );
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  // Override res.send for additional tracking
  res.send = function(data?: any) {
    // Additional processing can be added here if needed
    return originalSend.call(this, data);
  };
  
  // Track request start
  console.log(`📊 ${req.method} ${req.path} - Started`);
  
  next();
};

/**
 * Error tracking middleware that records application errors
 */
export const errorTrackingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Record the error
  performanceMonitor.recordError(
    err.message,
    err.stack
  );
  
  // Log the error with context
  console.error(`🚨 Application Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    stack: err.stack
  });
  
  // Pass to next error handler
  next(err);
};

/**
 * Health check middleware for public endpoints
 */
export const healthCheckMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only run on health check endpoints
  if (!req.path.includes('/health')) {
    return next();
  }
  
  try {
    // Quick validation that core services are operational
    const simpleStatus = await HealthCheckService.getSimpleStatus();
    
    if (simpleStatus.status === 'error') {
      console.warn('⚠️ Health check middleware detected system issues');
    }
    
    next();
  } catch (error) {
    console.error('❌ Health check middleware error:', error);
    // Don't block the request, just log the issue
    next();
  }
};

/**
 * Performance monitoring trigger middleware
 * Runs performance checks and triggers alerts based on configurable intervals
 */
export const performanceCheckMiddleware = (() => {
  let lastPerformanceCheck = 0;
  let lastHealthCheck = 0;
  const PERFORMANCE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const HEALTH_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    
    try {
      // Run performance checks every 5 minutes
      if (now - lastPerformanceCheck > PERFORMANCE_CHECK_INTERVAL) {
        lastPerformanceCheck = now;
        
        // Run performance check in background
        setImmediate(async () => {
          try {
            const performanceSummary = performanceMonitor.getPerformanceSummary();
            await AlertingService.checkPerformanceAlerts(performanceSummary);
          } catch (error) {
            console.error('Background performance check failed:', error);
          }
        });
      }
      
      // Run health checks every 2 minutes
      if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
        lastHealthCheck = now;
        
        // Run health check in background
        setImmediate(async () => {
          try {
            const healthStatus = await HealthCheckService.performHealthCheck();
            await AlertingService.checkHealthAlerts(healthStatus);
          } catch (error) {
            console.error('Background health check failed:', error);
          }
        });
      }
    } catch (error) {
      console.error('Performance check middleware error:', error);
    }
    
    next();
  };
})();

/**
 * Database operation monitoring wrapper
 * Use this to wrap database operations for performance tracking
 */
export const withDatabaseMonitoring = async <T>(
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
    error = err instanceof Error ? err.message : 'Unknown database error';
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
    
    // Log slow database operations
    if (duration > 2000) {
      console.warn(`🐌 Slow database operation: ${operation} on ${collection} - ${duration}ms`);
    }
    
    // Log database errors
    if (!success) {
      console.error(`❌ Database operation failed: ${operation} on ${collection} - ${error}`);
    }
  }
};

/**
 * Request rate limiting and monitoring middleware
 */
export const rateLimitMonitoringMiddleware = (() => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_SIZE = 60 * 1000; // 1 minute
  const WARNING_THRESHOLD = 100; // requests per minute per IP
  
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(ip);
      }
    }
    
    // Track current request
    const current = requestCounts.get(clientIp) || { count: 0, resetTime: now + WINDOW_SIZE };
    current.count++;
    requestCounts.set(clientIp, current);
    
    // Check for high request rates
    if (current.count > WARNING_THRESHOLD) {
      console.warn(`⚠️ High request rate detected from IP ${clientIp}: ${current.count} requests/minute`);
      
      // Record as a potential issue
      performanceMonitor.recordError(
        `High request rate from IP ${clientIp}`,
        `${current.count} requests in last minute from ${clientIp}`
      );
    }
    
    next();
  };
})();

/**
 * Cleanup middleware for monitoring data
 * Runs periodic cleanup to prevent memory leaks
 */
export const cleanupMonitoringMiddleware = (() => {
  let lastCleanup = 0;
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      
      // Run cleanup in background
      setImmediate(() => {
        try {
          AlertingService.cleanupOldAlerts();
          console.log('🧹 Monitoring data cleanup completed');
        } catch (error) {
          console.error('Monitoring cleanup error:', error);
        }
      });
    }
    
    next();
  };
})();

export default {
  monitoringMiddleware,
  errorTrackingMiddleware,
  healthCheckMiddleware,
  performanceCheckMiddleware,
  withDatabaseMonitoring,
  rateLimitMonitoringMiddleware,
  cleanupMonitoringMiddleware
};