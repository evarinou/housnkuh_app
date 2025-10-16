/**
 * @file errorHandler.ts
 * @purpose Error handling for Flourio API responses with typed error classes
 * @created 2025-10-16
 */

export class FlourioError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'FlourioError';
    Object.setPrototypeOf(this, FlourioError.prototype);
  }
}

export class FlourioErrorHandler {
  static handle(error: any): never {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          throw new FlourioError(
            'Authentication failed. Check Bearer token.',
            401,
            data
          );
        case 429:
          throw new FlourioError('Rate limit exceeded', 429, data);
        case 500:
        case 502:
        case 503:
          throw new FlourioError(
            `FlourIO server error: ${status}`,
            status,
            data
          );
        case 404:
          throw new FlourioError('Resource not found', 404, data);
        default:
          throw new FlourioError(`API error: ${status}`, status, data);
      }
    }

    if (error.code === 'ECONNABORTED') {
      throw new FlourioError('Request timeout', undefined, error);
    }

    if (error.code === 'ENOTFOUND') {
      throw new FlourioError('Network error: Unable to reach FlourIO API', undefined, error);
    }

    throw new FlourioError(error.message || 'Unknown error', undefined, error);
  }
}
