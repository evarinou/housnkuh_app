/**
 * Performance monitoring utilities for database queries and API requests
 */

import mongoose from 'mongoose';

interface QueryPerformanceMetrics {
  query: string;
  collection: string;
  executionTime: number;
  timestamp: Date;
  isSlowQuery: boolean;
}

interface APIPerformanceMetrics {
  method: string;
  route: string;
  statusCode: number;
  executionTime: number;
  timestamp: Date;
  isSlowResponse: boolean;
}

class PerformanceMonitor {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private apiMetrics: APIPerformanceMetrics[] = [];
  private slowQueryThreshold: number = 100; // 100ms
  private slowApiThreshold: number = 500; // 500ms
  private maxMetricsSize: number = 1000; // Keep last 1000 entries

  /**
   * Log slow database queries
   */
  logSlowQuery(collectionName: string, method: string, query: any, executionTime: number): void {
    const isSlowQuery = executionTime > this.slowQueryThreshold;
    
    if (isSlowQuery) {
      console.warn(`🐌 Slow Query Detected:`, {
        collection: collectionName,
        method: method,
        query: JSON.stringify(query, null, 2),
        executionTime: `${executionTime}ms`,
        threshold: `${this.slowQueryThreshold}ms`
      });
    }

    const metric: QueryPerformanceMetrics = {
      query: `${collectionName}.${method}`,
      collection: collectionName,
      executionTime,
      timestamp: new Date(),
      isSlowQuery
    };

    this.queryMetrics.push(metric);
    
    // Keep only recent metrics to prevent memory issues
    if (this.queryMetrics.length > this.maxMetricsSize) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Log API performance metrics
   */
  logAPIRequest(method: string, route: string, statusCode: number, executionTime: number): void {
    const isSlowResponse = executionTime > this.slowApiThreshold;
    
    if (isSlowResponse) {
      console.warn(`🐌 Slow API Response:`, {
        method,
        route,
        statusCode,
        executionTime: `${executionTime}ms`,
        threshold: `${this.slowApiThreshold}ms`
      });
    }

    const metric: APIPerformanceMetrics = {
      method,
      route,
      statusCode,
      executionTime,
      timestamp: new Date(),
      isSlowResponse
    };

    this.apiMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxMetricsSize) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    slowQueryPercentage: number;
    avgExecutionTime: number;
    slowestQueries: QueryPerformanceMetrics[];
    queriesByCollection: Record<string, number>;
  } {
    const slowQueries = this.queryMetrics.filter(m => m.isSlowQuery);
    const totalExecutionTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const avgExecutionTime = this.queryMetrics.length > 0 ? totalExecutionTime / this.queryMetrics.length : 0;
    
    // Group by collection
    const queriesByCollection = this.queryMetrics.reduce((acc, metric) => {
      acc[metric.collection] = (acc[metric.collection] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get slowest queries (top 10)
    const slowestQueries = [...this.queryMetrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries: this.queryMetrics.length,
      slowQueries: slowQueries.length,
      slowQueryPercentage: this.queryMetrics.length > 0 ? (slowQueries.length / this.queryMetrics.length) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
      slowestQueries,
      queriesByCollection
    };
  }

  /**
   * Get API performance statistics
   */
  getAPIStats(): {
    totalRequests: number;
    slowRequests: number;
    slowRequestPercentage: number;
    avgResponseTime: number;
    slowestEndpoints: APIPerformanceMetrics[];
    requestsByRoute: Record<string, number>;
    errorRate: number;
  } {
    const slowRequests = this.apiMetrics.filter(m => m.isSlowResponse);
    const errorRequests = this.apiMetrics.filter(m => m.statusCode >= 400);
    const totalResponseTime = this.apiMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const avgResponseTime = this.apiMetrics.length > 0 ? totalResponseTime / this.apiMetrics.length : 0;
    
    // Group by route
    const requestsByRoute = this.apiMetrics.reduce((acc, metric) => {
      acc[metric.route] = (acc[metric.route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get slowest endpoints (top 10)
    const slowestEndpoints = [...this.apiMetrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalRequests: this.apiMetrics.length,
      slowRequests: slowRequests.length,
      slowRequestPercentage: this.apiMetrics.length > 0 ? (slowRequests.length / this.apiMetrics.length) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      slowestEndpoints,
      requestsByRoute,
      errorRate: this.apiMetrics.length > 0 ? (errorRequests.length / this.apiMetrics.length) * 100 : 0
    };
  }

  /**
   * Get overall performance summary
   */
  getPerformanceSummary() {
    return {
      database: this.getQueryStats(),
      api: this.getAPIStats(),
      systemInfo: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        mongoConnections: mongoose.connection.readyState
      }
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.apiMetrics = [];
  }

  /**
   * Set performance thresholds
   */
  setThresholds(slowQueryMs: number, slowApiMs: number): void {
    this.slowQueryThreshold = slowQueryMs;
    this.slowApiThreshold = slowApiMs;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware for monitoring API performance
 */
export const apiPerformanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(this: any, data: any) {
    const executionTime = Date.now() - startTime;
    
    performanceMonitor.logAPIRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      executionTime
    );

    originalSend.call(this, data);
  };

  next();
};

/**
 * Enable MongoDB query performance monitoring
 */
export const enableMongoosePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName: string, method: string, query: any, doc?: any) => {
      // Estimate execution time (this is approximate since we don't have exact timing)
      const queryComplexity = JSON.stringify(query).length;
      const estimatedTime = queryComplexity > 1000 ? 150 : queryComplexity > 100 ? 50 : 10;
      
      performanceMonitor.logSlowQuery(collectionName, method, query, estimatedTime);
    });
  }
};

export default performanceMonitor;