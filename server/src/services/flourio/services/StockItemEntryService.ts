/**
 * @file StockItemEntryService.ts
 * @purpose CRUD + query operations for FlourIO StockItemEntries (inventory records)
 * @created 2026-03-31
 *
 * A StockItemEntry represents: "Article X is stored in Warehouse Y with amount Z"
 * - item = Flourio Article ID (maps to Product.flourioSync.articleId)
 * - stock = Flourio Warehouse ID (maps to Mietfach.flourioWarehouseId)
 * - amount = quantity
 * - type = "I" (Inbound)
 */

import { FlourioClient } from '../client/FlourioClient';
import type {
  StockItemEntry,
  CreateStockItemEntryDto,
  UpdateStockItemEntryDto,
  StockItemEntryQueryParams,
  PaginatedResponse,
  SetStockAvailabilityDto,
  GetArticleStockItemEntryDto
} from '../generated/api-types';

export class StockItemEntryService {
  constructor(private client: FlourioClient) {}

  // ─── CRUD ───────────────────────────────────────────────────────────

  /**
   * Create a new stock item entry
   */
  async create(dto: CreateStockItemEntryDto): Promise<StockItemEntry> {
    return this.client.post<StockItemEntry>('/stockitementries', dto);
  }

  /**
   * Get stock item entry by ID
   */
  async get(id: string): Promise<StockItemEntry> {
    return this.client.get<StockItemEntry>(`/stockitementries/${id}`);
  }

  /**
   * List all stock item entries
   */
  async list(params?: StockItemEntryQueryParams): Promise<StockItemEntry[]> {
    return this.client.get<StockItemEntry[]>('/stockitementries', { params });
  }

  /**
   * List with pagination
   */
  async listPaginated(params?: StockItemEntryQueryParams): Promise<PaginatedResponse<StockItemEntry>> {
    return this.client.get<PaginatedResponse<StockItemEntry>>('/stockitementries', { params });
  }

  /**
   * Update a stock item entry
   */
  async update(id: string, dto: UpdateStockItemEntryDto): Promise<StockItemEntry> {
    return this.client.patch<StockItemEntry>(`/stockitementries/${id}`, dto);
  }

  /**
   * Delete a stock item entry
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/stockitementries/${id}`);
  }

  // ─── Article-specific stock queries ─────────────────────────────────

  /**
   * Get all stock item entries for a specific article
   */
  async getForArticle(articleId: string, params?: GetArticleStockItemEntryDto): Promise<StockItemEntry[]> {
    return this.client.get<StockItemEntry[]>(
      `/articles/${articleId}/stockitementries`,
      { params }
    );
  }

  /**
   * Get total stock for an article (across all warehouses)
   */
  async getArticleStockTotal(articleId: string): Promise<number> {
    const result = await this.client.get<{ total: number }>(
      `/articles/${articleId}/stock/total`
    );
    return result.total ?? 0;
  }

  /**
   * Get stock availability for an article
   */
  async getArticleStockAvailability(articleId: string): Promise<any> {
    return this.client.get(`/articles/${articleId}/stockavailability`);
  }

  /**
   * Set stock availability for an article in a specific warehouse
   */
  async setArticleStockAvailability(articleId: string, dto: SetStockAvailabilityDto): Promise<any> {
    return this.client.post(
      `/articles/${articleId}/set-stock-availability`,
      dto
    );
  }
}
