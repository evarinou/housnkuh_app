/**
 * @file index.ts
 * @purpose Main exports for Flourio API v3 client
 * @created 2025-10-16
 */

export { FlourioClient } from './client/FlourioClient';
export type { FlourioClientConfig } from './client/FlourioClient';
export { FlourioError, FlourioErrorHandler } from './client/errorHandler';
export { RateLimitHandler } from './client/rateLimitHandler';
export type { RateLimitConfig } from './client/rateLimitHandler';
export { flourioConfig, validateFlourioConfig } from './client/config';
