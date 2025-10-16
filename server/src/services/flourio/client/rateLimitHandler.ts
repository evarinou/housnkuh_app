/**
 * @file rateLimitHandler.ts
 * @purpose Rate limit handling with exponential backoff for Flourio API
 * @created 2025-10-16
 */

export interface RateLimitConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RateLimitHandler {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      initialDelay: config?.initialDelay ?? 1000,
      maxDelay: config?.maxDelay ?? 32000,
      backoffFactor: config?.backoffFactor ?? 2
    };
  }

  async executeWithRetry<T>(
    request: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    try {
      return await request();
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < this.config.maxRetries) {
        const retryAfter = this.parseRetryAfter(error.response.headers);
        const delay = this.calculateDelay(retryAfter, attempt);

        console.log(
          `[FlourioClient] Rate limited. Retrying after ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`
        );
        await this.sleep(delay);

        return this.executeWithRetry(request, attempt + 1);
      }
      throw error;
    }
  }

  private parseRetryAfter(headers: any): number | null {
    const retryAfter = headers['retry-after'] || headers['x-ratelimit-retry-after'];
    return retryAfter ? parseInt(retryAfter, 10) * 1000 : null;
  }

  private calculateDelay(retryAfter: number | null, attempt: number): number {
    if (retryAfter) return retryAfter;

    const exponentialDelay =
      this.config.initialDelay * Math.pow(this.config.backoffFactor, attempt);
    return Math.min(exponentialDelay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}
