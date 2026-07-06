# Task: TASK-034-update-mietfach-model
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Mietfach model updated with flourioStockId field
- [ ] Field properly typed as optional string
- [ ] Database index created for efficient lookups
- [ ] Migration script created for schema update
- [ ] Validation rules updated to handle new field
- [ ] All existing tests passing with model changes

## Test Plan
### Unit Tests
- [ ] Test Mietfach model with flourioStockId field
- [ ] Test validation accepts valid ObjectId format
- [ ] Test field remains optional during creation
- [ ] Test queries work with new index
- [ ] Co-located test file: Mietfach.test.ts

### Integration Tests  
- [ ] Test database operations with new field
- [ ] Test migration script doesn't break existing data
- [ ] Test API endpoints accept new field

### Manual Testing
- [ ] Verify existing Mietfächer load correctly
- [ ] Test creating new Mietfach with flourioStockId
- [ ] Verify database index is created

## Implementation Details
Update Mietfach model to include Flourio Stock tracking:

### Model Changes
```typescript
// server/src/models/Mietfach.ts
interface IMietfach {
  // existing fields...
  flourioStockId?: string;  // Reference to Flourio Stock
  flourioSyncStatus?: 'pending' | 'synced' | 'error';
  flourioLastSyncAt?: Date;
  flourioLastError?: string;
}
```

### Database Migration
Create migration script to add new fields without data loss

### Index Creation
```javascript
// Add index for efficient Flourio lookups
db.mietfaecher.createIndex({ "flourioStockId": 1 });
```

## Dependencies
- TASK-031-map-mietfach-to-stock (mapping schema needed)

## Definition of Done
- [ ] Mietfach model updated with Flourio fields
- [ ] Database migration script created and tested
- [ ] Index created for flourioStockId field
- [ ] All unit tests updated and passing
- [ ] Integration tests verify database operations
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)