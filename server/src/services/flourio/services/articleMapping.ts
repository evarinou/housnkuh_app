/**
 * @file articleMapping.ts
 * @purpose Maps housnkuh Product model to FlourIO Article API format
 * @created 2025-10-16
 * @modified 2025-01-13 - Migrated to tag-based categories
 */

import mongoose from 'mongoose';
import { IProduct } from '../../../models/Product';
import { ITag } from '../../../models/Tag';
import { Article, CreateArticleDto, UpdateArticleDto } from '../generated/api-types';
import { getVatRate } from '../config/vatMapping';
import { flourioTenantConfig } from '../client/config';
import crypto from 'crypto';

/**
 * Get all tag names for a product
 * @param product - Product with tags array of ObjectIds
 * @returns Array of tag names (strings)
 */
export async function getProductTagNames(product: IProduct): Promise<string[]> {
  const Tag = mongoose.model('Tag');

  // Handle case where product has no tags
  if (!product.tags || product.tags.length === 0) {
    return [];
  }

  // Fetch tags from database
  const tags = await Tag.find({
    _id: { $in: product.tags }
  })
  .select('name')
  .lean<ITag[]>();

  // Extract names and filter out null/undefined
  return tags.map(t => t.name).filter(name => name);
}

/**
 * Generate SKU from Product data
 * Format: VENDOR-FIRSTTAG-HASH(name) or VENDOR-HASH(name) if no tags
 */
export async function generateSKU(product: IProduct): Promise<string> {
  const tagNames = await getProductTagNames(product);

  const vendorPrefix = product.vendorId.toString().substring(0, 8);
  const tagPrefix = tagNames.length > 0
    ? tagNames[0].substring(0, 3).toUpperCase()
    : 'GEN'; // Generic prefix if no tags
  const nameHash = crypto.createHash('md5').update(product.name).digest('hex').substring(0, 6);

  return `${vendorPrefix}-${tagPrefix}-${nameHash}`.toUpperCase();
}

/**
 * Get VAT rate for product
 * Uses config-based VAT mapping from first product tag, or default 19%
 */
export async function getVatRateForProduct(product: IProduct): Promise<number> {
  const tagNames = await getProductTagNames(product);

  // Use first tag for VAT rate mapping, or default 19%
  const firstTag = tagNames.length > 0 ? tagNames[0] : 'default';
  return getVatRate(firstTag);
}

/**
 * Map Product to Flourio CreateArticle DTO.
 *
 * Flourio Article format (discovered from live API):
 * - `title` (not `name`)
 * - `number` (not `sku`)
 * - `taxassignment` (required, tenant-specific ID)
 * - `sale` array with price + pricelist reference
 * - `tags` as string array (auto-created by Flourio)
 * - No stock/minStock — managed via StockItemEntries
 */
export async function mapProductToCreateArticle(product: IProduct): Promise<Record<string, any>> {
  const tagNames = await getProductTagNames(product);
  const vatRate = product.taxRate || await getVatRateForProduct(product);
  const sku = await generateSKU(product);

  const taxassignment = vatRate <= 7
    ? flourioTenantConfig.defaultTaxassignmentReduced
    : flourioTenantConfig.defaultTaxassignmentFull;

  return {
    title: product.name,
    description: product.description || '',
    number: sku,
    taxassignment,
    tags: tagNames,
    images: product.images || [],
    sale: [{
      price: product.price || 0,
      pricelist: flourioTenantConfig.defaultPricelistId
    }]
  };
}

/**
 * Map Product to Flourio UpdateArticle DTO.
 */
export async function mapProductToUpdateArticle(product: IProduct, articleId: string): Promise<Record<string, any>> {
  const tagNames = await getProductTagNames(product);
  const vatRate = product.taxRate || await getVatRateForProduct(product);

  const taxassignment = vatRate <= 7
    ? flourioTenantConfig.defaultTaxassignmentReduced
    : flourioTenantConfig.defaultTaxassignmentFull;

  return {
    title: product.name,
    description: product.description || '',
    taxassignment,
    tags: tagNames,
    images: product.images || [],
    sale: [{
      price: product.price || 0,
      pricelist: flourioTenantConfig.defaultPricelistId
    }]
  };
}

/**
 * Map FlourIO Article to Product update data
 * Used when syncing from FlourIO → housnkuh
 * Note: Category is handled via tags, not included in update data
 */
export function mapArticleToProduct(article: Article): Partial<IProduct> {
  return {
    name: article.name,
    description: article.description,
    price: article.price,
    priceUnit: article.unit as any,
    // Category is handled via tags, not direct field
    images: article.images || [],
  };
}

/**
 * Check if Product data has changed compared to Article
 * Note: Category comparison requires async tag lookup, done separately if needed
 */
export function hasProductChanged(product: IProduct, article: Article): boolean {
  return (
    product.name !== article.name ||
    product.description !== article.description ||
    product.price !== article.price ||
    product.priceUnit !== article.unit ||
    // Category comparison removed - use separate async function if needed
    JSON.stringify(product.images) !== JSON.stringify(article.images || [])
  );
}

/**
 * Validate Product for Article sync
 * Checks for required fields (tags are optional - FlourIO auto-creates them)
 */
export async function validateProductForSync(product: IProduct): Promise<string[]> {
  const errors: string[] = [];

  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (product.price === undefined || product.price === null || product.price < 0) {
    errors.push('Product price must be >= 0');
  }

  if (!product.priceUnit) {
    errors.push('Product price unit is required');
  }

  if (!product.vendorId) {
    errors.push('Product vendorId is required');
  }

  // Tags are optional - FlourIO will auto-create them

  return errors;
}
