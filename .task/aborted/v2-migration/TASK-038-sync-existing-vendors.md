# Task: TASK-038-sync-existing-vendors
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Migration script created for existing vendors
- [ ] All existing vendors successfully synced to Flourio BusinessPartners
- [ ] Sync status properly tracked in database
- [ ] Rollback mechanism implemented for failed migrations
- [ ] Progress reporting during migration
- [ ] All tests passing

## Test Plan
### Unit Tests
- [ ] Test migration script with sample vendor data
- [ ] Test rollback functionality
- [ ] Test progress reporting
- [ ] Test error handling during migration
- [ ] Co-located test file: vendorMigration.test.ts

### Integration Tests  
- [ ] Test full migration with real database
- [ ] Test migration with Flourio API
- [ ] Test rollback with partial failure

### Manual Testing
- [ ] Run migration on development database
- [ ] Verify all vendors appear in Flourio dashboard
- [ ] Test rollback mechanism manually

## Implementation Details
Create migration script with comprehensive error handling:

### Migration Script Structure
```typescript
// server/src/migrations/flourio-vendor-sync.ts
export async function migrateVendorsToFlourioBusinessPartners() {
  const vendors = await User.find({ 
    role: 'vendor',
    flourioPartnerId: { $exists: false } 
  });
  
  console.log(`Starting migration of ${vendors.length} vendors...`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const [index, vendor] of vendors.entries()) {
    try {
      const result = await businessPartnerService.createBusinessPartnerFromVendor(vendor._id);
      
      await User.findByIdAndUpdate(vendor._id, {
        flourioPartnerId: result.partnerId,
        flourioSyncStatus: 'synced',
        flourioLastSyncAt: new Date()
      });
      
      results.success++;
      console.log(`✓ [${index + 1}/${vendors.length}] Synced vendor: ${vendor.email}`);
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        vendorId: vendor._id,
        email: vendor.email,
        error: error.message
      });
      
      await User.findByIdAndUpdate(vendor._id, {
        flourioSyncStatus: 'error',
        flourioLastError: error.message,
        flourioLastSyncAt: new Date()
      });
      
      console.error(`✗ [${index + 1}/${vendors.length}] Failed vendor: ${vendor.email} - ${error.message}`);
    }
  }
  
  return results;
}
```

### Features
- Progress reporting (X of Y completed)
- Error logging with detailed information
- Ability to resume interrupted migrations
- Dry-run mode for testing
- Rollback capability for failed BusinessPartners

### CLI Command
Create npm script to run migration:
```bash
npm run migrate:flourio-partners
```

### Rollback Implementation
```typescript
export async function rollbackVendorMigration(vendorIds?: string[]) {
  const filter = vendorIds 
    ? { _id: { $in: vendorIds } }
    : { flourioPartnerId: { $exists: true } };
    
  const vendors = await User.find(filter);
  
  for (const vendor of vendors) {
    try {
      if (vendor.flourioPartnerId) {
        await businessPartnerService.deleteBusinessPartner(vendor.flourioPartnerId);
      }
      
      await User.findByIdAndUpdate(vendor._id, {
        $unset: {
          flourioPartnerId: 1,
          flourioSyncStatus: 1,
          flourioLastSyncAt: 1,
          flourioLastError: 1
        }
      });
      
      console.log(`Rolled back vendor: ${vendor.email}`);
    } catch (error) {
      console.error(`Failed to rollback vendor ${vendor.email}:`, error);
    }
  }
}
```

## Dependencies
- TASK-035-create-businesspartner-service (service must exist)
- TASK-037-update-vendor-model (model updates needed)

## Definition of Done
- [ ] Migration script fully implemented
- [ ] All existing vendors successfully migrated
- [ ] Progress reporting working correctly
- [ ] Error handling prevents data loss
- [ ] Rollback mechanism tested and working
- [ ] CLI command available for future use
- [ ] All unit tests implemented and passing
- [ ] Integration tests with database passing
- [ ] Migration documented for future reference
- [ ] Code review completed (if applicable)