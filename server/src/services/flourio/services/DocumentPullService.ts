/**
 * @file DocumentPullService.ts
 * @purpose Pulls documents (invoices, orders, etc.) from Flourio and stores locally
 * @created 2026-03-31
 *
 * Architecture: Pulls documents from Flourio, resolves vendor/product links,
 * upserts into local FlourioDocument collection.
 *
 * Uses incremental pull: only fetches documents updated since last sync.
 */

import { FlourioClient } from '../client/FlourioClient';
import { FlourioDocument } from '../../../models/FlourioDocument';
import { Product } from '../../../models/Product';
import User from '../../../models/User';
import type {
  Document as FlourioDocType,
  DocumentQueryParams,
  PaginatedResponse
} from '../generated/api-types';
import logger from '../../../utils/logger';

export interface DocumentPullResult {
  created: number;
  updated: number;
  errors: Array<{ flourioId: string; error: string }>;
  duration: number;
}

export class DocumentPullService {
  constructor(private client: FlourioClient) {}

  /**
   * Pull documents from Flourio and upsert locally.
   * Main entry point — called by the cron job.
   */
  async pullAll(options?: { fullResync?: boolean }): Promise<DocumentPullResult> {
    const startTime = Date.now();
    const result: DocumentPullResult = {
      created: 0,
      updated: 0,
      errors: [],
      duration: 0
    };

    try {
      // Step 1: Determine from-date for incremental pull
      const fromDate = options?.fullResync
        ? undefined
        : await this.getLastPullDate();

      logger.info('[DocumentPullService] Starting document pull', {
        fromDate: fromDate?.toISOString() || 'full resync'
      });

      // Step 2: Build entity resolution maps (once per cycle)
      const [partnerToVendor, articleToProduct] = await Promise.all([
        this.buildPartnerToVendorMap(),
        this.buildArticleToProductMap()
      ]);

      // Step 3: Fetch documents from Flourio
      const documents = await this.fetchDocuments(fromDate);

      logger.info('[DocumentPullService] Fetched documents', {
        count: documents.length
      });

      // Step 4: Upsert each document
      const now = new Date();
      for (const doc of documents) {
        try {
          // doc.businesspartner ist der ENDKUNDE des Kassenbons — die
          // abrechnungsrelevante Vendor-Zuordnung läuft auf Zeilenebene
          // (item.ref → Product.vendorId); das doc-Level-vendorId ist informativ.
          const vendorId = doc.businesspartner
            ? partnerToVendor.get(doc.businesspartner) || undefined
            : undefined;

          // Echter flour.io-Vertrag (2026-07-08): ref/amount/price/totalExVat/
          // totalIncVat statt der früher angenommenen articleId/quantity/total
          const items = (doc.items || []).map(item => ({
            flourioArticleId: item.ref || '',
            productId: item.ref ? articleToProduct.get(item.ref) || undefined : undefined,
            title: item.title,
            quantity: item.amount,
            unitPrice: item.price,
            taxRate: item.taxRate,
            discount: item.discount,
            netTotal: item.totalExVat,
            grossTotal: item.totalIncVat,
            cancelled: item.cancelled === true
          }));

          const upsertData = {
            flourioId: doc._id,
            type: doc.type,
            number: String(doc.number ?? ''),
            date: new Date(doc.date),
            flourioBusinessPartnerId: doc.businesspartner,
            vendorId,
            items,
            netTotal: doc.totalExVat,
            grossTotal: doc.totalIncVat,
            currency: doc.currency?.iso || 'EUR', // flour.io liefert ein Currency-Objekt
            status: doc.status != null ? String(doc.status) : undefined,
            paymentStatus: doc.paymentStatus != null ? String(doc.paymentStatus) : undefined,
            isVoided: doc.isVoided === true || doc.isVoid === true,
            credit: doc.credit === true,
            notes: doc.description,
            lastPulledAt: now,
            flourioCreatedAt: new Date(doc.createdAt),
            flourioUpdatedAt: new Date(doc.updatedAt)
          };

          const existing = await FlourioDocument.findOneAndUpdate(
            { flourioId: doc._id },
            { $set: upsertData },
            { upsert: true, new: true }
          );

          if (existing.createdAt.getTime() === existing.updatedAt.getTime()) {
            result.created++;
          } else {
            result.updated++;
          }
        } catch (error: any) {
          result.errors.push({
            flourioId: doc._id,
            error: error.message
          });
          logger.warn('[DocumentPullService] Failed to upsert document', {
            flourioId: doc._id,
            error: error.message
          });
        }
      }

      logger.info('[DocumentPullService] Pull completed', {
        created: result.created,
        updated: result.updated,
        errors: result.errors.length
      });
    } catch (error: any) {
      logger.error('[DocumentPullService] Pull failed', { error: error.message });
      result.errors.push({ flourioId: '*', error: error.message });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get the most recent flourioUpdatedAt from local documents,
   * minus a 5-minute safety buffer for incremental pull.
   */
  private async getLastPullDate(): Promise<Date | undefined> {
    const latest = await FlourioDocument.findOne()
      .sort({ flourioUpdatedAt: -1 })
      .select('flourioUpdatedAt')
      .lean();

    if (!latest?.flourioUpdatedAt) return undefined;

    // 5 minute safety buffer
    return new Date(latest.flourioUpdatedAt.getTime() - 5 * 60 * 1000);
  }

  /**
   * Build map: flourioBusinessPartnerId → local vendorId
   */
  private async buildPartnerToVendorMap(): Promise<Map<string, any>> {
    const vendors = await User.find(
      { flourioPartnerId: { $exists: true, $ne: null } },
      { _id: 1, flourioPartnerId: 1 }
    ).lean();

    const map = new Map<string, any>();
    for (const vendor of vendors) {
      if (vendor.flourioPartnerId) {
        map.set(vendor.flourioPartnerId, vendor._id);
      }
    }
    return map;
  }

  /**
   * Build map: flourioArticleId → local productId
   */
  private async buildArticleToProductMap(): Promise<Map<string, any>> {
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
   * Fetch documents from Flourio, optionally filtered by date.
   */
  private async fetchDocuments(fromDate?: Date): Promise<FlourioDocType[]> {
    const allDocs: FlourioDocType[] = [];
    let page = 1;
    const pageSize = 100;

    const params: DocumentQueryParams = { page, pageSize };
    if (fromDate) {
      params.fromDate = fromDate.toISOString().split('T')[0];
    }

    try {
      let hasMore = true;
      while (hasMore) {
        params.page = page;
        const response = await this.client.get<PaginatedResponse<FlourioDocType> | FlourioDocType[]>(
          '/documents',
          { params }
        );

        if (Array.isArray(response)) {
          allDocs.push(...response);
          hasMore = false;
        } else {
          allDocs.push(...response.data);
          if (page >= response.totalPages || response.data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }
    } catch (error: any) {
      logger.warn('[DocumentPullService] Paginated fetch failed, trying simple list', {
        error: error.message
      });
      const docs = await this.client.get<FlourioDocType[]>('/documents', {
        params: fromDate ? { fromDate: fromDate.toISOString().split('T')[0] } : {}
      });
      if (Array.isArray(docs)) {
        allDocs.push(...docs);
      }
    }

    return allDocs;
  }
}
