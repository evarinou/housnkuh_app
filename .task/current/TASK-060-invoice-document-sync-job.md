# Task: TASK-060-invoice-document-sync-job
Priority: high
Status: pending
Created: 2025-09-25

## Context
5-Minuten Cron-Job für Invoice-Document Synchronisation.

## User Acceptance Criteria
- [ ] 5-min cron job implementiert
- [ ] FlourioDocument ↔ Invoice mapper
- [ ] SyncStatus model & tracking
- [ ] Retry logic mit exponential backoff
- [ ] Admin endpoint für manual trigger
- [ ] Comprehensive logging

## Implementation:
- server/src/jobs/documentSyncJob.ts
- DocumentSyncService, invoiceMapping, syncStatusService
- server/src/models/SyncStatus.ts

**Geschätzte Zeit:** ~4-5h
**Ersetzt:** TASK-043, TASK-044, TASK-045, TASK-046
