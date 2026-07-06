# Task: TASK-035-create-businesspartner-service
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] BusinessPartner API service implemented
- [ ] CRUD operations working with Flourio API
- [ ] Vendor-to-BusinessPartner mapping implemented
- [ ] Error handling and validation implemented
- [ ] Sync status tracking working
- [ ] All unit tests passing

## Test Plan
### Unit Tests
- [ ] Test BusinessPartner creation from vendor data
- [ ] Test BusinessPartner update operations
- [ ] Test error handling for API failures
- [ ] Test mapping validation
- [ ] Co-located test file: businessPartnerService.test.ts

### Integration Tests  
- [ ] Test actual API calls to Flourio BusinessPartner endpoints
- [ ] Test sync status persistence in database
- [ ] Test recovery from failed sync operations

### Manual Testing
- [ ] Verify BusinessPartners are created in Flourio dashboard
- [ ] Test sync status updates correctly
- [ ] Verify error recovery works as expected

## Implementation Details
Implement BusinessPartnerService for vendor management:

### Core Methods
- `createBusinessPartnerFromVendor(vendorId: string): Promise<BusinessPartner>`
- `updateBusinessPartner(partnerId: string, data: Partial<BusinessPartner>): Promise<BusinessPartner>`
- `deleteBusinessPartner(partnerId: string): Promise<void>`
- `syncVendorToBusinessPartner(vendorId: string): Promise<SyncResult>`

### Vendor to BusinessPartner Mapping
```typescript
interface VendorToBusinessPartnerMapping {
  companyName: string;        // vendor.businessName
  contactPerson: string;      // vendor.firstName + lastName
  email: string;              // vendor.email
  phone?: string;             // vendor.phone
  address: {
    street: string;           // vendor.address.street
    city: string;             // vendor.address.city
    postalCode: string;       // vendor.address.postalCode
    country: string;          // vendor.address.country
  };
  metadata: {
    housnkuhVendorId: string;
    registrationDate: Date;
    vendorType: string;
  }
}
```

### Sync Status Tracking
```typescript
interface BusinessPartnerSyncStatus {
  vendorId: string;
  flourioPartnerId?: string;
  status: 'pending' | 'synced' | 'error' | 'deleted';
  lastSyncAt?: Date;
  lastError?: string;
  retryCount: number;
}
```

## Dependencies
- TASK-027-create-flourio-service-structure (folder structure)
- TASK-028-implement-api-client (HTTP client)
- TASK-030-create-typescript-types (type definitions)

## Definition of Done
- [ ] BusinessPartnerService class fully implemented
- [ ] All CRUD operations working with Flourio API
- [ ] Vendor mapping implemented and tested
- [ ] Sync status tracking working correctly
- [ ] Error handling and retry logic implemented
- [ ] All unit tests implemented and passing
- [ ] Integration tests with real API passing
- [ ] TypeScript compilation successful
- [ ] Code review completed (if applicable)