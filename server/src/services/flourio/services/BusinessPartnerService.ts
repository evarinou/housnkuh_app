/**
 * @file BusinessPartnerService.ts
 * @purpose CRUD operations for FlourIO BusinessPartner entities
 * @created 2025-10-16
 */

import { FlourioClient } from '../client/FlourioClient';
import { BusinessPartnerMapper } from './businessPartnerMapping';
import type {
  BusinessPartner,
  BusinessPartnerQueryParams,
  PaginatedResponse
} from '../generated/api-types';
import type { IUser } from '../../../types/modelTypes';

export class BusinessPartnerService {
  constructor(private client: FlourioClient) {}

  /**
   * Create BusinessPartner in FlourIO from housnkuh vendor
   */
  async createFromVendor(vendor: IUser): Promise<BusinessPartner> {
    // Validate vendor data
    const errors = BusinessPartnerMapper.validateVendorForSync(vendor);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Map vendor to BusinessPartner
    const partnerData = BusinessPartnerMapper.vendorToBusinessPartner(vendor);

    // Create in FlourIO
    const partner = await this.client.post<BusinessPartner>(
      '/businesspartners',
      partnerData
    );

    // Update vendor with FlourIO reference
    vendor.flourioPartnerId = partner.id;
    vendor.flourioSyncStatus = 'synced';
    vendor.flourioLastSyncAt = new Date();
    await vendor.save();

    return partner;
  }

  /**
   * Update BusinessPartner in FlourIO from housnkuh vendor
   */
  async updateFromVendor(vendor: IUser): Promise<BusinessPartner> {
    if (!vendor.flourioPartnerId) {
      throw new Error('Vendor not synced to FlourIO yet. Use createFromVendor first.');
    }

    // Validate vendor data
    const errors = BusinessPartnerMapper.validateVendorForSync(vendor);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Map vendor to update DTO
    const updateData = BusinessPartnerMapper.vendorToUpdateDto(vendor);

    // Update in FlourIO
    const partner = await this.client.patch<BusinessPartner>(
      `/businesspartners/${vendor.flourioPartnerId}`,
      updateData
    );

    // Update sync metadata
    vendor.flourioSyncStatus = 'synced';
    vendor.flourioLastSyncAt = new Date();
    vendor.flourioSyncError = undefined;
    await vendor.save();

    return partner;
  }

  /**
   * Sync vendor (create or update based on sync status)
   */
  async syncVendor(vendor: IUser): Promise<BusinessPartner> {
    if (vendor.flourioPartnerId) {
      return this.updateFromVendor(vendor);
    } else {
      return this.createFromVendor(vendor);
    }
  }

  /**
   * Get BusinessPartner by ID from FlourIO
   */
  async get(partnerId: string): Promise<BusinessPartner> {
    return this.client.get<BusinessPartner>(`/businesspartners/${partnerId}`);
  }

  /**
   * List BusinessPartners from FlourIO
   */
  async list(params?: BusinessPartnerQueryParams): Promise<BusinessPartner[]> {
    const response = await this.client.get<BusinessPartner[]>(
      '/businesspartners',
      { params }
    );
    return response;
  }

  /**
   * List BusinessPartners with pagination
   */
  async listPaginated(
    params?: BusinessPartnerQueryParams
  ): Promise<PaginatedResponse<BusinessPartner>> {
    return this.client.get<PaginatedResponse<BusinessPartner>>(
      '/businesspartners',
      { params }
    );
  }

  /**
   * Delete BusinessPartner from FlourIO
   */
  async delete(partnerId: string): Promise<void> {
    await this.client.delete(`/businesspartners/${partnerId}`);
  }

  /**
   * Delete and unlink BusinessPartner from vendor
   */
  async deleteAndUnlink(vendor: IUser): Promise<void> {
    if (!vendor.flourioPartnerId) {
      throw new Error('Vendor not synced to FlourIO');
    }

    try {
      await this.delete(vendor.flourioPartnerId);
    } catch (error: any) {
      // If partner doesn't exist in FlourIO, that's ok
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    // Unlink from vendor
    vendor.flourioPartnerId = undefined;
    vendor.flourioSyncStatus = 'deleted';
    vendor.flourioLastSyncAt = new Date();
    await vendor.save();
  }

  /**
   * Check if vendor needs sync (data changed since last sync)
   */
  needsSync(vendor: IUser): boolean {
    return BusinessPartnerMapper.hasVendorChanged(vendor);
  }
}
