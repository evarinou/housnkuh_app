/**
 * @file businessPartnerSyncService.test.ts
 * @purpose Unit tests for BusinessPartnerSyncService
 * @created 2025-10-16
 */

import { BusinessPartnerSyncService } from './businessPartnerSyncService';
import { BusinessPartnerService } from './BusinessPartnerService';
import type { IUser } from '../../../types/modelTypes';

// Mock BusinessPartnerService
jest.mock('./BusinessPartnerService');

// Mock User model
const mockFind = jest.fn();
const mockSave = jest.fn();

jest.mock('../../../models/User', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockFind(...args)
  }
}));

describe('BusinessPartnerSyncService', () => {
  let service: BusinessPartnerSyncService;
  let mockBusinessPartnerService: jest.Mocked<BusinessPartnerService>;

  beforeEach(() => {
    mockBusinessPartnerService = new BusinessPartnerService(
      {} as any
    ) as jest.Mocked<BusinessPartnerService>;
    service = new BusinessPartnerSyncService(mockBusinessPartnerService);

    jest.clearAllMocks();
  });

  const createMockVendor = (overrides: Partial<IUser> = {}): IUser => ({
    _id: '507f1f77bcf86cd799439011',
    isVendor: true,
    kontakt: {
      email: 'max@example.com',
      name: 'Max Mustermann',
      telefon: '',
      mailNewsletter: false,
      status: 'aktiv'
    },
    vendorProfile: {
      unternehmen: 'Test GmbH'
    },
    flourioSyncStatus: undefined,
    save: mockSave.mockResolvedValue(undefined),
    ...overrides
  } as unknown as IUser);

  describe('syncAllVendors', () => {
    it('should sync all unsynced vendors', async () => {
      const vendor1 = createMockVendor();
      const vendor2 = createMockVendor({
        _id: '507f1f77bcf86cd799439012',
        kontakt: {
          email: 'anna@example.com',
          name: 'Anna Schmidt',
          telefon: '',
          mailNewsletter: false,
          status: 'aktiv'
        }
      });

      mockFind.mockResolvedValue([vendor1, vendor2]);
      mockBusinessPartnerService.syncVendor = jest.fn().mockResolvedValue({});

      const result = await service.syncAllVendors();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockBusinessPartnerService.syncVendor).toHaveBeenCalledTimes(2);
    });

    it('should skip vendors with validation errors', async () => {
      const invalidVendor = createMockVendor({
        kontakt: {
          email: 'invalid@example.com',
          telefon: '',
          mailNewsletter: false,
          status: 'aktiv'
        } as any, // Name fehlt → Validierung schlägt fehl
        vendorProfile: {} as any // Kein Unternehmensname als Fallback
      });

      mockFind.mockResolvedValue([invalidVendor]);

      const result = await service.syncAllVendors();

      expect(result.skipped).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockBusinessPartnerService.syncVendor).not.toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const vendor = createMockVendor();
      mockFind.mockResolvedValue([vendor]);
      mockBusinessPartnerService.syncVendor = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));

      const result = await service.syncAllVendors();

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('API Error');
      expect(vendor.flourioSyncStatus).toBe('error');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should perform dry run without actual sync', async () => {
      const vendor = createMockVendor();
      mockFind.mockResolvedValue([vendor]);

      const result = await service.syncAllVendors({ dryRun: true });

      expect(result.synced).toBe(1);
      expect(mockBusinessPartnerService.syncVendor).not.toHaveBeenCalled();
    });

    it('should process in batches', async () => {
      const vendors = Array.from({ length: 25 }, (_, i) =>
        createMockVendor({
          _id: `vendor-${i}`,
          kontakt: {
            email: `vendor${i}@example.com`,
            name: `Vendor${i} Test`,
            telefon: '',
            mailNewsletter: false,
            status: 'aktiv'
          }
        })
      );

      mockFind.mockResolvedValue(vendors);
      mockBusinessPartnerService.syncVendor = jest.fn().mockResolvedValue({});

      const result = await service.syncAllVendors({ batchSize: 10 });

      expect(result.synced).toBe(25);
      expect(mockBusinessPartnerService.syncVendor).toHaveBeenCalledTimes(25);
    });

    it('should skip already synced vendors that have not changed', async () => {
      const vendor = createMockVendor({
        flourioSyncStatus: 'synced',
        flourioLastSyncAt: new Date('2025-01-01T12:00:00Z'),
        updatedAt: new Date('2025-01-01T10:00:00Z')
      });

      mockFind.mockResolvedValue([vendor]);

      const result = await service.syncAllVendors();

      expect(result.skipped).toBe(1);
      expect(mockBusinessPartnerService.syncVendor).not.toHaveBeenCalled();
    });
  });

  describe('syncVendorsByIds', () => {
    it('should sync specific vendors by IDs', async () => {
      const vendor1 = createMockVendor({ _id: 'id1' });
      const vendor2 = createMockVendor({ _id: 'id2' });

      mockFind.mockResolvedValue([vendor1, vendor2]);
      mockBusinessPartnerService.syncVendor = jest.fn().mockResolvedValue({});

      const result = await service.syncVendorsByIds(['id1', 'id2']);

      expect(result.synced).toBe(2);
      expect(mockBusinessPartnerService.syncVendor).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status summary', async () => {
      const vendors = [
        // 'synced' zählt nur, wenn sich seit dem letzten Sync nichts geändert hat
        createMockVendor({
          flourioSyncStatus: 'synced',
          flourioLastSyncAt: new Date('2025-01-01T12:00:00Z'),
          updatedAt: new Date('2025-01-01T10:00:00Z')
        }),
        createMockVendor({ flourioSyncStatus: 'pending' }),
        createMockVendor({ flourioSyncStatus: 'error' }),
        createMockVendor({ flourioSyncStatus: undefined })
      ];

      mockFind.mockResolvedValue(vendors);

      const result = await service.getSyncStatus();

      expect(result.total).toBe(4);
      expect(result.synced).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.error).toBe(1);
      expect(result.needsSync).toBe(1);
    });

    it('should detect vendors that need resync', async () => {
      const vendors = [
        createMockVendor({
          flourioSyncStatus: 'synced',
          flourioLastSyncAt: new Date('2025-01-01T10:00:00Z'),
          updatedAt: new Date('2025-01-01T12:00:00Z')
        })
      ];

      mockFind.mockResolvedValue(vendors);

      const result = await service.getSyncStatus();

      expect(result.needsSync).toBe(1);
      expect(result.synced).toBe(0);
    });
  });

  describe('retryFailedSyncs', () => {
    it('should retry vendors with error status', async () => {
      const vendor = createMockVendor({
        flourioSyncStatus: 'error',
        flourioSyncError: 'Previous error'
      });

      mockFind.mockResolvedValue([vendor]);
      mockBusinessPartnerService.syncVendor = jest.fn().mockResolvedValue({});

      const result = await service.retryFailedSyncs();

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockBusinessPartnerService.syncVendor).toHaveBeenCalledWith(vendor);
    });

    it('should handle persistent failures', async () => {
      const vendor = createMockVendor({ flourioSyncStatus: 'error' });

      mockFind.mockResolvedValue([vendor]);
      mockBusinessPartnerService.syncVendor = jest
        .fn()
        .mockRejectedValue(new Error('Persistent error'));

      const result = await service.retryFailedSyncs();

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Persistent error');
    });
  });
});
