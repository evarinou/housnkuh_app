/**
 * @file StockItemEntryPullService.ts
 * @purpose Pulls stock item entries from Flourio and updates local Product inventory
 * @created 2026-03-31
 *
 * Architecture: Flourio is source of truth for inventory levels.
 * This service polls Flourio and caches the results locally on Product.flourioStock.
 *
 * Flow:
 * 1. Fetch all StockItemEntries from Flourio (paginated)
 * 2. Build lookup map: articleId → local Product._id
 * 3. Group entries by articleId, sum amounts per warehouse
 * 4. Bulk-update Products with flourioStock data
 * 5. Auto-update availability based on totalAmount
 */

import { FlourioClient } from '../client/FlourioClient';
import { Product } from '../../../models/Product';
import type { StockItemEntry, PaginatedResponse } from '../generated/api-types';
import logger from '../../../utils/logger';

export interface StockPullResult {
  updated: number;
  unchanged: number;
  unmatched: number;
  errors: Array<{ articleId: string; error: string }>;
  duration: number;
}

interface ArticleStockData {
  totalAmount: number;
  entries: Array<{
    warehouseId: string;
    warehouseName?: string;
    amount: number;
  }>;
}

export class StockItemEntryPullService {
  constructor(private client: FlourioClient) {}

  /**
   * Pull all stock data from Flourio and update local Products.
   * Main entry point — called by the cron job.
   */
  async pullAll(): Promise<StockPullResult> {
    const startTime = Date.now();
    const result: StockPullResult = {
      updated: 0,
      unchanged: 0,
      unmatched: 0,
      errors: [],
      duration: 0
    };

    try {
      // Step 1: Build articleId → Product._id lookup map
      const articleMap = await this.buildArticleMap();
      if (articleMap.size === 0) {
        logger.info('[StockPullService] No synced products found, skipping pull');
        result.duration = Date.now() - startTime;
        return result;
      }

      logger.info('[StockPullService] Starting stock pull', {
        syncedProducts: articleMap.size
      });

      // Step 2: Fetch all stock item entries from Flourio
      const allEntries = await this.fetchAllStockItemEntries();

      logger.info('[StockPullService] Fetched stock item entries', {
        totalEntries: allEntries.length
      });

      // Step 3: Group entries by articleId
      const articleStockMap = this.groupEntriesByArticle(allEntries);

      // Step 4: Build bulk operations
      const bulkOps: any[] = [];
      const now = new Date();

      for (const [articleId, stockData] of articleStockMap) {
        const productId = articleMap.get(articleId);
        if (!productId) {
          result.unmatched++;
          continue;
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: productId },
            update: {
              $set: {
                'flourioStock.totalAmount': stockData.totalAmount,
                'flourioStock.entries': stockData.entries,
                'flourioStock.lastPulledAt': now
              }
            }
          }
        });
      }

      // Also handle products that are synced but have NO stock entries in Flourio
      // (i.e., their stock went to 0)
      for (const [articleId, productId] of articleMap) {
        if (!articleStockMap.has(articleId)) {
          bulkOps.push({
            updateOne: {
              filter: { _id: productId },
              update: {
                $set: {
                  'flourioStock.totalAmount': 0,
                  'flourioStock.entries': [],
                  'flourioStock.lastPulledAt': now
                }
              }
            }
          });
        }
      }

      // Step 5: Execute bulk update
      if (bulkOps.length > 0) {
        const bulkResult = await Product.bulkWrite(bulkOps);
        result.updated = bulkResult.modifiedCount;
        result.unchanged = bulkOps.length - bulkResult.modifiedCount;
      }

      // Step 6: Auto-update availability for out-of-stock products
      await this.updateAvailability();

      logger.info('[StockPullService] Stock pull completed', {
        updated: result.updated,
        unchanged: result.unchanged,
        unmatched: result.unmatched
      });

    } catch (error: any) {
      logger.error('[StockPullService] Stock pull failed', { error: error.message });
      result.errors.push({ articleId: '*', error: error.message });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Build map of Flourio articleId → local Product._id
   * Only includes products that have been synced to Flourio.
   */
  private async buildArticleMap(): Promise<Map<string, any>> {
    const products = await Product.find(
      { 'flourioSync.articleId': { $exists: true, $ne: null } },
      { _id: 1, 'flourioSync.articleId': 1 }
    ).lean();

    const map = new Map<string, any>();
    for (const product of products) {
      const articleId = product.flourioSync?.articleId;
      if (articleId) {
        map.set(articleId, product._id);
      }
    }
    return map;
  }

  /**
   * Fetch all stock item entries from Flourio, handling pagination.
   */
  private async fetchAllStockItemEntries(): Promise<StockItemEntry[]> {
    const allEntries: StockItemEntry[] = [];
    let page = 1;
    const pageSize = 100;

    // Try paginated response first
    try {
      let hasMore = true;
      while (hasMore) {
        const response = await this.client.get<PaginatedResponse<StockItemEntry> | StockItemEntry[]>(
          '/stockitementries',
          { params: { page, pageSize } }
        );

        // Handle both array and paginated response formats
        if (Array.isArray(response)) {
          allEntries.push(...response);
          hasMore = false;
        } else {
          allEntries.push(...response.data);
          if (page >= response.totalPages || response.data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }
    } catch (error: any) {
      // If paginated call fails, try simple list
      logger.warn('[StockPullService] Paginated fetch failed, trying simple list', {
        error: error.message
      });
      const entries = await this.client.get<StockItemEntry[]>('/stockitementries');
      if (Array.isArray(entries)) {
        allEntries.push(...entries);
      }
    }

    return allEntries;
  }

  /**
   * Group stock item entries by article ID and aggregate amounts per warehouse.
   */
  private groupEntriesByArticle(entries: StockItemEntry[]): Map<string, ArticleStockData> {
    const map = new Map<string, ArticleStockData>();

    for (const entry of entries) {
      if (!entry.item || entry.amount == null) continue;

      let stockData = map.get(entry.item);
      if (!stockData) {
        stockData = { totalAmount: 0, entries: [] };
        map.set(entry.item, stockData);
      }

      // Find or create warehouse entry
      let warehouseEntry = stockData.entries.find(e => e.warehouseId === entry.stock);
      if (!warehouseEntry) {
        warehouseEntry = { warehouseId: entry.stock, amount: 0 };
        stockData.entries.push(warehouseEntry);
      }

      warehouseEntry.amount += entry.amount;
      stockData.totalAmount += entry.amount;
    }

    return map;
  }

  /**
   * Auto-update product availability based on stock levels.
   * - totalAmount === 0 → 'out_of_stock' (unless seasonal/preorder)
   * - totalAmount > 0 and currently out_of_stock → 'available'
   */
  private async updateAvailability(): Promise<void> {
    // Set out_of_stock for products with 0 stock (respecting seasonal/preorder)
    await Product.updateMany(
      {
        'flourioStock.totalAmount': 0,
        'flourioStock.lastPulledAt': { $exists: true },
        availability: { $in: ['available'] }
      },
      { $set: { availability: 'out_of_stock' } }
    );

    // Restore available for products that have stock again
    await Product.updateMany(
      {
        'flourioStock.totalAmount': { $gt: 0 },
        availability: 'out_of_stock'
      },
      { $set: { availability: 'available' } }
    );
  }
}
