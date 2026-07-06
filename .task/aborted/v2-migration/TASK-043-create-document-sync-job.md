# Task: TASK-043-create-document-sync-job
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] 5-minute cron job implemented for document synchronization
- [ ] Job fetches new documents from Flourio API
- [ ] Documents mapped to appropriate invoice records
- [ ] Sync status tracking implemented
- [ ] Error handling and retry logic working
- [ ] Job monitoring and logging implemented

## Test Plan
### Unit Tests
- [ ] Test cron job scheduling works correctly
- [ ] Test document fetching and filtering logic
- [ ] Test error handling for API failures
- [ ] Test retry logic for failed documents
- [ ] Co-located test file: documentSyncJob.test.ts

### Integration Tests  
- [ ] Test complete sync workflow with real API
- [ ] Test job runs at correct intervals
- [ ] Test database updates persist correctly

### Manual Testing
- [ ] Verify cron job starts automatically
- [ ] Create test document in Flourio and verify sync
- [ ] Test job recovery after server restart

## Implementation Details
Implement scheduled document synchronization service:

### Main Sync Job
```typescript
// server/src/jobs/documentSyncJob.ts
import cron from 'node-cron';
import { DocumentSyncService } from '../services/flourio/documentSyncService';
import { logger } from '../utils/logger';

export class DocumentSyncJob {
  private syncService: DocumentSyncService;
  private isRunning: boolean = false;
  
  constructor() {
    this.syncService = new DocumentSyncService();
  }

  start() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Document sync job already running, skipping this cycle');
        return;
      }

      try {
        this.isRunning = true;
        logger.info('Starting document sync job');
        
        const result = await this.syncService.syncDocuments();
        
        logger.info(`Document sync completed: ${result.synced} synced, ${result.failed} failed`);
      } catch (error) {
        logger.error('Document sync job failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Document sync job scheduled to run every 5 minutes');
  }

  async runOnce(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync job already running');
    }

    try {
      this.isRunning = true;
      return await this.syncService.syncDocuments();
    } finally {
      this.isRunning = false;
    }
  }
}
```

