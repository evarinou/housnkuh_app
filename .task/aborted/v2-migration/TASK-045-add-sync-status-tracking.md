# Task: TASK-045-add-sync-status-tracking
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Sync status models created for tracking all sync operations
- [ ] Error logging system implemented
- [ ] Retry tracking for failed sync operations
- [ ] Performance metrics collection
- [ ] Admin dashboard can query sync status
- [ ] All sync operations properly tracked

## Test Plan
### Unit Tests
- [ ] Test SyncStatus model saves and queries correctly
- [ ] Test SyncErrorLog model tracks errors properly
- [ ] Test retry counter increments correctly
- [ ] Test performance metrics calculation
- [ ] Co-located test file: syncStatusTracking.test.ts

### Integration Tests  
- [ ] Test sync status updates during actual sync operations
- [ ] Test error logging during failed syncs
- [ ] Test admin queries work correctly

### Manual Testing
- [ ] Create sync operations and verify tracking
- [ ] Trigger sync errors and verify logging
- [ ] Test admin dashboard shows correct status

## Implementation Details
Implement comprehensive sync status tracking system:

### Sync Status Model
```typescript
// server/src/models/SyncStatus.ts
export interface ISyncStatus extends Document {
  type: 'document_sync' | 'stock_sync' | 'business_partner_sync' | 'article_sync';
  entityId?: string;  // ID of specific entity being synced (optional)
  status: 'pending' | 'in_progress' | 'synced' | 'error' | 'paused';
  
  // Timestamps
  startedAt?: Date;
  lastSyncAt?: Date;
  nextRetryAt?: Date;
  
  // Progress tracking
  totalItems?: number;
  processedItems?: number;
  successfulItems?: number;
  failedItems?: number;
  
  // Error information
  lastError?: string;
  retryCount: number;
  maxRetries: number;
  
  // Performance metrics
  duration?: number;  // in milliseconds
  averageItemTime?: number;  // average time per item in ms
  
  // Metadata
  metadata?: {
    batchId?: string;
    triggeredBy?: string;  // 'cron' | 'manual' | 'webhook'
    config?: any;
  };
}

const syncStatusSchema = new Schema<ISyncStatus>({
  type: {
    type: String,
    required: true,
    enum: ['document_sync', 'stock_sync', 'business_partner_sync', 'article_sync'],
    index: true
  },
  entityId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_progress', 'synced', 'error', 'paused'],
    index: true
  },
  
  // Timestamps
  startedAt: Date,
  lastSyncAt: Date,
  nextRetryAt: Date,
  
  // Progress tracking
  totalItems: { type: Number, min: 0 },
  processedItems: { type: Number, min: 0, default: 0 },
  successfulItems: { type: Number, min: 0, default: 0 },
  failedItems: { type: Number, min: 0, default: 0 },
  
  // Error information
  lastError: String,
  retryCount: { type: Number, default: 0, min: 0 },
  maxRetries: { type: Number, default: 3, min: 0 },
  
  // Performance metrics
  duration: { type: Number, min: 0 },
  averageItemTime: { type: Number, min: 0 },
  
  // Metadata
  metadata: {
    batchId: String,
    triggeredBy: {
      type: String,
      enum: ['cron', 'manual', 'webhook']
    },
    config: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  index: { type: 1, entityId: 1, status: 1 }
});

export const SyncStatus = model<ISyncStatus>('SyncStatus', syncStatusSchema);
```

### Sync Error Log Model
```typescript
// server/src/models/SyncErrorLog.ts
export interface ISyncErrorLog extends Document {
  type: string;
  entityId?: string;
  errorType: 'network' | 'validation' | 'business_logic' | 'system' | 'unknown';
  errorMessage: string;
  errorStack?: string;
  
  // Context
  requestData?: any;
  responseData?: any;
  
  // Retry information
  retryCount: number;
  canRetry: boolean;
  nextRetryAt?: Date;
  
  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

const syncErrorLogSchema = new Schema<ISyncErrorLog>({
  type: { type: String, required: true, index: true },
  entityId: { type: String, index: true },
  errorType: {
    type: String,
    required: true,
    enum: ['network', 'validation', 'business_logic', 'system', 'unknown']
  },
  errorMessage: { type: String, required: true },
  errorStack: String,
  
  // Context
  requestData: Schema.Types.Mixed,
  responseData: Schema.Types.Mixed,
  
  // Retry information
  retryCount: { type: Number, default: 0 },
  canRetry: { type: Boolean, default: true },
  nextRetryAt: Date,
  
  // Resolution
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolution: String
}, {
  timestamps: true,
  index: { type: 1, resolved: 1, createdAt: -1 }
});

export const SyncErrorLog = model<ISyncErrorLog>('SyncErrorLog', syncErrorLogSchema);
```

