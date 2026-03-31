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

/**
 * Flourio tenant-specific IDs (required for BusinessPartner creation).
 * These are fetched from Flourio once per deployment — set them in .env.local.
 */
export const flourioTenantConfig = {
  defaultPricelistId: process.env.FLOURIO_DEFAULT_PRICELIST_ID || '',
  defaultRevenueCreditorId: process.env.FLOURIO_DEFAULT_REVENUE_CREDITOR_ID || '',
  defaultTaxassignmentFull: process.env.FLOURIO_TAXASSIGNMENT_FULL || '',    // 19% MwSt
  defaultTaxassignmentReduced: process.env.FLOURIO_TAXASSIGNMENT_REDUCED || '', // 7% MwSt
  defaultWarehouseAddress: {
    company1: process.env.FLOURIO_WAREHOUSE_COMPANY || 'housnkuh',
    street: process.env.FLOURIO_WAREHOUSE_STREET || '',
    streetNumber: process.env.FLOURIO_WAREHOUSE_STREET_NR || '',
    zipCode: process.env.FLOURIO_WAREHOUSE_ZIP || '',
    city: process.env.FLOURIO_WAREHOUSE_CITY || '',
    country: 'DE'
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
