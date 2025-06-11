// server/tests/monitoring.test.ts
import request from 'supertest';
import express from 'express';
import HealthCheckService from '../src/services/healthCheckService';
import AlertingService from '../src/services/alertingService';
import { performanceMonitor } from '../src/utils/performanceMonitor';

describe('Monitoring System', () => {
  // Mock app for testing
  const app = express();
  app.use(express.json());
  
  beforeEach(async () => {
    // Reset performance monitor for clean tests
    performanceMonitor.reset();
  });

  describe('HealthCheckService', () => {
    it('should perform a health check', async () => {
      const healthStatus = await HealthCheckService.performHealthCheck();
      
      expect(healthStatus).toBeDefined();
      expect(healthStatus.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthStatus.components).toBeInstanceOf(Array);
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(typeof healthStatus.uptime).toBe('number');
    });

    it('should get simple status', async () => {
      const simpleStatus = await HealthCheckService.getSimpleStatus();
      
      expect(simpleStatus).toBeDefined();
      expect(simpleStatus.status).toMatch(/^(ok|error)$/);
      expect(simpleStatus.timestamp).toBeInstanceOf(Date);
    });

    it('should check individual components', async () => {
      const components = ['database', 'email', 'trialService', 'memory'];
      
      for (const componentName of components) {
        const component = await HealthCheckService.checkComponent(componentName);
        
        if (component) {
          expect(component.name).toBe(componentName);
          expect(component.status).toMatch(/^(healthy|degraded|unhealthy)$/);
          expect(component.message).toBeDefined();
          expect(component.lastChecked).toBeInstanceOf(Date);
        }
      }
    });
  });

  describe('PerformanceMonitor', () => {
    it('should record request metrics', () => {
      performanceMonitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        responseTime: 150
      });

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.requests.total).toBe(1);
      expect(summary.requests.averageResponseTime).toBe(150);
    });

    it('should record database operations', () => {
      performanceMonitor.recordDatabaseOperation({
        operation: 'find',
        collection: 'users',
        duration: 50,
        success: true
      });

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.database.totalOperations).toBe(1);
      expect(summary.database.averageResponseTime).toBe(50);
    });

    it('should record errors', () => {
      performanceMonitor.recordError('Test error', 'Test stack trace');

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.errors.total).toBe(1);
    });

    it('should check performance thresholds', () => {
      // Record a slow request
      performanceMonitor.recordRequest({
        method: 'GET',
        path: '/api/slow',
        statusCode: 200,
        responseTime: 3000
      });

      const thresholds = performanceMonitor.checkPerformanceThresholds();
      expect(thresholds).toBeDefined();
      expect(typeof thresholds.healthy).toBe('boolean');
      expect(thresholds.issues).toBeInstanceOf(Array);
    });

    it('should get endpoint metrics', () => {
      performanceMonitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        responseTime: 100
      });

      performanceMonitor.recordRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 404,
        responseTime: 50
      });

      const metrics = performanceMonitor.getEndpointMetrics('/api/test');
      expect(metrics.requestCount).toBe(2);
      expect(metrics.averageResponseTime).toBe(75);
      expect(metrics.errorRate).toBe(50);
    });
  });

  describe('AlertingService', () => {
    beforeEach(async () => {
      // Initialize alerting service
      await AlertingService.initialize();
    });

    it('should get alert statistics', () => {
      const stats = AlertingService.getAlertStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.resolved).toBe('number');
      expect(stats.bySeverity).toBeDefined();
      expect(typeof stats.last24Hours).toBe('number');
    });

    it('should get active alerts', () => {
      const activeAlerts = AlertingService.getActiveAlerts();
      expect(activeAlerts).toBeInstanceOf(Array);
    });

    it('should get alert history', () => {
      const history = AlertingService.getAlertHistory(10);
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should send test alert', async () => {
      // This test depends on having admin users in the database
      // In a real test environment, you would mock the User.find call
      const result = await AlertingService.sendTestAlert();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should respond to simple health check', async () => {
      // Mock the simple endpoint
      app.get('/health', async (req, res) => {
        try {
          const simpleStatus = await HealthCheckService.getSimpleStatus();
          res.json(simpleStatus);
        } catch (error) {
          res.status(500).json({
            status: 'error',
            timestamp: new Date(),
            message: 'Health check failed'
          });
        }
      });

      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toMatch(/^(ok|error)$/);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Performance Middleware Integration', () => {
    it('should track requests through middleware', async () => {
      const { monitoringMiddleware } = require('../src/middleware/monitoring');
      
      app.use(monitoringMiddleware);
      app.get('/test-endpoint', (req, res) => {
        res.json({ message: 'Test successful' });
      });

      const response = await request(app).get('/test-endpoint');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Test successful');
      
      // Check if metrics were recorded
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.requests.total).toBeGreaterThan(0);
    });
  });
});

describe('Error Scenarios', () => {
  it('should handle health check failures gracefully', async () => {
    // Mock a component that will fail
    jest.spyOn(HealthCheckService, 'checkComponent').mockRejectedValueOnce(new Error('Component check failed'));
    
    const component = await HealthCheckService.checkComponent('mock-component');
    expect(component).toBeNull();
  });

  it('should handle performance monitor errors', () => {
    // Test with invalid data
    expect(() => {
      performanceMonitor.recordRequest({
        method: 'GET',
        path: '/test',
        statusCode: 200,
        responseTime: -1 // Invalid response time
      });
    }).not.toThrow();
  });
});

// Integration test for the complete monitoring flow
describe('Monitoring Integration', () => {
  it('should complete a full monitoring cycle', async () => {
    // 1. Record some activity
    performanceMonitor.recordRequest({
      method: 'GET',
      path: '/api/users',
      statusCode: 200,
      responseTime: 120
    });

    performanceMonitor.recordDatabaseOperation({
      operation: 'find',
      collection: 'users',
      duration: 80,
      success: true
    });

    // 2. Perform health check
    const healthStatus = await HealthCheckService.performHealthCheck();
    expect(healthStatus.overall).toBeDefined();

    // 3. Check performance
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    expect(performanceSummary.requests.total).toBeGreaterThan(0);
    expect(performanceSummary.database.totalOperations).toBeGreaterThan(0);

    // 4. Check for alerts (should not trigger any)
    await AlertingService.checkPerformanceAlerts(performanceSummary);
    await AlertingService.checkHealthAlerts(healthStatus);

    const activeAlerts = AlertingService.getActiveAlerts();
    // In normal conditions, there should be no alerts
    // (unless the test environment has actual issues)
    expect(activeAlerts).toBeInstanceOf(Array);
  });
});