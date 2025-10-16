/**
 * @file errorHandler.test.ts
 * @purpose Unit tests for Flourio error handling
 * @created 2025-10-16
 */

import { FlourioError, FlourioErrorHandler } from './errorHandler';

describe('FlourioError', () => {
  it('should create error with message and status code', () => {
    const error = new FlourioError('Test error', 404, { detail: 'Not found' });

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual({ detail: 'Not found' });
    expect(error.name).toBe('FlourioError');
  });

  it('should be instanceof Error', () => {
    const error = new FlourioError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FlourioError);
  });
});

describe('FlourioErrorHandler', () => {
  describe('handle with response errors', () => {
    it('should handle 401 authentication error', () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(FlourioError);
      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(
        'Authentication failed. Check Bearer token.'
      );

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBe(401);
        expect(error.response).toEqual({ message: 'Unauthorized' });
      }
    });

    it('should handle 429 rate limit error', () => {
      const axiosError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('Rate limit exceeded');

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
      }
    });

    it('should handle 404 not found error', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Resource not found' }
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('Resource not found');

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
      }
    });

    it('should handle 500 server error', () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(
        'FlourIO server error: 500'
      );

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBe(500);
      }
    });

    it('should handle 502 bad gateway error', () => {
      const axiosError = {
        response: {
          status: 502,
          data: {}
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(
        'FlourIO server error: 502'
      );
    });

    it('should handle 503 service unavailable error', () => {
      const axiosError = {
        response: {
          status: 503,
          data: {}
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(
        'FlourIO server error: 503'
      );
    });

    it('should handle unknown status codes', () => {
      const axiosError = {
        response: {
          status: 418,
          data: { message: "I'm a teapot" }
        }
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('API error: 418');

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBe(418);
      }
    });
  });

  describe('handle network errors', () => {
    it('should handle timeout errors', () => {
      const axiosError = {
        code: 'ECONNABORTED',
        message: 'Request timeout'
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('Request timeout');

      try {
        FlourioErrorHandler.handle(axiosError);
      } catch (error: any) {
        expect(error.statusCode).toBeUndefined();
      }
    });

    it('should handle network unreachable errors', () => {
      const axiosError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND flour.host'
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow(
        'Network error: Unable to reach FlourIO API'
      );
    });

    it('should handle generic errors', () => {
      const axiosError = {
        message: 'Something went wrong'
      };

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('Something went wrong');
    });

    it('should handle errors without message', () => {
      const axiosError = {};

      expect(() => FlourioErrorHandler.handle(axiosError)).toThrow('Unknown error');
    });
  });
});
