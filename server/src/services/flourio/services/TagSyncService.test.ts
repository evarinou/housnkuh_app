/**
 * @file TagSyncService.test.ts
 * @purpose Tests for deprecated TagSyncService
 * @created 2025-11-14
 */

import { TagSyncService } from './TagSyncService';
import { FlourioClient } from '../client/FlourioClient';

jest.mock('../client/FlourioClient');

describe('TagSyncService (Deprecated)', () => {
  let service: TagSyncService;
  let mockClient: jest.Mocked<FlourioClient>;

  beforeEach(() => {
    mockClient = new FlourioClient({
      baseURL: 'https://test.api',
      bearerToken: 'test-token'
    }) as jest.Mocked<FlourioClient>;

    service = new TagSyncService(mockClient);
  });

  describe('syncTags', () => {
    it('should throw deprecation error', async () => {
      await expect(service.syncTags()).rejects.toThrow('deprecated since 2025-11-14');
      await expect(service.syncTags()).rejects.toThrow('ArticleService.syncProduct()');
    });
  });

  describe('forceSyncTags', () => {
    it('should throw deprecation error', async () => {
      await expect(service.forceSyncTags()).rejects.toThrow('deprecated since 2025-11-14');
      await expect(service.forceSyncTags()).rejects.toThrow('ArticleService.syncProduct()');
    });
  });

  describe('getActiveTags', () => {
    it('should still work (not deprecated)', async () => {
      // This method is not deprecated, just testing it doesn't throw
      const result = await service.getActiveTags();
      expect(result).toBeDefined();
    });
  });

  describe('getSyncStats', () => {
    it('should still work (not deprecated)', async () => {
      const result = await service.getSyncStats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('flourioSynced');
      expect(result).toHaveProperty('localOnly');
    });
  });
});
