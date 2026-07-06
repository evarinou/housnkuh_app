# Task: TASK-061-monitoring-dashboard
Priority: medium
Status: pending
Created: 2025-09-25

## Context
Admin dashboard für FlourIO sync status und webhook support.

## User Acceptance Criteria
- [ ] Admin dashboard zeigt sync status
- [ ] Metrics: synced/failed documents
- [ ] Webhook endpoint für FlourIO events (optional)
- [ ] Alerting bei sync failures
- [ ] Manual retry für failed syncs

## Implementation:
- client/src/pages/admin/FlourioSyncDashboard.tsx
- server/src/routes/flourioWebhookRoutes.ts

**Geschätzte Zeit:** ~3h
**Ersetzt:** TASK-049, TASK-050
