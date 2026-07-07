/**
 * @file RateLimitHandler.ts
 * @purpose Handle FlourIO API rate limiting with smart retry logic
 * @created 2025-10-16
 *
 * FlourIO Rate Limits (confirmed by Alexander Fischer):
 * - 60 requests per minute / 1 per second
 * - No burst limit
 * - HTTP 429 response when exceeded
 * - x-ratelimit-reset header contains Unix timestamp for next allowed request
 */

import logger from '../../../utils/logger';

export interface RateLimitConfig {
  maxRetries: number;
  initialDelay: number;  // in milliseconds
  maxDelay: number;      // in milliseconds
  backoffFactor: number;
}

export interface RateLimitMetrics {
  totalRequests: number;
  rateLimitHits: number;
  totalRetries: number;
  averageRetryDelay: number;
}

export class RateLimitHandler {
  private config: RateLimitConfig;
  private metrics: RateLimitMetrics;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRetries: 3,
      initialDelay: 1000,      // 1 second
      maxDelay: 60000,         // 60 seconds
      backoffFactor: 2,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      rateLimitHits: 0,
      totalRetries: 0,
      averageRetryDelay: 0
    };
  }

  /**
   * Execute request with automatic retry on rate limit
   */
  async executeWithRetry<T>(
    request: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    this.metrics.totalRequests++;

    try {
      return await request();
    } catch (error: any) {
      const isRateLimit = this.isRateLimitError(error);
      const isNetwork = this.isRetryableNetworkError(error);

      // Sowohl Rate-Limit (429) als auch transiente Netzwerkfehler wiederholen
      // (Audit OP4: vorher nur 429). Rate-Limit nutzt Header-Delay, Netzwerk-
      // fehler nutzen Exponential Backoff (calculateDelay ohne Header).
      if ((isRateLimit || isNetwork) && attempt < this.config.maxRetries) {
        this.metrics.totalRetries++;
        if (isRateLimit) this.metrics.rateLimitHits++;

        const delay = this.calculateDelay(error.response?.headers, attempt);
        this.updateAverageDelay(delay);

        logger.warn('[RateLimitHandler] Retrying request', {
          reason: isRateLimit ? 'rate-limit' : 'network',
          code: error.code,
          delayMs: delay,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries
        });

        await this.sleep(delay);
        return this.executeWithRetry(request, attempt + 1);
      }

      // Nicht wiederholbar oder Retries erschöpft
      throw error;
    }
  }

  /**
   * Check if error is a rate limit error (HTTP 429)
   */
  private isRateLimitError(error: any): boolean {
    return error.response?.status === 429;
  }

  /**
   * Transiente Netzwerkfehler (kein HTTP-Response vom Server): Verbindung
   * abgelehnt/zurückgesetzt, Timeout, DNS-Fehler. Ein 4xx/5xx mit Response wird
   * hier NICHT erfasst (der Server hat geantwortet).
   */
  private isRetryableNetworkError(error: any): boolean {
    const retryableCodes = [
      'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      'EAI_AGAIN', 'ECONNABORTED', 'EPIPE'
    ];
    if (error?.code && retryableCodes.includes(error.code)) return true;
    if (typeof error?.message === 'string' && /timeout|network error/i.test(error.message)) return true;
    // Request gestellt, aber kein Response erhalten → Netzwerkebene.
    if (!error?.response && error?.request) return true;
    return false;
  }

  /**
   * Parse retry delay from headers
   * Priority: x-ratelimit-reset > retry-after > exponential backoff
   */
  private parseRetryAfter(headers: any): number | null {
    if (!headers) return null;

    // FlourIO uses x-ratelimit-reset with Unix timestamp
    const resetTimestamp = headers['x-ratelimit-reset'];
    if (resetTimestamp) {
      const resetTime = parseInt(resetTimestamp) * 1000; // Convert to milliseconds
      const now = Date.now();
      const delay = Math.max(0, resetTime - now);

      logger.debug('[RateLimitHandler] x-ratelimit-reset parsed', { resetTime: new Date(resetTime).toISOString(), delayMs: delay });
      return delay;
    }

    // Fallback to standard Retry-After header (in seconds)
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }

    return null;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(headers: any, attempt: number): number {
    // Try to get delay from headers first
    const headerDelay = this.parseRetryAfter(headers);
    if (headerDelay !== null) {
      return Math.min(headerDelay, this.config.maxDelay);
    }

    // Fallback to exponential backoff
    const exponentialDelay = this.config.initialDelay *
      Math.pow(this.config.backoffFactor, attempt);

    const finalDelay = Math.min(exponentialDelay, this.config.maxDelay);

    logger.debug('[RateLimitHandler] Using exponential backoff', { delayMs: finalDelay });
    return finalDelay;
  }

  /**
   * Update average retry delay metric
   */
  private updateAverageDelay(newDelay: number): void {
    const totalDelay = this.metrics.averageRetryDelay * (this.metrics.totalRetries - 1);
    this.metrics.averageRetryDelay = (totalDelay + newDelay) / this.metrics.totalRetries;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current metrics
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      rateLimitHits: 0,
      totalRetries: 0,
      averageRetryDelay: 0
    };
  }

  /**
   * Get rate limit hit percentage
   */
  getRateLimitHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.rateLimitHits / this.metrics.totalRequests) * 100;
  }
}
