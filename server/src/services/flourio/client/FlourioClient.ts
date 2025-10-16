/**
 * @file FlourioClient.ts
 * @purpose Axios-based HTTP client for Flourio API v3 with Bearer token auth
 * @created 2025-10-16
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RateLimitHandler, RateLimitConfig } from './rateLimitHandler';
import { FlourioErrorHandler } from './errorHandler';

export interface FlourioClientConfig {
  baseURL: string;
  bearerToken: string;
  timeout?: number;
  mockMode?: boolean;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

export class FlourioClient {
  private axios: AxiosInstance;
  private rateLimitHandler: RateLimitHandler;
  private mockMode: boolean;

  constructor(config: FlourioClientConfig) {
    this.mockMode = config.mockMode || false;
    this.rateLimitHandler = new RateLimitHandler(config.rateLimitConfig);

    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.setupInterceptors(config.bearerToken);
  }

  private setupInterceptors(token: string): void {
    this.axios.interceptors.request.use((config) => {
      if (!this.mockMode) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => FlourioErrorHandler.handle(error)
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (this.mockMode) {
      return this.getMockData<T>(url);
    }

    return this.rateLimitHandler.executeWithRetry(async () => {
      const response = await this.axios.get<T>(url, config);
      return response.data;
    });
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (this.mockMode) {
      return this.getMockData<T>(url);
    }

    return this.rateLimitHandler.executeWithRetry(async () => {
      const response = await this.axios.post<T>(url, data, config);
      return response.data;
    });
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (this.mockMode) {
      return this.getMockData<T>(url);
    }

    return this.rateLimitHandler.executeWithRetry(async () => {
      const response = await this.axios.patch<T>(url, data, config);
      return response.data;
    });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (this.mockMode) {
      return this.getMockData<T>(url);
    }

    return this.rateLimitHandler.executeWithRetry(async () => {
      const response = await this.axios.delete<T>(url, config);
      return response.data;
    });
  }

  private getMockData<T>(url: string): Promise<T> {
    console.log(`[FlourioClient] Mock mode: ${url}`);
    return Promise.resolve({} as T);
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  getBaseURL(): string {
    return this.axios.defaults.baseURL || '';
  }
}
