/**
 * @file performanceMonitor.test.ts
 * @purpose Unit tests for PerformanceMonitor class, specifically focusing on error rate calculations
 * @created 2025-08-20
 * @modified 2025-08-20
 */

import { PerformanceMonitor } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // Create fresh instance for each test
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    // Clean up metrics after each test
    monitor.reset();
  });

  describe('Error Rate Calculation', () => {
    it('should return 0% error rate when no requests exist', () => {
      const summary = monitor.getPerformanceSummary();
      
      expect(summary.requests.errorRate).toBe(0);
      expect(summary.requests.total).toBe(0);
      expect(summary.requests.last5Minutes).toBe(0);
    });

    it('should return 0% error rate when only successful recent requests exist', () => {
      // Add successful requests
      monitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        responseTime: 150,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      monitor.recordRequest({
        method: 'POST',
        path: '/api/test',
        statusCode: 201,
        responseTime: 200,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.requests.errorRate).toBe(0);
      expect(summary.requests.total).toBe(2);
      expect(summary.requests.last5Minutes).toBe(2);
    });

    it('should return 100% error rate when only error requests in recent window exist', () => {
      // Add error requests
      monitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 404,
        responseTime: 50,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      monitor.recordRequest({
        method: 'POST',
        path: '/api/test',
        statusCode: 500,
        responseTime: 100,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.requests.errorRate).toBe(100);
      expect(summary.requests.total).toBe(2);
      expect(summary.requests.last5Minutes).toBe(2);
    });

    it('should calculate correct error rate with mixed success/error requests', () => {
      // Add 1 error request
      monitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 404,
        responseTime: 50,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      // Add 3 successful requests
      for (let i = 0; i < 3; i++) {
        monitor.recordRequest({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          responseTime: 100 + i * 10,
          userAgent: 'test',
          ip: '127.0.0.1'
        });
      }

      const summary = monitor.getPerformanceSummary();
      
      // 1 error out of 4 total requests = 25%
      expect(summary.requests.errorRate).toBe(25);
      expect(summary.requests.total).toBe(4);
      expect(summary.requests.last5Minutes).toBe(4);
    });

    it('should ignore old error requests when calculating recent error rate', () => {
      // Simulate old error request (manually set old timestamp)
      const oldErrorRequest = {
        method: 'GET',
        path: '/api/test',
        statusCode: 500,
        responseTime: 100,
        userAgent: 'test',
        ip: '127.0.0.1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };
      
      // Access private property for testing (not ideal but necessary for this test)
      (monitor as any).requestMetrics.push(oldErrorRequest);

      // Add recent successful request
      monitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        responseTime: 150,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      const summary = monitor.getPerformanceSummary();
      
      // Should be 0% error rate because the old error is outside the 5-minute window
      expect(summary.requests.errorRate).toBe(0);
      expect(summary.requests.total).toBe(2); // Total includes old request
      expect(summary.requests.last5Minutes).toBe(1); // Only recent request
    });
  });

  describe('Database Error Rate Calculation', () => {
    it('should return 0% database error rate when no operations exist', () => {
      const summary = monitor.getPerformanceSummary();
      
      expect(summary.database.errorRate).toBe(0);
      expect(summary.database.totalOperations).toBe(0);
    });

    it('should return 0% database error rate when only successful recent operations exist', () => {
      monitor.recordDatabaseOperation({
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: true
      });

      monitor.recordDatabaseOperation({
        operation: 'save',
        collection: 'users',
        duration: 100,
        success: true
      });

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.database.errorRate).toBe(0);
      expect(summary.database.totalOperations).toBe(2);
    });

    it('should return 100% database error rate when only error operations in recent window exist', () => {
      monitor.recordDatabaseOperation({
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: false,
        error: 'Connection timeout'
      });

      monitor.recordDatabaseOperation({
        operation: 'save',
        collection: 'users',
        duration: 100,
        success: false,
        error: 'Validation failed'
      });

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.database.errorRate).toBe(100);
      expect(summary.database.totalOperations).toBe(2);
    });

    it('should calculate correct database error rate with mixed success/error operations', () => {
      // Add 1 failed operation
      monitor.recordDatabaseOperation({
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: false,
        error: 'Connection timeout'
      });

      // Add 3 successful operations
      for (let i = 0; i < 3; i++) {
        monitor.recordDatabaseOperation({
          operation: 'find',
          collection: 'users',
          duration: 100 + i * 10,
          success: true
        });
      }

      const summary = monitor.getPerformanceSummary();
      
      // 1 error out of 4 total operations = 25%
      expect(summary.database.errorRate).toBe(25);
      expect(summary.database.totalOperations).toBe(4);
    });

    it('should ignore old database errors when calculating recent error rate', () => {
      // Simulate old error operation (manually set old timestamp)
      const oldErrorOperation = {
        operation: 'find',
        collection: 'users',
        duration: 100,
        success: false,
        error: 'Connection timeout',
        timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      };
      
      // Access private property for testing
      (monitor as any).databaseMetrics.push(oldErrorOperation);

      // Add recent successful operation
      monitor.recordDatabaseOperation({
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: true
      });

      const summary = monitor.getPerformanceSummary();
      
      // Should be 0% error rate because the old error is outside the 5-minute window
      expect(summary.database.errorRate).toBe(0);
      expect(summary.database.totalOperations).toBe(2); // Total includes old operation
    });
  });

  describe('Edge Cases', () => {
    it('should handle division by zero gracefully', () => {
      const summary = monitor.getPerformanceSummary();
      
      expect(summary.requests.errorRate).toBe(0);
      expect(summary.database.errorRate).toBe(0);
      expect(summary.requests.averageResponseTime).toBe(0);
      expect(summary.database.averageResponseTime).toBe(0);
    });

    it('should round error rates to 2 decimal places', () => {
      // Add 1 error request
      monitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 404,
        responseTime: 50,
        userAgent: 'test',
        ip: '127.0.0.1'
      });

      // Add 6 successful requests (1 error out of 7 = 14.285714...)
      for (let i = 0; i < 6; i++) {
        monitor.recordRequest({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          responseTime: 100,
          userAgent: 'test',
          ip: '127.0.0.1'
        });
      }

      const summary = monitor.getPerformanceSummary();
      
      // Should be rounded to 14.29%
      expect(summary.requests.errorRate).toBe(14.29);
    });
  });
});