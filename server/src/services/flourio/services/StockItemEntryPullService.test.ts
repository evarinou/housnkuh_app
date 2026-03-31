/**
 * @file StockItemEntryPullService.test.ts
 * @purpose Unit tests for stock item entry pull (Flourio → housnkuh)
 * @created 2026-03-31
 */

import { StockItemEntryPullService } from './StockItemEntryPullService';
import { Product } from '../../../models/Product';
import type { FlourioClient } from '../client/FlourioClient';
import type { StockItemEntry } from '../generated/api-types';

jest.mock('../../../models/Product');

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
} as unknown as jest.Mocked<FlourioClient>;

const mockStockItemEntries: StockItemEntry[] = [
  {
    id: 'sie_1',
    item: 'flour_article_1',
    stock: 'flour_wh_1',
    amount: 50,
    type: 'I',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sie_2',
    item: 'flour_article_1',
    stock: 'flour_wh_2',
    amount: 30,
    type: 'I',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sie_3',
    item: 'flour_article_2',
    stock: 'flour_wh_1',
    amount: 10,
    type: 'I',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sie_4',
    item: 'flour_article_unknown',
    stock: 'flour_wh_1',
    amount: 5,
    type: 'I',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

describe('StockItemEntryPullService', () => {
  let service: StockItemEntryPullService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StockItemEntryPullService(mockClient);
  });

  describe('pullAll', () => {
    it('should pull stock entries and update products', async () => {
      // Mock: 2 synced products
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            { _id: 'prod_1', flourioSync: { articleId: 'flour_article_1' } },
            { _id: 'prod_2', flourioSync: { articleId: 'flour_article_2' } }
          ])
        });

      // Mock: Flourio returns stock entries as array
      mockClient.get.mockResolvedValueOnce(mockStockItemEntries);

      // Mock: bulkWrite
      (Product.bulkWrite as jest.Mock).mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2
      });

      // Mock: updateMany for availability
      (Product.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await service.pullAll();

      expect(result.updated).toBe(2);
      expect(result.unmatched).toBe(1); // flour_article_unknown
      expect(result.errors).toHaveLength(0);

      // Should have called bulkWrite with 2 operations (both products matched)
      expect(Product.bulkWrite).toHaveBeenCalledTimes(1);
      const bulkOps = (Product.bulkWrite as jest.Mock).mock.calls[0][0];
      expect(bulkOps.length).toBe(2);

      // Check article_1 has totalAmount 80 (50 + 30 from two warehouses)
      const article1Op = bulkOps.find((op: any) =>
        op.updateOne.filter._id === 'prod_1'
      );
      expect(article1Op.updateOne.update.$set['flourioStock.totalAmount']).toBe(80);
      expect(article1Op.updateOne.update.$set['flourioStock.entries']).toHaveLength(2);

      // Check article_2 has totalAmount 10
      const article2Op = bulkOps.find((op: any) =>
        op.updateOne.filter._id === 'prod_2'
      );
      expect(article2Op.updateOne.update.$set['flourioStock.totalAmount']).toBe(10);
    });

    it('should handle empty stock entries (set products to 0)', async () => {
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            { _id: 'prod_1', flourioSync: { articleId: 'flour_article_1' } }
          ])
        });

      // Flourio returns no stock entries
      mockClient.get.mockResolvedValueOnce([]);

      (Product.bulkWrite as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
        matchedCount: 1
      });
      (Product.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await service.pullAll();

      // Product should be set to 0 stock (no entries matched)
      const bulkOps = (Product.bulkWrite as jest.Mock).mock.calls[0][0];
      expect(bulkOps[0].updateOne.update.$set['flourioStock.totalAmount']).toBe(0);
      expect(bulkOps[0].updateOne.update.$set['flourioStock.entries']).toEqual([]);
    });

    it('should skip when no synced products exist', async () => {
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([])
        });

      const result = await service.pullAll();

      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            { _id: 'prod_1', flourioSync: { articleId: 'flour_article_1' } }
          ])
        });

      // Both paginated and fallback calls must fail
      mockClient.get
        .mockRejectedValueOnce(new Error('Flourio API down'))
        .mockRejectedValueOnce(new Error('Flourio API down'));

      const result = await service.pullAll();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Flourio API down');
    });

    it('should handle paginated response format', async () => {
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            { _id: 'prod_1', flourioSync: { articleId: 'flour_article_1' } }
          ])
        });

      // Flourio returns paginated format
      mockClient.get.mockResolvedValueOnce({
        data: [mockStockItemEntries[0]],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1
      });

      (Product.bulkWrite as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
        matchedCount: 1
      });
      (Product.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await service.pullAll();

      expect(result.errors).toHaveLength(0);
    });

    it('should call updateAvailability after pull', async () => {
      (Product.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([
            { _id: 'prod_1', flourioSync: { articleId: 'flour_article_1' } }
          ])
        });

      mockClient.get.mockResolvedValueOnce([]);

      (Product.bulkWrite as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
        matchedCount: 1
      });
      (Product.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      await service.pullAll();

      // updateAvailability calls updateMany twice
      expect(Product.updateMany).toHaveBeenCalledTimes(2);

      // First call: set out_of_stock for 0-stock products
      const firstCall = (Product.updateMany as jest.Mock).mock.calls[0];
      expect(firstCall[0]['flourioStock.totalAmount']).toBe(0);
      expect(firstCall[1].$set.availability).toBe('out_of_stock');

      // Second call: restore available for products with stock
      const secondCall = (Product.updateMany as jest.Mock).mock.calls[1];
      expect(secondCall[0]['flourioStock.totalAmount']).toEqual({ $gt: 0 });
      expect(secondCall[1].$set.availability).toBe('available');
    });
  });
});
