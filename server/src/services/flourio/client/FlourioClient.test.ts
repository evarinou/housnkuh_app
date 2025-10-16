/**
 * @file FlourioClient.test.ts
 * @purpose Unit tests for Flourio API client with Bearer authentication
 * @created 2025-10-16
 */

import axios from 'axios';
import { FlourioClient } from './FlourioClient';
import { FlourioError } from './errorHandler';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlourioClient', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      defaults: {
        baseURL: 'https://flour.host/v3'
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create client with valid config', () => {
      const client = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'test-token-123',
        timeout: 5000
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://flour.host/v3',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });
      expect(client).toBeInstanceOf(FlourioClient);
    });

    it('should use default timeout when not specified', () => {
      new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'test-token'
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should enable mock mode when configured', () => {
      const client = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'test-token',
        mockMode: true
      });

      expect(client.isMockMode()).toBe(true);
    });

    it('should setup request interceptor for Bearer token', () => {
      new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'my-secret-token'
      });

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();

      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config: any = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe('Bearer my-secret-token');
    });

    it('should setup response interceptor for error handling', () => {
      new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token'
      });

      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should not add Bearer token in mock mode', () => {
      new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token',
        mockMode: true
      });

      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config: any = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('HTTP methods', () => {
    let client: FlourioClient;

    beforeEach(() => {
      client = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'test-token'
      });
    });

    describe('get', () => {
      it('should make GET request and return data', async () => {
        const mockData = { id: 1, name: 'Test Article' };
        mockAxiosInstance.get.mockResolvedValue({ data: mockData });

        const result = await client.get('/articles');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/articles', undefined);
        expect(result).toEqual(mockData);
      });

      it('should pass config to axios', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: [] });

        await client.get('/articles', { params: { limit: 10 } });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/articles', {
          params: { limit: 10 }
        });
      });

      it('should return mock data in mock mode', async () => {
        const mockClient = new FlourioClient({
          baseURL: 'https://flour.host/v3',
          bearerToken: 'token',
          mockMode: true
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const result = await mockClient.get('/articles');

        expect(consoleSpy).toHaveBeenCalledWith('[FlourioClient] Mock mode: /articles');
        expect(result).toEqual({});
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('post', () => {
      it('should make POST request and return data', async () => {
        const postData = { title: 'New Article' };
        const mockResponse = { id: 2, ...postData };
        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await client.post('/articles', postData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/articles', postData, undefined);
        expect(result).toEqual(mockResponse);
      });

      it('should return mock data in mock mode', async () => {
        const mockClient = new FlourioClient({
          baseURL: 'https://flour.host/v3',
          bearerToken: 'token',
          mockMode: true
        });

        const result = await mockClient.post('/articles', { title: 'Test' });

        expect(result).toEqual({});
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });

    describe('patch', () => {
      it('should make PATCH request and return data', async () => {
        const patchData = { title: 'Updated Article' };
        const mockResponse = { id: 1, ...patchData };
        mockAxiosInstance.patch.mockResolvedValue({ data: mockResponse });

        const result = await client.patch('/articles/1', patchData);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/articles/1', patchData, undefined);
        expect(result).toEqual(mockResponse);
      });

      it('should return mock data in mock mode', async () => {
        const mockClient = new FlourioClient({
          baseURL: 'https://flour.host/v3',
          bearerToken: 'token',
          mockMode: true
        });

        const result = await mockClient.patch('/articles/1', { title: 'Test' });

        expect(result).toEqual({});
        expect(mockAxiosInstance.patch).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should make DELETE request and return data', async () => {
        const mockResponse = { success: true };
        mockAxiosInstance.delete.mockResolvedValue({ data: mockResponse });

        const result = await client.delete('/articles/1');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/articles/1', undefined);
        expect(result).toEqual(mockResponse);
      });

      it('should return mock data in mock mode', async () => {
        const mockClient = new FlourioClient({
          baseURL: 'https://flour.host/v3',
          bearerToken: 'token',
          mockMode: true
        });

        const result = await mockClient.delete('/articles/1');

        expect(result).toEqual({});
        expect(mockAxiosInstance.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('utility methods', () => {
    it('should return mock mode status', () => {
      const prodClient = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token',
        mockMode: false
      });

      const mockClient = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token',
        mockMode: true
      });

      expect(prodClient.isMockMode()).toBe(false);
      expect(mockClient.isMockMode()).toBe(true);
    });

    it('should return base URL', () => {
      const client = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token'
      });

      expect(client.getBaseURL()).toBe('https://flour.host/v3');
    });
  });

  describe('rate limit integration', () => {
    it('should use rate limit handler for requests', async () => {
      const client = new FlourioClient({
        baseURL: 'https://flour.host/v3',
        bearerToken: 'token',
        rateLimitConfig: {
          maxRetries: 2,
          initialDelay: 100,
          maxDelay: 1000,
          backoffFactor: 2
        }
      });

      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await client.get('/articles');

      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });
});
