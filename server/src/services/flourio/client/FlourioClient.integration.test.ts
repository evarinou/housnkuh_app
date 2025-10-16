/**
 * @file FlourioClient.integration.test.ts
 * @purpose Integration tests for Flourio API client with real API
 * @created 2025-10-16
 */

import { FlourioClient, FlourioClientConfig } from './FlourioClient';
import { FlourioError } from './errorHandler';
import { flourioConfig, validateFlourioConfig } from './config';

describe('FlourioClient Integration Tests', () => {
  let client: FlourioClient;

  beforeAll(() => {
    try {
      validateFlourioConfig();
      client = new FlourioClient(flourioConfig);
    } catch (error) {
      console.warn('Skipping integration tests: Bearer token not configured');
    }
  });

  describe('config validation', () => {
    it('should have valid bearer token configured', () => {
      expect(() => validateFlourioConfig()).not.toThrow();
      expect(flourioConfig.bearerToken).toBeTruthy();
      expect(flourioConfig.baseURL).toBe('https://flour.host/v3');
    });
  });

  describe('real API calls', () => {
    it('should fetch articles from Flourio API', async () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      const articles = await client.get<any[]>('/articles');

      expect(Array.isArray(articles)).toBe(true);
      console.log(`✅ Fetched ${articles.length} articles from Flourio API`);

      if (articles.length > 0) {
        const firstArticle = articles[0];
        expect(firstArticle).toHaveProperty('_id');
        expect(firstArticle).toHaveProperty('number');
        expect(firstArticle).toHaveProperty('title');
      }
    });

    it('should fetch stocks from Flourio API', async () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      const stocks = await client.get<any[]>('/stocks');

      expect(Array.isArray(stocks)).toBe(true);
      console.log(`✅ Fetched ${stocks.length} stocks from Flourio API`);

      if (stocks.length > 0) {
        const firstStock = stocks[0];
        expect(firstStock).toHaveProperty('_id');
        expect(firstStock).toHaveProperty('number');
      }
    });

    it('should fetch businesspartners from Flourio API', async () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      const businesspartners = await client.get<any[]>('/businesspartners');

      expect(Array.isArray(businesspartners)).toBe(true);
      console.log(`✅ Fetched ${businesspartners.length} businesspartners from Flourio API`);

      if (businesspartners.length > 0) {
        const firstBP = businesspartners[0];
        expect(firstBP).toHaveProperty('_id');
        expect(firstBP).toHaveProperty('number');
      }
    });

    it('should handle 404 for non-existent resource', async () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      await expect(client.get('/nonexistent-endpoint-12345')).rejects.toThrow(FlourioError);

      try {
        await client.get('/nonexistent-endpoint-12345');
      } catch (error: any) {
        expect(error).toBeInstanceOf(FlourioError);
        expect(error.statusCode).toBe(404);
        console.log('✅ 404 error handled correctly');
      }
    });
  });

  describe('authentication', () => {
    it('should fail with invalid token', async () => {
      const invalidClient = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'invalid-token-12345',
        timeout: 5000
      });

      await expect(invalidClient.get('/articles')).rejects.toThrow(FlourioError);

      try {
        await invalidClient.get('/articles');
      } catch (error: any) {
        expect(error).toBeInstanceOf(FlourioError);
        expect(error.statusCode).toBe(401);
        expect(error.message).toContain('Authentication failed');
        console.log('✅ 401 authentication error handled correctly');
      }
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limits gracefully', async () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      const rateLimitClient = new FlourioClient({
        ...flourioConfig,
        rateLimitConfig: {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 2000,
          backoffFactor: 2
        }
      });

      const requests = Array(5).fill(null).map(() =>
        rateLimitClient.get('/articles')
      );

      const results = await Promise.allSettled(requests);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`✅ ${successful}/${requests.length} parallel requests succeeded`);

      expect(successful).toBeGreaterThan(0);
    });
  });

  describe('client utilities', () => {
    it('should return correct base URL', () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      expect(client.getBaseURL()).toBe('https://flour.host/v3');
    });

    it('should not be in mock mode for real API', () => {
      if (!client) {
        console.log('Skipping: No bearer token configured');
        return;
      }

      expect(client.isMockMode()).toBe(false);
    });
  });
});
