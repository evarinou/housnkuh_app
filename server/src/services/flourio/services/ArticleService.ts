/**
 * @file ArticleService.ts
 * @purpose Service for FlourIO Article API operations
 * @created 2025-10-16
 */

import { FlourioClient } from '../client/FlourioClient';
import logger from '../../../utils/logger';
import {
  Article,
  CreateArticleDto,
  UpdateArticleDto,
  ArticleQueryParams,
  PaginatedResponse
} from '../generated/api-types';
import { IProduct } from '../../../models/Product';
import {
  mapProductToCreateArticle,
  mapProductToUpdateArticle,
  validateProductForSync
} from './articleMapping';

export interface ArticleSyncStatus {
  articleId?: string;
  lastSyncedAt?: Date;
  status?: 'synced' | 'pending' | 'error' | 'never';
  error?: string;
}

/**
 * Service for managing FlourIO Articles
 */
export class ArticleService {
  constructor(private client: FlourioClient) {}

  /**
   * Get all articles with optional filters
   */
  async getArticles(params?: ArticleQueryParams): Promise<PaginatedResponse<Article>> {
    try {
      const response = await this.client.get<PaginatedResponse<Article>>('/articles', { params });
      return response;
    } catch (error: any) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }
  }

  /**
   * Get article by ID
   */
  async getArticleById(articleId: string): Promise<Article> {
    try {
      const response = await this.client.get<Article>(`/articles/${articleId}`);
      return response;
    } catch (error: any) {
      throw new Error(`Failed to fetch article ${articleId}: ${error.message}`);
    }
  }

  /**
   * Create new article
   */
  async createArticle(dto: CreateArticleDto): Promise<Article> {
    try {
      const response = await this.client.post<Article>('/articles', dto);
      return response;
    } catch (error: any) {
      throw new Error(`Failed to create article: ${error.message}`);
    }
  }

  /**
   * Update existing article
   */
  async updateArticle(articleId: string, dto: Partial<UpdateArticleDto>): Promise<Article> {
    try {
      const response = await this.client.put<Article>(`/articles/${articleId}`, dto);
      return response;
    } catch (error: any) {
      throw new Error(`Failed to update article ${articleId}: ${error.message}`);
    }
  }

  /**
   * Delete article
   */
  async deleteArticle(articleId: string): Promise<void> {
    try {
      await this.client.delete(`/articles/${articleId}`);
    } catch (error: any) {
      throw new Error(`Failed to delete article ${articleId}: ${error.message}`);
    }
  }

  /**
   * Sync Product to FlourIO Article
   * Creates new article if not exists, updates if exists
   */
  async syncProduct(product: IProduct): Promise<{ article: Article; created: boolean }> {
    // Validate product data
    const errors = await validateProductForSync(product);
    if (errors.length > 0) {
      throw new Error(`Product validation failed: ${errors.join(', ')}`);
    }

    try {
      // Check if product already has FlourIO article ID
      const existingArticleId = product.flourioSync?.articleId;

      if (existingArticleId) {
        // Update existing article
        const updateDto = await mapProductToUpdateArticle(product, existingArticleId);
        const article = await this.updateArticle(existingArticleId, updateDto);

        // Write back FlourIO tag IDs to local tags
        await this.updateTagFlourioIds(article.tags, updateDto.tags || []);

        // Update product sync status
        await this.updateProductSyncStatus(product, {
          articleId: article.id,
          lastSyncedAt: new Date(),
          status: 'synced'
        });

        return { article, created: false };
      } else {
        // Create new article
        const createDto = await mapProductToCreateArticle(product);
        const article = await this.createArticle(createDto);

        // Write back FlourIO tag IDs to local tags
        await this.updateTagFlourioIds(article.tags, createDto.tags || []);

        // Update product sync status
        await this.updateProductSyncStatus(product, {
          articleId: article.id,
          lastSyncedAt: new Date(),
          status: 'synced'
        });

        return { article, created: true };
      }
    } catch (error: any) {
      // Update product with error status
      await this.updateProductSyncStatus(product, {
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Update Product model with FlourIO sync status
   */
  private async updateProductSyncStatus(product: IProduct, status: ArticleSyncStatus): Promise<void> {
    const Product = product.constructor as any;

    const updateData: any = {};
    if (status.articleId !== undefined) updateData['flourioSync.articleId'] = status.articleId;
    if (status.status !== undefined) updateData['flourioSync.status'] = status.status;
    if (status.lastSyncedAt !== undefined) updateData['flourioSync.lastSyncedAt'] = status.lastSyncedAt;
    if (status.error !== undefined) updateData['flourioSync.error'] = status.error;

    await Product.updateOne(
      { _id: product._id },
      { $set: updateData }
    );

    // Update local instance
    if (!product.flourioSync) {
      product.flourioSync = {
        status: 'never'
      };
    }
    if (status.articleId !== undefined) product.flourioSync.articleId = status.articleId;
    if (status.status !== undefined) product.flourioSync.status = status.status;
    if (status.lastSyncedAt !== undefined) product.flourioSync.lastSyncedAt = status.lastSyncedAt;
    if (status.error !== undefined) product.flourioSync.error = status.error;
  }

  /**
   * Update local tags with FlourIO IDs from Article response
   * @param flourioTags - Tags from FlourIO Article response (with ObjectIds)
   * @param sentTagNames - Tag names that were sent in the request
   * @description Optional operation - errors do not break sync flow
   */
  private async updateTagFlourioIds(
    flourioTags: string[] | Array<{ _id: string; name: string }> | undefined,
    sentTagNames: string[]
  ): Promise<void> {
    if (!flourioTags || flourioTags.length === 0 || sentTagNames.length === 0) {
      return;
    }

    // Skip if tags are not populated (just string IDs)
    if (typeof flourioTags[0] === 'string') {
      return;
    }

    try {
      const mongoose = await import('mongoose');
      const Tag = mongoose.default.model('Tag');

      // Map FlourIO tags by name for easy lookup (tags are populated objects)
      const flourioTagMap = new Map(
        (flourioTags as Array<{ _id: string; name: string }>).map(t => [t.name, t._id])
      );

      // Prepare bulk update operations
      const bulkOps = sentTagNames
        .map(tagName => {
          const flourioId = flourioTagMap.get(tagName);
          if (!flourioId) return null;

          return {
            updateOne: {
              filter: {
                name: tagName,
                flourioId: { $exists: false } // Don't overwrite existing IDs
              },
              update: { $set: { flourioId } }
            }
          };
        })
        .filter((op): op is NonNullable<typeof op> => op !== null);

      if (bulkOps.length > 0) {
        const result = await Tag.bulkWrite(bulkOps);
        const updated = result.modifiedCount || 0;
        
        if (updated > 0) {
          logger.info('[ArticleService] Updated tags with FlourIO IDs', { count: updated });
        }
      }
    } catch (error: any) {
      // Don't throw - tag ID writeback is optional
      logger.error('[ArticleService] Failed to update tag FlourIO IDs', { error: error.message });
    }
  }

  /**
   * Get articles by tags
   */
  async getArticlesByTags(tags: string[]): Promise<Article[]> {
    const response = await this.getArticles({ tags, pageSize: 1000 });
    return response.data || [];
  }

  /**
   * @deprecated Use getArticlesByTags() instead
   * Get articles by category (legacy - kept for backward compatibility)
   */
  async getArticlesByCategory(category: string): Promise<Article[]> {
    return this.getArticlesByTags([category]);
  }

  /**
   * Search articles
   */
  async searchArticles(searchTerm: string): Promise<Article[]> {
    const response = await this.getArticles({ search: searchTerm, pageSize: 100 });
    return response.data || [];
  }

  /**
   * Bulk sync multiple products
   */
  async syncProducts(products: IProduct[]): Promise<{
    synced: number;
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ productName: string; error: string }>;
  }> {
    const result = {
      synced: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ productName: string; error: string }>
    };

    for (const product of products) {
      try {
        const syncResult = await this.syncProduct(product);

        result.synced++;
        if (syncResult.created) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          productName: product.name,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Sync single product to FlourIO article (alias for API consistency)
   */
  async syncProductToArticle(product: IProduct): Promise<Article> {
    const result = await this.syncProduct(product);
    return result.article;
  }

  /**
   * Bulk sync products by IDs (alias for API consistency)
   */
  async bulkSyncProducts(productIds: string[]): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ productId: string; error: string }>;
  }> {
    const Product = (await import('../../../models/Product')).Product;

    const result = {
      synced: 0,
      failed: 0,
      errors: [] as Array<{ productId: string; error: string }>
    };

    for (const productId of productIds) {
      try {
        const product = await Product.findById(productId);

        if (!product) {
          result.failed++;
          result.errors.push({
            productId,
            error: 'Product not found'
          });
          continue;
        }

        await this.syncProduct(product);
        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          productId,
          error: error.message
        });
      }
    }

    return result;
  }
}
