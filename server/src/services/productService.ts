/**
 * @file productService.ts
 * @purpose Shared product create/update core used by vendor and admin controllers
 * @created 2026-06-10
 *
 * Slug- und EAN-Generierung passieren ausschließlich im pre-save Hook
 * des Product-Models — hier wird nur das Feld-Whitelisting gebündelt.
 */

import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';

export interface ProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  priceUnit?: string;
  taxRate?: number;
  tags?: string[];
  images?: string[];
  availability?: string;
  minimumQuantity?: number;
  seasonalInfo?: unknown;
  bulkPricing?: unknown[];
  keywords?: string[];
}

/**
 * Create a product owned by the given vendor.
 * Caller is responsible for authorization (ownership / admin rights).
 */
export async function createProductForVendor(
  vendorId: string,
  data: ProductInput
): Promise<IProduct> {
  return Product.create({
    vendorId,
    name: data.name,
    description: data.description,
    shortDescription: data.shortDescription,
    price: data.price,
    priceUnit: data.priceUnit,
    taxRate: data.taxRate,
    tags: data.tags || [],
    images: data.images || [],
    availability: data.availability || 'available',
    minimumQuantity: data.minimumQuantity || 1,
    seasonalInfo: data.seasonalInfo,
    bulkPricing: data.bulkPricing,
    keywords: data.keywords || [],
    isActive: true
  });
}

/**
 * Apply partial updates to a product (only fields present in data).
 * Does NOT save — caller decides when to persist (post-save hook triggers
 * the Flourio re-sync).
 */
export function applyProductUpdates(product: IProduct, data: ProductInput): void {
  if (data.name !== undefined) product.name = data.name;
  if (data.description !== undefined) product.description = data.description;
  if (data.shortDescription !== undefined) product.shortDescription = data.shortDescription;
  if (data.price !== undefined) product.price = data.price;
  if (data.priceUnit !== undefined) product.priceUnit = data.priceUnit;
  if (data.taxRate !== undefined) product.taxRate = data.taxRate;
  if (data.tags !== undefined) product.tags = data.tags as unknown as mongoose.Types.ObjectId[];
  if (data.images !== undefined) product.images = data.images;
  if (data.availability !== undefined) product.availability = data.availability as IProduct['availability'];
  if (data.minimumQuantity !== undefined) product.minimumQuantity = data.minimumQuantity;
  if (data.seasonalInfo !== undefined) product.seasonalInfo = data.seasonalInfo as IProduct['seasonalInfo'];
  if (data.bulkPricing !== undefined) product.bulkPricing = data.bulkPricing as IProduct['bulkPricing'];
  if (data.keywords !== undefined) product.keywords = data.keywords;
}

/** Load a product with populated tags for API responses. */
export function findPopulatedProduct(id: string) {
  return Product.findById(id).populate('tags', 'name color slug').lean();
}
