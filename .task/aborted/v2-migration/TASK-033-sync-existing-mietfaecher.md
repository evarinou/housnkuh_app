# Task: TASK-033-sync-existing-mietfaecher
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Migration script created for existing Mietfächer
- [ ] All existing Mietfächer successfully synced to Flourio Stocks
- [ ] Sync status properly tracked in database
- [ ] Rollback mechanism implemented for failed migrations
- [ ] Progress reporting during migration
- [ ] All tests passing

## Test Plan
### Unit Tests
- [ ] Test migration script with sample data
- [ ] Test rollback functionality
- [ ] Test progress reporting
- [ ] Test error handling during migration
- [ ] Co-located test file: mietfachMigration.test.ts

### Integration Tests  
- [ ] Test full migration with real database
- [ ] Test migration with Flourio API
- [ ] Test rollback with partial failure

### Manual Testing
- [ ] Run migration on development database
- [ ] Verify all Mietfächer appear in Flourio dashboard
- [ ] Test rollback mechanism manually

## Implementation Details
Create migration script with:

### Migration Script Structure
```typescript
// server/src/migrations/flourio-mietfach-sync.ts
export async function migrateMietfaecherToFlourioStocks() {
  const mietfaecher = await Mietfach.find({ flourioStockId: { $exists: false } });
  
  for (const mietfach of mietfaecher) {
    try {
      await stockSyncService.syncMietfachToStock(mietfach._id);
      console.log(`Synced Mietfach ${mietfach.nummer}`);
    } catch (error) {
      console.error(`Failed to sync ${mietfach.nummer}:`, error);
      // Continue with next item
    }
  }
}
```

### Features
- Progress reporting (X of Y completed)
- Error logging with detailed information
- Ability to resume interrupted migrations
- Dry-run mode for testing
- Rollback capability for failed stocks

### CLI Command
Create npm script to run migration:
```bash
npm run migrate:flourio-stocks
```

## Dependencies
- TASK-032-create-stock-sync-service (sync service must exist)
- TASK-034-update-mietfach-model (model updates needed)

## Definition of Done
- [ ] Migration script fully implemented
- [ ] All existing Mietfächer successfully migrated
- [ ] Progress reporting working correctly
- [ ] Error handling prevents data loss
- [ ] Rollback mechanism tested and working
- [ ] CLI command available for future use
- [ ] All unit tests implemented and passing
- [ ] Integration tests with database passing
- [ ] Migration documented for future reference
- [ ] Code review completed (if applicable)