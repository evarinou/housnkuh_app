/**
 * @file ArticleService.test.ts
 * @purpose Tests for ArticleService
 * @created 2025-10-16
 */

import { ArticleService } from './ArticleService';
import { FlourioClient } from '../client/FlourioClient';
import { IProduct } from '../../../models/Product';
import mongoose from 'mongoose';
import * as articleMapping from './articleMapping';

jest.mock('../client/FlourioClient');
jest.mock('./articleMapping');

describe('ArticleService', () => {
  let service: ArticleService;
  let mockClient: jest.Mocked<FlourioClient>;

  beforeEach(() => {
    mockClient = new FlourioClient({
      baseURL: 'https://test.api',
      bearerToken: 'test-token'
    }) as jest.Mocked<FlourioClient>;

    service = new ArticleService(mockClient);

    jest.clearAllMocks();
  });

  const createMockProduct = (overrides?: Partial<IProduct>): IProduct => {
    return {
      _id: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      description: 'Test Description',
      category: 'vegetables',
      price: 10.50,
      priceUnit: 'kg',
      minimumQuantity: 1,
      images: ['image1.jpg'],
      availability: 'available',
      isActive: true,
      featured: false,
      sortOrder: 0,
      slug: 'test-product',
      keywords: [],
      tags: [],
      primaryImageIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    } as IProduct;
  };

  describe('getArticles', () => {
    it('should fetch articles with filters', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Article 1' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      };

      mockClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.getArticles({ tags: ['vegetables'] });

      expect(result).toEqual(mockResponse);
      expect(mockClient.get).toHaveBeenCalledWith('/articles', {
        params: { tags: ['vegetables'] }
      });
    });

    it('should handle API errors', async () => {
      mockClient.get = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(service.getArticles()).rejects.toThrow('Failed to fetch articles');
    });
  });

  describe('getArticleById', () => {
    it('should fetch article by ID', async () => {
      const mockArticle = { id: '123', name: 'Test Article' };
      mockClient.get = jest.fn().mockResolvedValue(mockArticle);

      const result = await service.getArticleById('123');

      expect(result).toEqual(mockArticle);
      expect(mockClient.get).toHaveBeenCalledWith('/articles/123');
    });
  });

  describe('createArticle', () => {
    it('should create new article', async () => {
      const mockDto = { name: 'New Article', price: 10 };
      const mockArticle = { id: '123', ...mockDto };

      mockClient.post = jest.fn().mockResolvedValue(mockArticle);

      const result = await service.createArticle(mockDto as any);

      expect(result).toEqual(mockArticle);
      expect(mockClient.post).toHaveBeenCalledWith('/articles', mockDto);
    });
  });

  describe('updateArticle', () => {
    it('should update existing article', async () => {
      const mockDto = { name: 'Updated Article' };
      const mockArticle = { id: '123', ...mockDto };

      (mockClient as any).patch = jest.fn().mockResolvedValue(mockArticle);

      const result = await service.updateArticle('123', mockDto);

      expect(result).toEqual(mockArticle);
      expect((mockClient as any).patch).toHaveBeenCalledWith('/articles/123', mockDto);
    });
  });

  describe('deleteArticle', () => {
    it('should delete article', async () => {
      mockClient.delete = jest.fn().mockResolvedValue(undefined);

      await service.deleteArticle('123');

      expect(mockClient.delete).toHaveBeenCalledWith('/articles/123');
    });
  });

  describe('syncProduct', () => {
    beforeEach(() => {
      (articleMapping.validateProductForSync as jest.Mock) = jest.fn().mockReturnValue([]);
    });

    it('should create new article if product has no FlourIO ID', async () => {
      const product = createMockProduct();
      const mockCreateDto = { name: 'Test', price: 10, tags: [] };
      const mockArticle = { id: 'new-123', ...mockCreateDto };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockResolvedValue(mockArticle);

      // Mock Product model update
      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      const result = await service.syncProduct(product);

      expect(result.created).toBe(true);
      expect(result.article.id).toBe('new-123');
      expect(mockClient.post).toHaveBeenCalledWith('/articles', mockCreateDto);
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    it('should update existing article if product has FlourIO ID', async () => {
      const product = createMockProduct({
        flourioSync: { articleId: 'existing-123', status: 'synced' }
      });

      const mockUpdateDto = { id: 'existing-123', name: 'Updated', tags: [] };
      const mockArticle = { id: 'existing-123', name: 'Updated', tags: [] };

      (articleMapping.mapProductToUpdateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockUpdateDto);
      (mockClient as any).patch = jest.fn().mockResolvedValue(mockArticle);

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      const result = await service.syncProduct(product);

      expect(result.created).toBe(false);
      expect(result.article.id).toBe('existing-123');
      expect((mockClient as any).patch).toHaveBeenCalledWith('/articles/existing-123', mockUpdateDto);
    });

    it('should handle validation errors', async () => {
      const product = createMockProduct();
      (articleMapping.validateProductForSync as jest.Mock) = jest.fn().mockReturnValue(['Error 1', 'Error 2']);

      await expect(service.syncProduct(product)).rejects.toThrow('Product validation failed');
    });


    it('should update sync error status on failure', async () => {
      const product = createMockProduct();
      const mockCreateDto = { name: 'Test', tags: [] };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockRejectedValue(new Error('API Error'));

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      await expect(service.syncProduct(product)).rejects.toThrow();

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: product._id },
        {
          $set: expect.objectContaining({
            'flourioSync.status': 'error',
            'flourioSync.error': expect.any(String)
          })
        }
      );
    });
  });

  describe('syncProducts', () => {
    it('should sync multiple products', async () => {
      const products = [
        createMockProduct({ name: 'Product 1' }),
        createMockProduct({ name: 'Product 2' })
      ];

      (articleMapping.validateProductForSync as jest.Mock) = jest.fn().mockReturnValue([]);
      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue({ name: 'Test', tags: [] });

      mockClient.post = jest.fn().mockResolvedValue({ id: '123' });

      products.forEach(p => {
        (p.constructor as any).updateOne = jest.fn().mockResolvedValue({});
      });

      const result = await service.syncProducts(products);

      expect(result.synced).toBe(2);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle mixed success and failures', async () => {
      const products = [
        createMockProduct({ name: 'Success Product' }),
        createMockProduct({ name: 'Fail Product' })
      ];

      (articleMapping.validateProductForSync as jest.Mock) = jest.fn()
        .mockReturnValueOnce([]) // First product validates
        .mockReturnValueOnce(['Validation Error']); // Second fails

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue({ name: 'Test', tags: [] });

      mockClient.post = jest.fn().mockResolvedValue({ id: '123' });

      (products[0].constructor as any).updateOne = jest.fn().mockResolvedValue({});

      const result = await service.syncProducts(products);

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].productName).toBe('Fail Product');
    });
  });

  describe('getArticlesByCategory', () => {
    it('should fetch articles by category', async () => {
      const mockArticles = [
        { id: '1', category: 'vegetables' },
        { id: '2', category: 'vegetables' }
      ];

      mockClient.get = jest.fn().mockResolvedValue({
        data: mockArticles
      });

      const result = await service.getArticlesByCategory('vegetables');

      expect(result).toEqual(mockArticles);
      expect(mockClient.get).toHaveBeenCalledWith('/articles', {
        params: { tags: ['vegetables'], pageSize: 1000 }
      });
    });
  });

  describe('searchArticles', () => {
    it('should search articles', async () => {
      const mockArticles = [{ id: '1', name: 'Tomato' }];

      mockClient.get = jest.fn().mockResolvedValue({
        data: mockArticles
      });

      const result = await service.searchArticles('tomato');

      expect(result).toEqual(mockArticles);
      expect(mockClient.get).toHaveBeenCalledWith('/articles', {
        params: { search: 'tomato', pageSize: 100 }
      });
    });
  });

  describe('Tag FlourIO ID Writeback', () => {
    let mockTagModel: any;
    let mockBulkWrite: jest.Mock;

    beforeEach(() => {
      mockBulkWrite = jest.fn().mockResolvedValue({ modifiedCount: 2 });

      mockTagModel = {
        bulkWrite: mockBulkWrite
      };

      jest.spyOn(mongoose, 'model').mockReturnValue(mockTagModel);

      (articleMapping.validateProductForSync as jest.Mock) = jest.fn().mockReturnValue([]);
    });

    it('should update tags without flourioId after create', async () => {
      const product = createMockProduct();
      const mockCreateDto = {
        name: 'Test Product',
        price: 10,
        tags: ['Obst', 'Bio']
      };
      const mockArticle = {
        id: 'new-123',
        name: 'Test Product',
        tags: [
          { _id: 'flour-id-1', name: 'Obst' },
          { _id: 'flour-id-2', name: 'Bio' }
        ]
      };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockResolvedValue(mockArticle);

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      await service.syncProduct(product);

      expect(mockBulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { name: 'Obst', flourioId: { $exists: false } },
            update: { $set: { flourioId: 'flour-id-1' } }
          }
        },
        {
          updateOne: {
            filter: { name: 'Bio', flourioId: { $exists: false } },
            update: { $set: { flourioId: 'flour-id-2' } }
          }
        }
      ]);
    });

    it('should update tags without flourioId after update', async () => {
      const product = createMockProduct({
        flourioSync: { articleId: 'existing-123', status: 'synced' }
      });

      const mockUpdateDto = {
        name: 'Updated Product',
        tags: ['Gemüse']
      };
      const mockArticle = {
        id: 'existing-123',
        name: 'Updated Product',
        tags: [
          { _id: 'flour-id-3', name: 'Gemüse' }
        ]
      };

      (articleMapping.mapProductToUpdateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockUpdateDto);
      (mockClient as any).patch = jest.fn().mockResolvedValue(mockArticle);

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      await service.syncProduct(product);

      expect(mockBulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { name: 'Gemüse', flourioId: { $exists: false } },
            update: { $set: { flourioId: 'flour-id-3' } }
          }
        }
      ]);
    });

    it('should not fail sync if tag update fails', async () => {
      const product = createMockProduct();
      const mockCreateDto = {
        name: 'Test Product',
        price: 10,
        tags: ['Obst']
      };
      const mockArticle = {
        id: 'new-123',
        name: 'Test Product',
        tags: [{ _id: 'flour-id-1', name: 'Obst' }]
      };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockResolvedValue(mockArticle);
      mockBulkWrite.mockRejectedValue(new Error('DB error'));

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      const logger = require('../../../utils/logger').default;
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      const result = await service.syncProduct(product);

      expect(result.created).toBe(true);
      expect(result.article.id).toBe('new-123');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '[ArticleService] Failed to update tag FlourIO IDs',
        { error: 'DB error' }
      );

      loggerErrorSpy.mockRestore();
    });

    it('should skip tag update if no tags in response', async () => {
      const product = createMockProduct();
      const mockCreateDto = {
        name: 'Test Product',
        price: 10,
        tags: []
      };
      const mockArticle = {
        id: 'new-123',
        name: 'Test Product',
        tags: []
      };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockResolvedValue(mockArticle);

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      await service.syncProduct(product);

      expect(mockBulkWrite).not.toHaveBeenCalled();
    });

    it('should skip tag update if article has no tags property', async () => {
      const product = createMockProduct();
      const mockCreateDto = {
        name: 'Test Product',
        price: 10,
        tags: ['Obst']
      };
      const mockArticle = {
        id: 'new-123',
        name: 'Test Product'
      };

      (articleMapping.mapProductToCreateArticle as jest.Mock) = jest.fn().mockResolvedValue(mockCreateDto);
      mockClient.post = jest.fn().mockResolvedValue(mockArticle);

      const mockUpdateOne = jest.fn().mockResolvedValue({});
      (product.constructor as any).updateOne = mockUpdateOne;

      await service.syncProduct(product);

      expect(mockBulkWrite).not.toHaveBeenCalled();
    });
  });
});
