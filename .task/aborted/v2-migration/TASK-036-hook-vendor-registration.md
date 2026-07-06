# Task: TASK-036-hook-vendor-registration
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Post-registration hook implemented
- [ ] BusinessPartner created automatically on vendor approval
- [ ] Hook integrated into existing vendor approval workflow
- [ ] Error handling prevents vendor approval failures
- [ ] Sync status tracked in database
- [ ] All tests passing with hook integration

## Test Plan
### Unit Tests
- [ ] Test hook triggers on vendor approval
- [ ] Test hook handles BusinessPartner creation errors gracefully
- [ ] Test hook updates vendor with Flourio Partner ID
- [ ] Test hook doesn't block vendor approval on API failures
- [ ] Co-located test file: vendorRegistrationHook.test.ts

### Integration Tests  
- [ ] Test complete vendor approval workflow with hook
- [ ] Test hook recovery from Flourio API failures
- [ ] Test database consistency after hook execution

### Manual Testing
- [ ] Approve vendor and verify BusinessPartner creation
- [ ] Test workflow continues if Flourio API is unavailable
- [ ] Verify vendor record includes Flourio Partner ID

## Implementation Details
Implement post-registration hook for automatic BusinessPartner creation:

### Hook Integration Points
```typescript
// In vendor approval workflow
async function approveVendor(vendorId: string) {
  try {
    // Existing approval logic
    await updateVendorStatus(vendorId, 'approved');
    
    // New: Create BusinessPartner hook
    await createBusinessPartnerHook(vendorId);
    
  } catch (error) {
    // Handle errors without blocking approval
    console.error('BusinessPartner creation failed:', error);
  }
}
```

### Hook Implementation
```typescript
// server/src/hooks/businessPartnerHook.ts
export async function createBusinessPartnerHook(vendorId: string) {
  try {
    const result = await businessPartnerService.createBusinessPartnerFromVendor(vendorId);
    
    // Update vendor with Flourio Partner ID
    await Vendor.findByIdAndUpdate(vendorId, {
      flourioPartnerId: result.partnerId,
      flourioSyncStatus: 'synced',
      flourioLastSyncAt: new Date()
    });
    
    return result;
  } catch (error) {
    // Log error but don't throw - don't block approval
    await Vendor.findByIdAndUpdate(vendorId, {
      flourioSyncStatus: 'error',
      flourioLastError: error.message,
      flourioLastSyncAt: new Date()
    });
    
    console.error(`BusinessPartner creation failed for vendor ${vendorId}:`, error);
    return null;
  }
}
```

### Error Handling Strategy
- Hook failures do not prevent vendor approval
- Errors are logged and stored in vendor record
- Failed sync can be retried manually or via batch job
- Admin dashboard shows sync status

## Dependencies
- TASK-035-create-businesspartner-service (service must exist)
- TASK-037-update-vendor-model (vendor model updates needed)

## Definition of Done
- [ ] Hook integrated into vendor approval workflow
- [ ] BusinessPartner automatically created on approval
- [ ] Error handling prevents approval blocking
- [ ] Vendor record updated with Flourio Partner ID
- [ ] Failed syncs tracked for manual retry
- [ ] All unit tests implemented and passing
- [ ] Integration tests verify complete workflow
- [ ] Admin can see sync status in dashboard
- [ ] Code review completed (if applicable)