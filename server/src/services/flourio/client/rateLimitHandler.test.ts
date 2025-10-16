/**
 * @file rateLimitHandler.test.ts
 * @purpose Unit tests for rate limit handling with exponential backoff
 * @created 2025-10-16
 */

import { RateLimitHandler } from './rateLimitHandler';

describe('RateLimitHandler', () => {
  describe('constructor and config', () => {
    it('should use default config when none provided', () => {
      const handler = new RateLimitHandler();
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(32000);
      expect(config.backoffFactor).toBe(2);
    });

    it('should merge partial config with defaults', () => {
      const handler = new RateLimitHandler({ maxRetries: 5, initialDelay: 500 });
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(500);
      expect(config.maxDelay).toBe(32000);
      expect(config.backoffFactor).toBe(2);
    });

    it('should accept complete custom config', () => {
      const handler = new RateLimitHandler({
        maxRetries: 2,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffFactor: 3
      });
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(2);
      expect(config.initialDelay).toBe(2000);
      expect(config.maxDelay).toBe(10000);
      expect(config.backoffFactor).toBe(3);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute request successfully on first try', async () => {
      const handler = new RateLimitHandler();
      const mockRequest = jest.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry(mockRequest);

      expect(result).toBe('success');
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 error with exponential backoff', async () => {
      const handler = new RateLimitHandler({
        maxRetries: 2,
        initialDelay: 100,
        backoffFactor: 2
      });

      const mockRequest = jest
        .fn()
        .mockRejectedValueOnce({
          response: { status: 429, headers: {} }
        })
        .mockResolvedValueOnce('success');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await handler.executeWithRetry(mockRequest);

      expect(result).toBe('success');
      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FlourioClient] Rate limited. Retrying after')
      );

      consoleSpy.mockRestore();
    });

    it('should respect Retry-After header from response', async () => {
      const handler = new RateLimitHandler({ maxRetries: 2 });

      const mockRequest = jest
        .fn()
        .mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '2' }
          }
        })
        .mockResolvedValueOnce('success');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const startTime = Date.now();

      const result = await handler.executeWithRetry(mockRequest);
      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(elapsed).toBeGreaterThanOrEqual(2000);
      expect(elapsed).toBeLessThan(2500);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying after 2000ms')
      );

      consoleSpy.mockRestore();
    });

    it('should throw after max retries exceeded', async () => {
      const handler = new RateLimitHandler({ maxRetries: 2, initialDelay: 10 });

      const mockRequest = jest.fn().mockRejectedValue({
        response: { status: 429, headers: {} }
      });

      await expect(handler.executeWithRetry(mockRequest)).rejects.toEqual({
        response: { status: 429, headers: {} }
      });

      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-429 errors', async () => {
      const handler = new RateLimitHandler();

      const mockRequest = jest.fn().mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } }
      });

      await expect(handler.executeWithRetry(mockRequest)).rejects.toEqual({
        response: { status: 500, data: { message: 'Server error' } }
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff correctly', async () => {
      const handler = new RateLimitHandler({
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2,
        maxDelay: 1000
      });

      const mockRequest = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 429, headers: {} } })
        .mockRejectedValueOnce({ response: { status: 429, headers: {} } })
        .mockResolvedValueOnce('success');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.executeWithRetry(mockRequest);

      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('100ms')
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('200ms')
      );

      consoleSpy.mockRestore();
    });

    it('should cap delay at maxDelay', async () => {
      const handler = new RateLimitHandler({
        maxRetries: 1,
        initialDelay: 10000,
        backoffFactor: 2,
        maxDelay: 500
      });

      const mockRequest = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 429, headers: {} } })
        .mockResolvedValueOnce('success');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.executeWithRetry(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('500ms')
      );

      consoleSpy.mockRestore();
    });
  });
});
