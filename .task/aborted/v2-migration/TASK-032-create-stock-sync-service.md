# Task: TASK-032-create-stock-sync-service
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Stock synchronization service implemented
- [ ] Create, update, and delete operations working
- [ ] Sync status tracking implemented
- [ ] Error handling and retry logic implemented
- [ ] Batch operations supported
- [ ] All unit tests passing
- [ ] Integration tests with Flourio API passing

## Test Plan
### Unit Tests
- [ ] Test stock creation with valid Mietfach data
- [ ] Test stock update when Mietfach changes
- [ ] Test stock deletion when Mietfach is removed
- [ ] Test error handling for API failures
- [ ] Test batch operation scenarios
- [ ] Co-located test file: stockSyncService.test.ts

### Integration Tests  
- [ ] Test actual API calls to Flourio Stock endpoints
- [ ] Test sync status persistence in database
- [ ] Test recovery from failed sync operations

### Manual Testing
- [ ] Verify stocks are created in Flourio dashboard
- [ ] Test sync status updates correctly
- [ ] Verify error recovery works as expected

## Implementation Details
Implement StockSyncService with:

### Core Methods
- `syncMietfachToStock(mietfachId: string): Promise<SyncResult>`
- `syncAllMietfaecher(): Promise<BatchSyncResult>`
- `deleteMietfachStock(mietfachId: string): Promise<void>`
- `getSyncStatus(mietfachId: string): Promise<SyncStatus>`

### Sync Status Tracking
```typescript
interface SyncStatus {
  mietfachId: string;
  flourioStockId?: string;
  status: 'pending' | 'synced' | 'error' | 'deleted';
  lastSyncAt?: Date;
  lastError?: string;
  retryCount: number;
}
```

### Error Handling
- Retry failed operations up to 3 times
- Log all sync operations for debugging
- Update sync status on all operations

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure)
- TASK-028-implement-api-client (HTTP client)
- TASK-030-create-typescript-types (type definitions)
- TASK-031-map-mietfach-to-stock (mapping functions)

## Definition of Done
- [ ] StockSyncService class fully implemented
- [ ] All CRUD operations working with Flourio API
- [ ] Sync status tracking working correctly
- [ ] Error handling and retry logic implemented
- [ ] Batch operations working efficiently
- [ ] All unit tests implemented and passing
- [ ] Integration tests with real API passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)