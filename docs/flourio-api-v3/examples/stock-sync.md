# Example: Warehouse Synchronization

## Overview

Synchronize housnkuh Mietfächer (rental units) with FlourIO Warehouses (Lager).

In Flourio, `/v3/stocks` = Warehouses. Each Mietfach maps to one Warehouse.

## Quick Start

```typescript
import { WarehouseService } from './services/flourio/services/WarehouseService';
import { WarehouseSyncService } from './services/flourio/services/warehouseSyncService';
import { FlourioClient } from './services/flourio/client/FlourioClient';
import Mietfach from './models/Mietfach';

// Initialize
const client = new FlourioClient({
  baseURL: process.env.FLOURIO_API_URL!,
  bearerToken: process.env.FLOURIO_BEARER_TOKEN!
});

const warehouseService = new WarehouseService(client);
const syncService = new WarehouseSyncService(warehouseService);

// Sync single Mietfach
const mietfach = await Mietfach.findById(mietfachId);
await warehouseService.syncMietfach(mietfach);

// Bulk sync all
const result = await syncService.syncAllMietfaecher({
  batchSize: 10
});

console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

## Data Mapping

```typescript
// Mietfach (housnkuh) → Warehouse (FlourIO)
const mietfach = {
  bezeichnung: 'Mietfach A1',
  standort: 'Hauptlager'
};

// Maps to CreateWarehouseDto
const warehouse = {
  name: 'Mietfach A1',
  address: {
    company1: 'Hauptlager',
    country: 'DE'
  }
};
```

## Related Resources

- [BusinessPartner Sync](./businesspartner-sync.md)
- [Warehouse API Reference](../api-reference.html#stocks)

---

**Implementation:** `server/src/services/flourio/services/warehouseSyncService.ts`
**Last Updated:** 2026-03-31
