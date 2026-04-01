/**
 * @file businessPartnerMapping.ts
 * @purpose Bidirectional mapping between housnkuh Vendor/User and FlourIO BusinessPartner
 * @created 2025-10-16
 */

import type { IUser } from '../../../types/modelTypes';
import { Tag } from '../../../models/Tag';
import { flourioTenantConfig } from '../client/config';

/**
 * Maps housnkuh vendor data to FlourIO BusinessPartner format.
 *
 * Flourio BusinessPartner uses:
 * - billingAddress (not address) with company1, streetNumber, zipCode
 * - type: 'business' with isCreditor: true for suppliers
 * - pricelist (required) and tax.revenueCreditor (required) as tenant-specific IDs
 */
export class BusinessPartnerMapper {
  /**
   * Convert housnkuh User/Vendor to FlourIO CreateBusinessPartnerDto
   */
  static vendorToBusinessPartner(vendor: IUser): Record<string, any> {
    if (!vendor.isVendor) {
      throw new Error('User is not a vendor');
    }

    const kontakt = vendor.kontakt;
    const adresse = vendor.adressen?.[0];
    const profile = vendor.vendorProfile;

    const nameParts = kontakt.name?.split(' ') || ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      type: 'business',
      isCreditor: true,
      billingAddress: {
        company1: profile?.unternehmen || kontakt.name || '',
        firstName,
        lastName,
        street: adresse?.strasse || '',
        streetNumber: adresse?.hausnummer || '',
        zipCode: adresse?.plz || '',
        city: adresse?.ort || '',
        country: 'DE'
      },
      pricelist: flourioTenantConfig.defaultPricelistId,
      tax: {
        revenueCreditor: flourioTenantConfig.defaultRevenueCreditorId
      }
    };
  }

  /**
   * Resolve vendor profile tag ObjectIds to tag name strings for Flourio.
   * Call this separately since it's async (DB query).
   */
  static async resolveVendorTags(vendor: IUser): Promise<string[]> {
    const allTagIds = [
      ...(vendor.vendorProfile?.tags || []),
      ...(vendor.vendorProfile?.businessDetails?.certifications || []),
      ...(vendor.vendorProfile?.businessDetails?.productionMethods || [])
    ];

    if (allTagIds.length === 0) return [];

    const tags = await Tag.find({ _id: { $in: allTagIds } }).select('name').lean();
    return tags.map((t: any) => t.name);
  }

  /**
   * Convert FlourIO BusinessPartner to housnkuh vendor update data
   */
  static businessPartnerToVendor(partner: { id: string }): Partial<IUser> {
    return {
      flourioPartnerId: partner.id,
      flourioSyncStatus: 'synced',
      flourioLastSyncAt: new Date(),
      // We don't update vendor data from FlourIO for now
      // Only track the FlourIO reference
    };
  }

  /**
   * Create update DTO from vendor changes
   */
  static vendorToUpdateDto(vendor: IUser): Record<string, any> {
    if (!vendor.flourioPartnerId) {
      throw new Error('Vendor not synced to FlourIO yet');
    }

    return this.vendorToBusinessPartner(vendor);
  }

  /**
   * Validate vendor data before sync
   */
  static validateVendorForSync(vendor: IUser): string[] {
    const errors: string[] = [];

    if (!vendor.isVendor) {
      errors.push('User must be a vendor');
    }

    if (!vendor.kontakt) {
      errors.push('Kontakt information is required');
    } else {
      if (!vendor.kontakt.name) errors.push('Name is required');
      if (!vendor.kontakt.email) errors.push('Email is required');
    }

    if (!vendor.vendorProfile?.unternehmen && !vendor.kontakt?.name) {
      errors.push('Either business name or contact name is required');
    }

    return errors;
  }

  /**
   * Check if vendor data has changed since last sync
   */
  static hasVendorChanged(vendor: IUser): boolean {
    if (!vendor.flourioLastSyncAt) return true;
    if (!vendor.updatedAt) return false;

    return vendor.updatedAt > vendor.flourioLastSyncAt;
  }
}
