/**
 * @file TagSyncService.ts
 * @purpose Service for syncing FlourIO tags to housnkuh Tag model
 * @created 2025-10-17
 * @deprecated Since 2025-11-14
 * @deprecationReason housnkuh is now the leading data source for tags.
 *   Tags are automatically created by FlourIO when Articles are synced.
 *   Use ArticleService.syncProduct() instead of pulling tags from FlourIO.
 */

import { FlourioClient } from '../client/FlourioClient';
import { Tag, ITag } from '../../../models/Tag';
import logger from '../../../utils/logger';

export interface TagSyncResult {
  synced: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: Array<{ tag: string; error: string }>;
}

export interface FlourioTag {
  _id: string;
  name: string;
  displayName?: string;
  section: string;
  status: {
    visible: boolean;
    deleted: boolean;
  };
}

/**
 * Service for syncing FlourIO tags to housnkuh Tag model
 */
export class TagSyncService {
  constructor(private client: FlourioClient) {}

  /**
   * Fetch tags from FlourIO API
   */
  private async fetchTagsFromFlourIO(): Promise<FlourioTag[]> {
    try {
      logger.info('[TagSyncService] Fetching tags from FlourIO...');

      const response = await this.client.get<FlourioTag[]>('/tags');

      logger.debug('[TagSyncService] Response received', { type: typeof response, isArray: Array.isArray(response), count: Array.isArray(response) ? response.length : 'N/A' });

      if (!Array.isArray(response)) {
        logger.error('[TagSyncService] ERROR: Response is not an array!', { response });
        return [];
      }

      // Filter for article section tags only
      const articleTags = response.filter(tag => tag.section === 'article');
      logger.debug('[TagSyncService] Found article tags', { count: articleTags.length });

      return articleTags;
    } catch (error: any) {
      logger.error('[TagSyncService] Error fetching tags from FlourIO', { error: error.message });
      throw new Error(`Failed to fetch tags from FlourIO: ${error.message}`);
    }
  }

  /**
   * Map FlourIO section to housnkuh tag category
   */
  private mapSectionToCategory(section: string): 'product' | 'certification' | 'method' | 'feature' {
    const mapping: Record<string, 'product' | 'certification' | 'method' | 'feature'> = {
      'article': 'product',
      'product': 'product',
      'certification': 'certification',
      'method': 'method',
      'feature': 'feature'
    };

    return mapping[section] || 'product';
  }

  /**
   * Generate URL-friendly slug from tag name
   * Matches the logic in Tag model's pre-save hook
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\u00e4\u00f6\u00fc\u00df]/g, (match) => {
        const replacements: { [key: string]: string } = {
          '\u00e4': 'ae', '\u00f6': 'oe', '\u00fc': 'ue', '\u00df': 'ss'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Sync tags from FlourIO to housnkuh Tag model
   */
  /**
   * @deprecated Since 2025-11-14 - Tags are now synced automatically when Articles are created
   * @see ArticleService.syncProduct()
   * @throws Error indicating deprecation
   */
  async syncTags(): Promise<TagSyncResult> {
    throw new Error(
      'TagSyncService.syncTags() is deprecated since 2025-11-14. ' +
      'Tags are now automatically created by FlourIO when Articles are synced. ' +
      'Use ArticleService.syncProduct() to sync products with their tags.'
    );
  }

  /**
   * Get all active tags (including FlourIO synced)
   */
  async getActiveTags(): Promise<ITag[]> {
    return await Tag.find({ isActive: true }).sort({ name: 1 });
  }

  /**
   * Get only FlourIO synced tags
   */
  async getFlourioSyncedTags(): Promise<ITag[]> {
    return await Tag.find({
      flourioId: { $exists: true, $ne: null },
      isActive: true
    }).sort({ name: 1 });
  }

  /**
   * Force tag sync (on-demand)
   */
  /**
   * @deprecated Since 2025-11-14 - Tags are now synced automatically when Articles are created
   * @see ArticleService.syncProduct()
   * @throws Error indicating deprecation
   */
  async forceSyncTags(): Promise<TagSyncResult> {
    throw new Error(
      'TagSyncService.forceSyncTags() is deprecated since 2025-11-14. ' +
      'Tags are now automatically created by FlourIO when Articles are synced. ' +
      'Use ArticleService.syncProduct() to sync products with their tags.'
    );
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    total: number;
    flourioSynced: number;
    localOnly: number;
  }> {
    const total = await Tag.countDocuments({ isActive: true });
    const flourioSynced = await Tag.countDocuments({
      flourioId: { $exists: true, $ne: null },
      isActive: true
    });

    return {
      total,
      flourioSynced,
      localOnly: total - flourioSynced
    };
  }
}
