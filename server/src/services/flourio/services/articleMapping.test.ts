/**
 * @file articleMapping.test.ts
 * @purpose Unit tests for articleMapping service
 * @created 2025-11-14
 */

import mongoose from 'mongoose';
import type { IProduct } from '../../../models/Product';
import {
  getProductTagNames,
  mapProductToCreateArticle,
  mapProductToUpdateArticle,
  toPublicImageUrls
} from './articleMapping';

// Mock mongoose model
jest.mock('mongoose', () => ({
  model: jest.fn()
}));

const mockTagModel = {
  find: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  (mongoose.model as jest.Mock).mockReturnValue(mockTagModel);
});

describe('getProductTagNames', () => {
  it('should return all tag names for product with multiple tags', async () => {
    const mockTags = [
      { name: 'Obst' },
      { name: 'Bio' }
    ];
    mockTagModel.lean.mockResolvedValue(mockTags);

    const product = {
      tags: ['tag1', 'tag2']
    } as unknown as IProduct;

    const names = await getProductTagNames(product);

    expect(mockTagModel.find).toHaveBeenCalledWith({ _id: { $in: ['tag1', 'tag2'] } });
    expect(mockTagModel.select).toHaveBeenCalledWith('name');
    expect(names).toEqual(['Obst', 'Bio']);
  });

  it('should return empty array for product without tags', async () => {
    const product = {
      tags: []
    } as unknown as IProduct;

    const names = await getProductTagNames(product);

    expect(mockTagModel.find).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  it('should filter out tags with null/undefined names', async () => {
    const mockTags = [
      { name: 'Obst' },
      { name: null },
      { name: 'Bio' }
    ];
    mockTagModel.lean.mockResolvedValue(mockTags);

    const product = {
      tags: ['tag1', 'tag2', 'tag3']
    } as unknown as IProduct;

    const names = await getProductTagNames(product);

    expect(names).toEqual(['Obst', 'Bio']);
  });
});

describe('EAN mapping to flour.io DTOs', () => {
  const baseProduct = {
    name: 'Bio-Äpfel',
    description: 'Knackig',
    price: 4.5,
    taxRate: 7,
    tags: [], // keine Tags → kein Tag-Lookup nötig
    images: [],
    vendorId: { toString: () => '507f1f77bcf86cd799439011' }
  };

  it('includes the product EAN in the create DTO', async () => {
    const product = { ...baseProduct, ean: '2200000000019' } as unknown as IProduct;
    const dto = await mapProductToCreateArticle(product);
    expect(dto.ean).toBe('2200000000019');
  });

  it('includes the product EAN in the update DTO (needed for backfill re-sync)', async () => {
    const product = { ...baseProduct, ean: '2200000000019' } as unknown as IProduct;
    const dto = await mapProductToUpdateArticle(product, 'article-1');
    expect(dto.ean).toBe('2200000000019');
  });

  it('omits the ean key entirely when the product has none', async () => {
    const product = { ...baseProduct } as unknown as IProduct;
    const createDto = await mapProductToCreateArticle(product);
    const updateDto = await mapProductToUpdateArticle(product, 'article-1');
    expect('ean' in createDto).toBe(false);
    expect('ean' in updateDto).toBe(false);
  });
});

describe('toPublicImageUrls', () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('keeps absolute URLs and drops base64 data URLs', () => {
    process.env = { ...ORIGINAL_ENV, PUBLIC_SERVER_URL: '' , FRONTEND_URL: '' };
    expect(toPublicImageUrls([
      'https://cdn.example.com/a.jpg',
      'data:image/png;base64,AAAA'
    ])).toEqual(['https://cdn.example.com/a.jpg']);
  });

  it('prefixes /uploads paths with PUBLIC_SERVER_URL', () => {
    process.env = { ...ORIGINAL_ENV, PUBLIC_SERVER_URL: 'https://housnkuh.de/' };
    expect(toPublicImageUrls(['/uploads/product-images/x.png']))
      .toEqual(['https://housnkuh.de/uploads/product-images/x.png']);
  });

  it('drops relative paths when no public host is configured', () => {
    process.env = { ...ORIGINAL_ENV, PUBLIC_SERVER_URL: '', FRONTEND_URL: '' };
    expect(toPublicImageUrls(['/uploads/product-images/x.png'])).toEqual([]);
  });
});