### Document Sync Service
```typescript
// server/src/services/flourio/documentSyncService.ts
export interface SyncResult {
  synced: number;
  failed: number;
  errors: SyncError[];
}

export interface SyncError {
  documentId: string;
  error: string;
  retryCount: number;
}

export class DocumentSyncService {
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_BATCH_SIZE = 50;

  async syncDocuments(): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp();
      
      // Fetch new documents from Flourio
      const documents = await this.fetchNewDocuments(lastSync);
      
      logger.info(`Found ${documents.length} new documents to sync`);

      // Process documents in batches
      for (let i = 0; i < documents.length; i += this.SYNC_BATCH_SIZE) {
        const batch = documents.slice(i, i + this.SYNC_BATCH_SIZE);
        const batchResult = await this.processBatch(batch);
        
        result.synced += batchResult.synced;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp();
      
      return result;
    } catch (error) {
      logger.error('Document sync failed:', error);
      throw error;
    }
  }

  private async fetchNewDocuments(since: Date): Promise<FlourioDocument[]> {
    try {
      const response = await flourioClient.get('/documents', {
        params: {
          since: since.toISOString(),
          type: ['invoice', 'receipt', 'credit_note'],
          limit: 1000
        }
      });

      return response.data.documents;
    } catch (error) {
      logger.error('Failed to fetch documents from Flourio:', error);
      throw error;
    }
  }

  private async processBatch(documents: FlourioDocument[]): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    await Promise.allSettled(
      documents.map(async (doc) => {
        try {
          await this.processDocument(doc);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            documentId: doc.id,
            error: error.message,
            retryCount: await this.getRetryCount(doc.id)
          });
        }
      })
    );

    return result;
  }

  private async processDocument(document: FlourioDocument): Promise<void> {
    // Check if document already exists
    const existingInvoice = await Invoice.findOne({ 
      flourioDocumentId: document.id 
    });

    if (existingInvoice) {
      // Update existing invoice if needed
      await this.updateExistingInvoice(existingInvoice, document);
    } else {
      // Create new invoice from document
      await this.createInvoiceFromDocument(document);
    }

    // Mark document as synced
    await this.markDocumentSynced(document.id);
  }

  private async createInvoiceFromDocument(document: FlourioDocument): Promise<Invoice> {
    const mappedInvoice = await invoiceMappingService.mapDocumentToInvoice(document);
    
    const invoice = new Invoice({
      ...mappedInvoice,
      flourioDocumentId: document.id,
      flourioSyncStatus: 'synced',
      flourioLastSyncAt: new Date()
    });

    await invoice.save();
    
    logger.info(`Created invoice ${invoice._id} from Flourio document ${document.id}`);
    return invoice;
  }

  private async updateExistingInvoice(invoice: Invoice, document: FlourioDocument): Promise<void> {
    // Only update if document was modified after last sync
    if (new Date(document.updatedAt) > invoice.flourioLastSyncAt) {
      const updatedData = await invoiceMappingService.mapDocumentToInvoice(document);
      
      Object.assign(invoice, updatedData);
      invoice.flourioLastSyncAt = new Date();
      
      await invoice.save();
      logger.info(`Updated invoice ${invoice._id} from Flourio document ${document.id}`);
    }
  }

  private async getLastSyncTimestamp(): Promise<Date> {
    const syncStatus = await SyncStatus.findOne({ type: 'document_sync' });
    return syncStatus?.lastSyncAt || new Date(0); // Start from beginning if no previous sync
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    await SyncStatus.findOneAndUpdate(
      { type: 'document_sync' },
      { lastSyncAt: new Date() },
      { upsert: true }
    );
  }

  private async getRetryCount(documentId: string): Promise<number> {
    const errorLog = await SyncErrorLog.findOne({ 
      documentId, 
      type: 'document_sync' 
    });
    return errorLog?.retryCount || 0;
  }

  private async markDocumentSynced(documentId: string): Promise<void> {
    await SyncStatus.findOneAndUpdate(
      { documentId, type: 'document_sync' },
      { 
        status: 'synced',
        lastSyncAt: new Date(),
        retryCount: 0
      },
      { upsert: true }
    );
  }
}
```

### Job Initialization
```typescript
// server/src/app.ts
import { DocumentSyncJob } from './jobs/documentSyncJob';

// Initialize and start sync job
const documentSyncJob = new DocumentSyncJob();

// Start job only in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SYNC_JOBS === 'true') {
  documentSyncJob.start();
  logger.info('Document sync job started');
}

// Expose job for manual triggers (admin endpoints)
app.set('documentSyncJob', documentSyncJob);
```

### Admin Control Endpoints
```typescript
// server/src/controllers/adminSyncController.ts
export class AdminSyncController {
  async triggerDocumentSync(req: Request, res: Response) {
    try {
      const job = req.app.get('documentSyncJob') as DocumentSyncJob;
      const result = await job.runOnce();
      
      res.json({
        success: true,
        message: 'Document sync completed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSyncStatus(req: Request, res: Response) {
    try {
      const status = await SyncStatus.find({ type: 'document_sync' })
        .sort({ lastSyncAt: -1 })
        .limit(10);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}
```

## Dependencies
- TASK-044-implement-invoice-mapping (mapping service needed)
- TASK-045-add-sync-status-tracking (sync status models needed)

## Definition of Done
- [ ] Cron job runs every 5 minutes automatically
- [ ] Documents fetched and processed correctly
- [ ] Invoice records created/updated properly
- [ ] Sync status tracked in database
- [ ] Error handling and retry logic working
- [ ] Admin endpoints for manual control
- [ ] Comprehensive logging implemented
- [ ] All unit tests implemented and passing
- [ ] Integration tests verify sync workflow
- [ ] Job monitoring dashboard shows status
- [ ] Code review completed (if applicable)