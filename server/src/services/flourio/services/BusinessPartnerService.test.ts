/**
 * @file BusinessPartnerService.test.ts
 * @purpose Unit tests for BusinessPartnerService
 * @created 2025-10-16
 */

import { BusinessPartnerService } from './BusinessPartnerService';
import { FlourioClient } from '../client/FlourioClient';
import type { IUser } from '../../../types/modelTypes';
import type { BusinessPartner } from '../generated/api-types';

// Mock FlourioClient
jest.mock('../client/FlourioClient');

describe('BusinessPartnerService', () => {
  let service: BusinessPartnerService;
  let mockClient: jest.Mocked<FlourioClient>;
  let mockVendor: IUser;

  beforeEach(() => {
    mockClient = new FlourioClient({} as any) as jest.Mocked<FlourioClient>;
    service = new BusinessPartnerService(mockClient);

    mockVendor = {
      _id: '507f1f77bcf86cd799439011',
      isVendor: true,
      kontakt: {
        vorname: 'Max',
        nachname: 'Mustermann',
        email: 'max@example.com',
        telefon: '+49123456789',
        name: 'Max Mustermann',
        mailNewsletter: false,
        status: 'aktiv'
      },
      adressen: [{
        adresstyp: 'Hauptadresse',
        strasse: 'Hauptstr.',
        hausnummer: '123',
        plz: '12345',
        ort: 'Berlin',
        name1: 'Max Mustermann'
      }],
      vendorProfile: {
        unternehmen: 'Mustermann GmbH'
      },
      save: jest.fn().mockResolvedValue(undefined)
    } as unknown as IUser;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFromVendor', () => {
    it('should create BusinessPartner and update vendor', async () => {
      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Mustermann GmbH',
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockClient.post = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.createFromVendor(mockVendor);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/businesspartners',
        expect.objectContaining({
          type: 'business',
          isCreditor: true,
          billingAddress: expect.objectContaining({
            company1: 'Mustermann GmbH'
          })
        })
      );
      expect(result).toEqual(mockPartner);
      expect(mockVendor.flourioPartnerId).toBe('flourio-123');
      expect(mockVendor.flourioSyncStatus).toBe('synced');
      expect(mockVendor.flourioLastSyncAt).toBeInstanceOf(Date);
      expect(mockVendor.save).toHaveBeenCalled();
    });

    it('should throw error if validation fails', async () => {
      const invalidVendor = {
        isVendor: false,
        save: jest.fn()
      } as unknown as IUser;

      await expect(service.createFromVendor(invalidVendor))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('updateFromVendor', () => {
    it('should update BusinessPartner in FlourIO', async () => {
      mockVendor.flourioPartnerId = 'flourio-123';

      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Mustermann GmbH',
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockClient.patch = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.updateFromVendor(mockVendor);

      // ID steht in der URL, nicht im DTO; DTO folgt dem Flourio-Vertrag
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/businesspartners/flourio-123',
        expect.objectContaining({
          type: 'business',
          billingAddress: expect.objectContaining({
            company1: 'Mustermann GmbH'
          })
        })
      );
      expect(result).toEqual(mockPartner);
      expect(mockVendor.flourioSyncStatus).toBe('synced');
      expect(mockVendor.flourioSyncError).toBeUndefined();
      expect(mockVendor.save).toHaveBeenCalled();
    });

    it('should throw error if vendor not synced yet', async () => {
      await expect(service.updateFromVendor(mockVendor))
        .rejects.toThrow('Vendor not synced to FlourIO yet');
    });
  });

  describe('syncVendor', () => {
    it('should create if not synced', async () => {
      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Mustermann GmbH',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockClient.post = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.syncVendor(mockVendor);

      expect(mockClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockPartner);
    });

    it('should update if already synced', async () => {
      mockVendor.flourioPartnerId = 'flourio-123';

      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Mustermann GmbH',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockClient.patch = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.syncVendor(mockVendor);

      expect(mockClient.patch).toHaveBeenCalled();
      expect(result).toEqual(mockPartner);
    });
  });

  describe('get', () => {
    it('should fetch BusinessPartner by ID', async () => {
      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Test GmbH',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      mockClient.get = jest.fn().mockResolvedValue(mockPartner);

      const result = await service.get('flourio-123');

      expect(mockClient.get).toHaveBeenCalledWith('/businesspartners/flourio-123');
      expect(result).toEqual(mockPartner);
    });
  });

  describe('list', () => {
    it('should list BusinessPartners', async () => {
      const mockPartners: BusinessPartner[] = [
        {
          id: 'flourio-123',
          type: 'supplier',
          companyName: 'Test GmbH',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ];

      mockClient.get = jest.fn().mockResolvedValue(mockPartners);

      const result = await service.list({ type: 'supplier' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/businesspartners',
        { params: { type: 'supplier' } }
      );
      expect(result).toEqual(mockPartners);
    });
  });

  describe('delete', () => {
    it('should delete BusinessPartner', async () => {
      mockClient.delete = jest.fn().mockResolvedValue(undefined);

      await service.delete('flourio-123');

      expect(mockClient.delete).toHaveBeenCalledWith('/businesspartners/flourio-123');
    });
  });

  describe('deleteAndUnlink', () => {
    it('should delete BusinessPartner and unlink from vendor', async () => {
      mockVendor.flourioPartnerId = 'flourio-123';
      mockClient.delete = jest.fn().mockResolvedValue(undefined);

      await service.deleteAndUnlink(mockVendor);

      expect(mockClient.delete).toHaveBeenCalledWith('/businesspartners/flourio-123');
      expect(mockVendor.flourioPartnerId).toBeUndefined();
      expect(mockVendor.flourioSyncStatus).toBe('deleted');
      expect(mockVendor.save).toHaveBeenCalled();
    });

    it('should handle 404 errors gracefully', async () => {
      mockVendor.flourioPartnerId = 'flourio-123';
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = { status: 404 };
      mockClient.delete = jest.fn().mockRejectedValue(notFoundError);

      await service.deleteAndUnlink(mockVendor);

      expect(mockVendor.flourioPartnerId).toBeUndefined();
      expect(mockVendor.flourioSyncStatus).toBe('deleted');
    });

    it('should throw error if vendor not synced', async () => {
      await expect(service.deleteAndUnlink(mockVendor))
        .rejects.toThrow('Vendor not synced to FlourIO');
    });
  });

  describe('needsSync', () => {
    it('should return true if vendor changed', () => {
      mockVendor.flourioLastSyncAt = new Date('2025-01-01T10:00:00Z');
      mockVendor.updatedAt = new Date('2025-01-01T12:00:00Z');

      const result = service.needsSync(mockVendor);

      expect(result).toBe(true);
    });

    it('should return false if vendor not changed', () => {
      mockVendor.flourioLastSyncAt = new Date('2025-01-01T12:00:00Z');
      mockVendor.updatedAt = new Date('2025-01-01T10:00:00Z');

      const result = service.needsSync(mockVendor);

      expect(result).toBe(false);
    });
  });
});
