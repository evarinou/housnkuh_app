/**
 * @file RateLimitHandler.test.ts
 * @purpose Unit tests for FlourIO API rate limit handler
 * @created 2025-10-16
 */

import { RateLimitHandler, RateLimitConfig } from './RateLimitHandler';

describe('RateLimitHandler', () => {
  let handler: RateLimitHandler;

  beforeEach(() => {
    handler = new RateLimitHandler({
      maxRetries: 3,
      initialDelay: 100,  // Short delay for tests
      maxDelay: 5000,     // Allow longer delays for header-based retry tests
      backoffFactor: 2
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should execute request successfully without retry', async () => {
      const mockRequest = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await handler.executeWithRetry(mockRequest);

      expect(result).toEqual({ data: 'success' });
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should retry on HTTP 429 rate limit error', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1) // 1 second in future
          }
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const result = await handler.executeWithRetry(mockRequest);

      expect(result).toEqual({ data: 'success' });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries limit', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockRequest = jest.fn().mockRejectedValue(error429);

      await expect(handler.executeWithRetry(mockRequest)).rejects.toEqual(error429);
      expect(mockRequest).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry on non-429 errors', async () => {
      const error500 = {
        response: {
          status: 500,
          headers: {}
        }
      };

      const mockRequest = jest.fn().mockRejectedValue(error500);

      await expect(handler.executeWithRetry(mockRequest)).rejects.toEqual(error500);
      expect(mockRequest).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use x-ratelimit-reset header for delay', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 2; // 2 seconds in future
      const error429 = {
        response: {
          status: 429,
          headers: {
            'x-ratelimit-reset': String(futureTimestamp)
          }
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const sleepSpy = jest.spyOn(handler as any, 'sleep');

      await handler.executeWithRetry(mockRequest);

      expect(sleepSpy).toHaveBeenCalled();
      // Delay should be approximately 2000ms (allowing for timing variations during test execution)
      const actualDelay = sleepSpy.mock.calls[0][0];
      expect(actualDelay).toBeGreaterThan(1000); // At least 1 second remaining
      expect(actualDelay).toBeLessThanOrEqual(2000); // Not more than original 2 seconds
    });

    it('should use exponential backoff when no reset header', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const sleepSpy = jest.spyOn(handler as any, 'sleep');

      await handler.executeWithRetry(mockRequest);

      expect(sleepSpy).toHaveBeenCalledTimes(2);
      // First retry: 100ms * 2^0 = 100ms
      expect(sleepSpy.mock.calls[0][0]).toBe(100);
      // Second retry: 100ms * 2^1 = 200ms
      expect(sleepSpy.mock.calls[1][0]).toBe(200);
    });

    it('should respect maxDelay cap', async () => {
      const handlerWithLowMax = new RateLimitHandler({
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 500,  // Lower than initialDelay
        backoffFactor: 2
      });

      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const sleepSpy = jest.spyOn(handlerWithLowMax as any, 'sleep');

      await handlerWithLowMax.executeWithRetry(mockRequest);

      // Should be capped at maxDelay
      expect(sleepSpy.mock.calls[0][0]).toBe(500);
    });

    it('should handle retry-after header as fallback', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {
            'retry-after': '2'  // 2 seconds
          }
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const sleepSpy = jest.spyOn(handler as any, 'sleep');

      await handler.executeWithRetry(mockRequest);

      expect(sleepSpy).toHaveBeenCalledWith(2000); // 2 seconds in milliseconds
    });
  });

  describe('metrics', () => {
    it('should track total requests', async () => {
      const mockRequest = jest.fn().mockResolvedValue({ data: 'success' });

      await handler.executeWithRetry(mockRequest);
      await handler.executeWithRetry(mockRequest);
      await handler.executeWithRetry(mockRequest);

      const metrics = handler.getMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should track rate limit hits', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      await handler.executeWithRetry(mockRequest);

      const metrics = handler.getMetrics();
      expect(metrics.rateLimitHits).toBe(1);
      expect(metrics.totalRetries).toBe(1);
    });

    it('should calculate average retry delay', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      await handler.executeWithRetry(mockRequest);

      const metrics = handler.getMetrics();
      // Average of 100ms and 200ms = 150ms
      expect(metrics.averageRetryDelay).toBe(150);
    });

    it('should reset metrics', async () => {
      const mockRequest = jest.fn().mockResolvedValue({ data: 'success' });

      await handler.executeWithRetry(mockRequest);
      await handler.executeWithRetry(mockRequest);

      handler.resetMetrics();

      const metrics = handler.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.rateLimitHits).toBe(0);
      expect(metrics.totalRetries).toBe(0);
      expect(metrics.averageRetryDelay).toBe(0);
    });

    it('should calculate rate limit hit rate', async () => {
      const error429 = {
        response: {
          status: 429,
          headers: {}
        }
      };

      const mockSuccessRequest = jest.fn().mockResolvedValue({ data: 'success' });
      const mockFailRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      // 3 successful, 1 with rate limit (that retries once)
      await handler.executeWithRetry(mockSuccessRequest);
      await handler.executeWithRetry(mockSuccessRequest);
      await handler.executeWithRetry(mockSuccessRequest);
      await handler.executeWithRetry(mockFailRequest);

      const hitRate = handler.getRateLimitHitRate();
      // totalRequests = 3 + 2 (initial + retry) = 5
      // rateLimitHits = 1
      // hit rate = 1/5 = 20%
      expect(hitRate).toBe(20);
    });

    it('should return 0% hit rate when no requests', () => {
      const hitRate = handler.getRateLimitHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle x-ratelimit-reset in the past', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago
      const error429 = {
        response: {
          status: 429,
          headers: {
            'x-ratelimit-reset': String(pastTimestamp)
          }
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      const sleepSpy = jest.spyOn(handler as any, 'sleep');

      await handler.executeWithRetry(mockRequest);

      // Should use 0 delay (Math.max ensures non-negative)
      expect(sleepSpy.mock.calls[0][0]).toBe(0);
    });

    it('should handle missing headers', async () => {
      const error429 = {
        response: {
          status: 429
          // No headers property
        }
      };

      const mockRequest = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ data: 'success' });

      // Should not throw, should fallback to exponential backoff
      await expect(handler.executeWithRetry(mockRequest)).resolves.toEqual({ data: 'success' });
    });

    it('should not retry non-network errors without response object', async () => {
      // Seit Audit OP4 werden transiente Netzwerkfehler (z.B. "Network error",
      // Timeout, ECONNRESET) wiederholt – siehe RateLimitHandler.network.test.ts.
      // Ein generischer Fehler ohne response/request und ohne Netzwerk-Signatur
      // darf aber weiterhin NICHT wiederholt werden.
      const genericError = new Error('Something went wrong');

      const mockRequest = jest.fn().mockRejectedValue(genericError);

      await expect(handler.executeWithRetry(mockRequest)).rejects.toThrow('Something went wrong');
      expect(mockRequest).toHaveBeenCalledTimes(1); // No retry
    });
  });
});