### Sync Tracking Service
```typescript
// server/src/services/syncTrackingService.ts
export class SyncTrackingService {
  
  async startSync(type: string, entityId?: string, metadata?: any): Promise<ISyncStatus> {
    const syncStatus = new SyncStatus({
      type,
      entityId,
      status: 'in_progress',
      startedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      metadata
    });
    
    await syncStatus.save();
    return syncStatus;
  }

  async updateProgress(
    syncId: string, 
    progress: { 
      processedItems?: number;
      successfulItems?: number;
      failedItems?: number;
      totalItems?: number;
    }
  ): Promise<void> {
    await SyncStatus.findByIdAndUpdate(syncId, {
      ...progress,
      lastSyncAt: new Date()
    });
  }

  async completeSync(syncId: string, success: boolean, error?: string): Promise<void> {
    const syncStatus = await SyncStatus.findById(syncId);
    if (!syncStatus) return;

    const duration = Date.now() - syncStatus.startedAt.getTime();
    
    const updateData: any = {
      status: success ? 'synced' : 'error',
      lastSyncAt: new Date(),
      duration
    };

    if (success) {
      updateData.retryCount = 0;
    } else {
      updateData.lastError = error;
      updateData.retryCount = syncStatus.retryCount + 1;
      
      // Schedule retry if within retry limits
      if (updateData.retryCount <= syncStatus.maxRetries) {
        updateData.nextRetryAt = this.calculateNextRetry(updateData.retryCount);
        updateData.status = 'pending';
      }
    }

    // Calculate average item time if we have item counts
    if (syncStatus.processedItems > 0) {
      updateData.averageItemTime = duration / syncStatus.processedItems;
    }

    await SyncStatus.findByIdAndUpdate(syncId, updateData);
  }

  async logError(
    type: string,
    error: Error,
    context: {
      entityId?: string;
      requestData?: any;
      responseData?: any;
      canRetry?: boolean;
    }
  ): Promise<ISyncErrorLog> {
    const errorType = this.categorizeError(error);
    
    const errorLog = new SyncErrorLog({
      type,
      entityId: context.entityId,
      errorType,
      errorMessage: error.message,
      errorStack: error.stack,
      requestData: context.requestData,
      responseData: context.responseData,
      canRetry: context.canRetry !== false,
      retryCount: 0
    });

    await errorLog.save();
    return errorLog;
  }

  async getSyncStatus(type?: string, entityId?: string): Promise<ISyncStatus[]> {
    const filter: any = {};
    if (type) filter.type = type;
    if (entityId) filter.entityId = entityId;

    return SyncStatus.find(filter)
      .sort({ lastSyncAt: -1 })
      .limit(100);
  }

  async getSyncMetrics(type: string, timeRange?: { from: Date; to: Date }) {
    const matchStage: any = { type };
    if (timeRange) {
      matchStage.lastSyncAt = { $gte: timeRange.from, $lte: timeRange.to };
    }

    const metrics = await SyncStatus.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSyncs: { $sum: 1 },
          successfulSyncs: { $sum: { $cond: [{ $eq: ['$status', 'synced'] }, 1, 0] } },
          failedSyncs: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          averageDuration: { $avg: '$duration' },
          totalItemsProcessed: { $sum: '$processedItems' },
          totalItemsSuccessful: { $sum: '$successfulItems' },
          totalItemsFailed: { $sum: '$failedItems' }
        }
      }
    ]);

    return metrics[0] || {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageDuration: 0,
      totalItemsProcessed: 0,
      totalItemsSuccessful: 0,
      totalItemsFailed: 0
    };
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'network';
    }
    if (error.message.includes('validation')) {
      return 'validation';
    }
    if (error.message.includes('business') || error.message.includes('rule')) {
      return 'business_logic';
    }
    if (error.message.includes('system') || error.message.includes('database')) {
      return 'system';
    }
    return 'unknown';
  }

  private calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 1min, 2min, 4min, 8min, etc.
    const baseDelay = 60 * 1000; // 1 minute
    const delay = baseDelay * Math.pow(2, retryCount - 1);
    const maxDelay = 60 * 60 * 1000; // 1 hour maximum
    
    return new Date(Date.now() + Math.min(delay, maxDelay));
  }
}
```

### Admin Query Service
```typescript
// server/src/services/syncStatusQueryService.ts
export class SyncStatusQueryService {
  
  async getDashboardStats(): Promise<SyncDashboardStats> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const [recentStatus, errorCounts] = await Promise.all([
      this.getRecentSyncStatus(oneDayAgo),
      this.getErrorCounts(oneDayAgo)
    ]);

    return {
      recentSyncs: recentStatus,
      errorsByType: errorCounts,
      lastUpdated: now
    };
  }

  private async getRecentSyncStatus(since: Date) {
    return SyncStatus.aggregate([
      { $match: { lastSyncAt: { $gte: since } } },
      {
        $group: {
          _id: '$type',
          totalSyncs: { $sum: 1 },
          successful: { $sum: { $cond: [{ $eq: ['$status', 'synced'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          lastSync: { $max: '$lastSyncAt' }
        }
      }
    ]);
  }

  private async getErrorCounts(since: Date) {
    return SyncErrorLog.aggregate([
      { $match: { createdAt: { $gte: since }, resolved: false } },
      {
        $group: {
          _id: '$errorType',
          count: { $sum: 1 }
        }
      }
    ]);
  }
}
```

## Dependencies
- All other sync services will depend on this for status tracking

## Definition of Done
- [ ] SyncStatus model implemented with comprehensive tracking
- [ ] SyncErrorLog model tracks all sync failures
- [ ] SyncTrackingService provides easy API for tracking
- [ ] Retry logic with exponential backoff implemented
- [ ] Performance metrics collection working
- [ ] Admin query service for dashboard data
- [ ] All models properly indexed for performance
- [ ] All unit tests implemented and passing
- [ ] Integration tests verify tracking works
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)