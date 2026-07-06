# Example: BusinessPartner Synchronization

## Overview

This example demonstrates how to synchronize housnkuh vendors with FlourIO BusinessPartners using the implemented mapping service.

## Prerequisites

- FlourIO Bearer Token configured in `.env.local`
- housnkuh vendor data in MongoDB
- FlourioClient initialized

## Implementation

### 1. Service Setup

```typescript
import { BusinessPartnerService } from './services/flourio/services/BusinessPartnerService';
import { BusinessPartnerSyncService } from './services/flourio/services/businessPartnerSyncService';
import { FlourioClient } from './services/flourio/client/FlourioClient';

// Initialize client
const client = new FlourioClient({
  baseURL: process.env.FLOURIO_API_URL!,
  bearerToken: process.env.FLOURIO_BEARER_TOKEN!,
  rateLimitConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffFactor: 2
  }
});

// Initialize services
const bpService = new BusinessPartnerService(client);
const syncService = new BusinessPartnerSyncService(bpService);
```

### 2. Sync Single Vendor

```typescript
import User from './models/User';

// Get vendor from database
const vendor = await User.findById(vendorId);

if (!vendor) {
  throw new Error('Vendor not found');
}

// Sync to FlourIO
try {
  const businessPartner = await bpService.syncUser(vendor);

  console.log('✅ Vendor synced successfully');
  console.log('FlourIO ID:', vendor.flourioBusinessPartnerId);
  console.log('Sync Status:', vendor.flourioSyncStatus);

} catch (error) {
  console.error('❌ Sync failed:', error.message);
  console.error('Sync Error:', vendor.flourioSyncError);
}
```

### 3. Bulk Sync All Vendors

```typescript
// Sync all vendors that need synchronization
const result = await syncService.syncAllUsers({
  forceResync: false,  // Only sync if needed
  dryRun: false,       // Actually perform sync
  batchSize: 10        // Process 10 at a time
});

console.log('Sync Results:');
console.log('  Synced:', result.synced);
console.log('  Failed:', result.failed);
console.log('  Skipped:', result.skipped);

// Show errors if any
if (result.errors.length > 0) {
  console.log('\nErrors:');
  result.errors.forEach(err => {
    console.log(`  - ${err.userName}: ${err.error}`);
  });
}
```

### 4. Sync Specific Vendors

```typescript
const vendorIds = [
  '507f1f77bcf86cd799439011',
  '507f191e810c19729de860ea'
];

const result = await syncService.syncUsersByIds(vendorIds, {
  dryRun: false
});

console.log(`Synced ${result.synced}/${vendorIds.length} vendors`);
```

### 5. Check Sync Status

```typescript
const status = await syncService.getSyncStatus();

console.log('Sync Status Overview:');
console.log('  Total vendors:', status.total);
console.log('  Synced:', status.synced);
console.log('  Needs sync:', status.needsSync);
console.log('  Errors:', status.error);
console.log('  Pending:', status.pending);
```

### 6. Retry Failed Syncs

```typescript
const result = await syncService.retryFailedSyncs({
  dryRun: false
});

console.log('Retry Results:');
console.log('  Success:', result.synced);
console.log('  Still failed:', result.failed);
```

## Data Mapping

### housnkuh Vendor → FlourIO BusinessPartner

```typescript
// Vendor data (housnkuh)
const vendor = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max@example.com',
  companyName: 'Bio-Hof Mustermann',
  phone: '+49 123 456789',
  address: {
    street: 'Hauptstraße',
    houseNumber: '42',
    postalCode: '12345',
    city: 'Berlin'
  }
};

// Maps to BusinessPartner (FlourIO)
const businessPartner = {
  address: {
    company1: 'Bio-Hof Mustermann',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    phone: '+49 123 456789',
    street: 'Hauptstraße',
    streetNumber: '42',
    zipCode: '12345',
    city: 'Berlin',
    country: 'Germany'
  },
  addresses: {
    billingAddress: { /* same as above */ },
    deliveryAddress: { /* same as above */ }
  }
};
```

## Change Detection

The sync service only syncs when data has changed:

```typescript
// Check if vendor needs sync
const vendor = await User.findById(vendorId);

if (BusinessPartnerMapper.hasUserChanged(vendor)) {
  console.log('Vendor has changes, sync required');
  await bpService.syncUser(vendor);
} else {
  console.log('Vendor unchanged, skipping sync');
}
```

## Error Handling

```typescript
try {
  await bpService.syncUser(vendor);
} catch (error) {
  if (error.response?.status === 400) {
    console.error('Validation error:', error.response.data);
  } else if (error.response?.status === 429) {
    console.error('Rate limit exceeded, will retry automatically');
  } else if (error.response?.status === 401) {
    console.error('Authentication failed, check Bearer token');
  } else {
    console.error('Sync error:', error.message);
  }

  // Error is also stored in vendor document
  console.log('Stored error:', vendor.flourioSyncError);
}
```

## Testing

### Dry Run Mode

```typescript
// Test without actually syncing
const result = await syncService.syncAllUsers({
  dryRun: true,
  batchSize: 5
});

console.log('[DRY RUN] Would sync:', result.synced);
console.log('[DRY RUN] Would skip:', result.skipped);
console.log('[DRY RUN] Would fail:', result.failed);
```

### Validation

```typescript
// Validate before syncing
const errors = BusinessPartnerMapper.validateUserForSync(vendor);

if (errors.length > 0) {
  console.error('Validation errors:');
  errors.forEach(err => console.error('  -', err));
} else {
  console.log('✅ Vendor data is valid');
}
```

## Monitoring

### Track Sync Metrics

```typescript
// Before sync
const beforeMetrics = client.getRateLimitMetrics();

// Perform sync
await syncService.syncAllUsers();

// After sync
const afterMetrics = client.getRateLimitMetrics();

console.log('API Calls:', afterMetrics.totalRequests - beforeMetrics.totalRequests);
console.log('Rate Limits:', afterMetrics.rateLimitHits - beforeMetrics.rateLimitHits);
```

## Scheduled Sync Job

```typescript
import cron from 'node-cron';

// Sync every hour
cron.schedule('0 * * * *', async () => {
  console.log('Starting scheduled vendor sync...');

  const result = await syncService.syncAllUsers({
    forceResync: false,
    batchSize: 10
  });

  console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);
});
```

## Related Resources

- [Stock Sync Example](./stock-sync.md)
- [Document Sync Example](./document-sync.md)
- [BusinessPartner API Reference](../api-reference.html#businesspartners)

---

**Implementation:** `server/src/services/flourio/services/businessPartnerSyncService.ts`
**Tests:** `server/src/services/flourio/services/businessPartnerSyncService.test.ts`
**Last Updated:** 2025-10-16
