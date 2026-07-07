/**
 * @file businessPartnerMapping.test.ts
 * @purpose Unit tests for BusinessPartner mapping logic
 * @created 2025-10-16
 */

import { BusinessPartnerMapper } from './businessPartnerMapping';
import type { IUser } from '../../../types/modelTypes';
import type { BusinessPartner } from '../generated/api-types';

// Deterministische Tenant-Config für pricelist/tax-IDs (sonst aus .env)
jest.mock('../client/config', () => ({
  flourioTenantConfig: {
    defaultPricelistId: 'pricelist-test-id',
    defaultRevenueCreditorId: 'revenue-creditor-test-id'
  }
}));

describe('BusinessPartnerMapper', () => {
  describe('vendorToBusinessPartner', () => {
    it('should map vendor to BusinessPartner DTO', () => {
      const mockVendor = {
        _id: '507f1f77bcf86cd799439011',
        isVendor: true,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          telefon: '+49123456789',
          mailNewsletter: false,
          status: 'aktiv'
        },
        adressen: [{
          adresstyp: 'Hauptadresse',
          strasse: 'Hauptstr.',
          hausnummer: '123',
          plz: '12345',
          ort: 'Berlin',
          name1: 'Max Mustermann',
          name2: 'Hinterhaus'
        }],
        vendorProfile: {
          unternehmen: 'Mustermann GmbH'
        }
      } as unknown as IUser;

      const result = BusinessPartnerMapper.vendorToBusinessPartner(mockVendor);

      // Flourio-Vertrag: type 'business' + isCreditor, Adresse als billingAddress
      expect(result.type).toBe('business');
      expect(result.isCreditor).toBe(true);
      expect(result.billingAddress).toEqual({
        company1: 'Mustermann GmbH',
        firstName: 'Max',
        lastName: 'Mustermann',
        street: 'Hauptstr.',
        streetNumber: '123',
        zipCode: '12345',
        city: 'Berlin',
        country: 'DE'
      });
      expect(result.pricelist).toBe('pricelist-test-id');
      expect(result.tax).toEqual({ revenueCreditor: 'revenue-creditor-test-id' });
    });

    it('should use full name as company name if no business name', () => {
      const mockVendor = {
        isVendor: true,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        },
        adressen: [],
        vendorProfile: {}
      } as unknown as IUser;

      const result = BusinessPartnerMapper.vendorToBusinessPartner(mockVendor);

      expect(result.billingAddress.company1).toBe('Max Mustermann');
    });

    it('should throw error if user is not a vendor', () => {
      const mockUser = {
        isVendor: false,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        }
      } as unknown as IUser;

      expect(() => {
        BusinessPartnerMapper.vendorToBusinessPartner(mockUser);
      }).toThrow('User is not a vendor');
    });
  });

  describe('businessPartnerToVendor', () => {
    it('should map BusinessPartner to vendor update data', () => {
      const mockPartner: BusinessPartner = {
        id: 'flourio-123',
        type: 'supplier',
        companyName: 'Test GmbH',
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@example.com',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      const result = BusinessPartnerMapper.businessPartnerToVendor(mockPartner);

      expect(result.flourioPartnerId).toBe('flourio-123');
      expect(result.flourioSyncStatus).toBe('synced');
      expect(result.flourioLastSyncAt).toBeInstanceOf(Date);
    });
  });

  describe('vendorToUpdateDto', () => {
    it('should create update DTO with FlourIO ID', () => {
      const mockVendor = {
        isVendor: true,
        flourioPartnerId: 'flourio-123',
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        },
        adressen: [],
        vendorProfile: {
          unternehmen: 'Test GmbH'
        }
      } as unknown as IUser;

      const result = BusinessPartnerMapper.vendorToUpdateDto(mockVendor);

      // Die ID wandert in die URL (PATCH /businesspartners/:id), nicht ins DTO
      expect(result.type).toBe('business');
      expect(result.billingAddress.company1).toBe('Test GmbH');
    });

    it('should throw error if vendor not synced yet', () => {
      const mockVendor = {
        isVendor: true,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        }
      } as unknown as IUser;

      expect(() => {
        BusinessPartnerMapper.vendorToUpdateDto(mockVendor);
      }).toThrow('Vendor not synced to FlourIO yet');
    });
  });

  describe('validateVendorForSync', () => {
    it('should return no errors for valid vendor', () => {
      const mockVendor = {
        isVendor: true,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        },
        vendorProfile: {
          unternehmen: 'Test GmbH'
        }
      } as unknown as IUser;

      const errors = BusinessPartnerMapper.validateVendorForSync(mockVendor);

      expect(errors).toHaveLength(0);
    });

    it('should return error if not a vendor', () => {
      const mockUser = {
        isVendor: false,
        kontakt: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        }
      } as unknown as IUser;

      const errors = BusinessPartnerMapper.validateVendorForSync(mockUser);

      expect(errors).toContain('User must be a vendor');
    });

    it('should return error if kontakt missing', () => {
      const mockVendor = {
        isVendor: true
      } as unknown as IUser;

      const errors = BusinessPartnerMapper.validateVendorForSync(mockVendor);

      expect(errors).toContain('Kontakt information is required');
    });

    it('should return errors for missing kontakt fields', () => {
      const mockVendor = {
        isVendor: true,
        kontakt: {
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        } as any,
        vendorProfile: {}
      } as unknown as IUser;

      const errors = BusinessPartnerMapper.validateVendorForSync(mockVendor);

      expect(errors).toContain('Name is required');
    });

    it('should require either business name or contact name', () => {
      const mockVendor = {
        isVendor: true,
        kontakt: {
          email: 'max@example.com',
          mailNewsletter: false,
          status: 'aktiv'
        } as any,
        vendorProfile: {}
      } as unknown as IUser;

      const errors = BusinessPartnerMapper.validateVendorForSync(mockVendor);

      expect(errors).toContain('Either business name or contact name is required');
    });
  });

  describe('hasVendorChanged', () => {
    it('should return true if never synced', () => {
      const mockVendor = {
        isVendor: true
      } as unknown as IUser;

      const result = BusinessPartnerMapper.hasVendorChanged(mockVendor);

      expect(result).toBe(true);
    });

    it('should return false if not updated since last sync', () => {
      const lastSync = new Date('2025-01-01T12:00:00Z');
      const updated = new Date('2025-01-01T10:00:00Z');

      const mockVendor = {
        isVendor: true,
        flourioLastSyncAt: lastSync,
        updatedAt: updated
      } as unknown as IUser;

      const result = BusinessPartnerMapper.hasVendorChanged(mockVendor);

      expect(result).toBe(false);
    });

    it('should return true if updated after last sync', () => {
      const lastSync = new Date('2025-01-01T10:00:00Z');
      const updated = new Date('2025-01-01T12:00:00Z');

      const mockVendor = {
        isVendor: true,
        flourioLastSyncAt: lastSync,
        updatedAt: updated
      } as unknown as IUser;

      const result = BusinessPartnerMapper.hasVendorChanged(mockVendor);

      expect(result).toBe(true);
    });
  });
});
