/**
 * @file config.ts
 * @purpose Configuration for Flourio API client from environment variables
 * @created 2025-10-16
 */

import { FlourioClientConfig } from './FlourioClient';

export const flourioConfig: FlourioClientConfig = {
  baseURL: process.env.FLOURIO_API_URL || 'https://flour.host/v3',
  bearerToken: process.env.FLOURIO_BEARER_TOKEN || '',
  timeout: parseInt(process.env.FLOURIO_TIMEOUT || '30000', 10),
  mockMode: process.env.FLOURIO_MOCK_MODE === 'true',
  rateLimitConfig: {
    maxRetries: parseInt(process.env.FLOURIO_RETRY_ATTEMPTS || '3', 10),
    initialDelay: 1000,
    maxDelay: 32000,
    backoffFactor: 2
  }
};

export function validateFlourioConfig(): void {
  if (!flourioConfig.bearerToken) {
    throw new Error(
      'FLOURIO_BEARER_TOKEN is not set. Please configure it in .env.local'
    );
  }

  if (!flourioConfig.baseURL) {
    throw new Error('FLOURIO_API_URL is not set');
  }
}
