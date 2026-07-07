/**
 * @file publicProductService.ts
 * @purpose Öffentliche Produktsuche für Käufer (F1 / T4.1): produktübergreifende
 *          Suche/Filter über die aktiven Produkte öffentlich sichtbarer Vendors.
 * @created 2026-07-07
 *
 * Liefert ausschließlich öffentlich unbedenkliche Felder. Sichtbar sind nur
 * Produkte (isActive) von Vendors mit isPubliclyVisible + aktivem Status.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import { Product } from '../models/Product';

export interface PublicProductFilters {
  q?: string;                 // Volltext (name/description/keywords)
  categories?: string[];      // Tag-IDs
  availability?: string;      // available | seasonal | out_of_stock | preorder
  location?: string;          // Ort (Teilstring, case-insensitive) des Vendors
  page?: number;
  limit?: number;
}

const PUBLIC_PROJECTION = 'name shortDescription price priceUnit availability images slug tags vendorId';

export async function searchPublicProducts(filters: PublicProductFilters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  // 1. Öffentlich sichtbare Vendors ermitteln (+ optional nach Ort filtern).
  const vendors: any[] = await User.find({
    isVendor: true,
    isPubliclyVisible: true,
    'kontakt.status': 'aktiv',
    registrationStatus: { $in: ['trial_active', 'active'] }
  }).select('_id vendorProfile.unternehmen kontakt.name adressen').lean();

  let visible = vendors;
  if (filters.location) {
    const loc = filters.location.toLowerCase();
    visible = vendors.filter(v =>
      (v.adressen || []).some((a: any) => (a.ort || '').toLowerCase().includes(loc))
    );
  }

  const vendorIds = visible.map(v => v._id);
  const vendorMap = new Map<string, { id: string; name: string; ort?: string }>(
    visible.map(v => [String(v._id), {
      id: String(v._id),
      name: v.vendorProfile?.unternehmen || v.kontakt?.name || 'Direktvermarkter',
      ort: v.adressen?.[0]?.ort
    }])
  );

  if (vendorIds.length === 0) {
    return { products: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  // 2. Produktquery.
  const query: Record<string, any> = { isActive: true, vendorId: { $in: vendorIds } };
  if (filters.categories?.length) {
    query.tags = { $in: filters.categories.filter(mongoose.isValidObjectId).map(id => new mongoose.Types.ObjectId(id)) };
  }
  if (filters.availability) query.availability = filters.availability;

  let productsQuery;
  if (filters.q && filters.q.trim()) {
    query.$text = { $search: filters.q.trim() };
    productsQuery = Product.find(query, { score: { $meta: 'textScore' } })
      .select(PUBLIC_PROJECTION)
      .sort({ score: { $meta: 'textScore' } });
  } else {
    productsQuery = Product.find(query).select(PUBLIC_PROJECTION).sort({ featured: -1, createdAt: -1 });
  }

  const [products, total] = await Promise.all([
    productsQuery.skip(skip).limit(limit).lean(),
    Product.countDocuments(query)
  ]);

  const enriched = products.map((p: any) => ({
    ...p,
    vendor: vendorMap.get(String(p.vendorId)) || null
  }));

  return {
    products: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}
