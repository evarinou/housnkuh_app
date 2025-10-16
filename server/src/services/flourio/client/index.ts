/**
 * @file index.ts
 * @purpose Client module exports
 * @created 2025-10-16
 */

export { FlourioClient } from './FlourioClient';
export type { FlourioClientConfig } from './FlourioClient';
export { FlourioError, FlourioErrorHandler } from './errorHandler';
export { RateLimitHandler } from './rateLimitHandler';
export type { RateLimitConfig } from './rateLimitHandler';
export { flourioConfig, validateFlourioConfig } from './config';
