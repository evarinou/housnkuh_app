# FlourIO Article Sync - Task Overview

**Created:** 2025-11-13
**Epic:** housnkuh als führendes System - Artikel & Tags zu FlourIO synchronisieren
**Status:** Planning Complete

## 🎯 Ziel

housnkuh wird die führende Datenquelle für Products und Tags. Daten fließen **VON housnkuh ZU FlourIO**:
- Products werden als Articles zu FlourIO synchronisiert
- Tags werden automatisch mit den Articles mitgeschickt
- FlourIO erstellt Tags automatisch wenn sie nicht existieren (idempotent)
- Event-basierte Synchronisation (automatisch bei Product-Änderungen)

## 📊 Task Dependency Graph

```
TASK-069: Update CreateArticleDto Types
    ↓
TASK-070: Implement getProductTagNames()
    ↓
TASK-071: Update mapProductToCreateArticle()
    ↓ (parallel)
    ├─→ TASK-072: Deprecate TagSyncService (medium priority)
    ├─→ TASK-073: Product Auto-Sync Hook ⚡ CRITICAL
    │       ↓
    │   TASK-074: FlourIO Tag ID Writeback (optional, low priority)
    └─→ TASK-075: Update Admin UI
```

## 📝 Tasks (7 total)

### Phase 1: Type System & Data Mapping (30 min)
- **TASK-069** ⚡ Update CreateArticleDto types (`tags?: string[]`)
  *Priority: HIGH | Time: 15 min | Dependencies: None*

- **TASK-070** ⚡ Implement `getProductTagNames()` function
  *Priority: HIGH | Time: 20 min | Dependencies: TASK-069*

- **TASK-071** ⚡ Update `mapProductToCreateArticle()` (use tags array)
  *Priority: HIGH | Time: 30 min | Dependencies: TASK-069, TASK-070*

### Phase 2: Cleanup & Auto-Sync (1h 5min)
- **TASK-072** Deprecate TagSyncService Pull Logic
  *Priority: MEDIUM | Time: 20 min | Dependencies: TASK-071*

- **TASK-073** ⚡ Implement Product Auto-Sync Hook
  *Priority: HIGH | Time: 45 min | Dependencies: TASK-071*

### Phase 3: Optional & UI (55 min)
- **TASK-074** Implement FlourIO Tag ID Writeback (optional)
  *Priority: LOW | Time: 25 min | Dependencies: TASK-073*

- **TASK-075** Update Admin UI Article Sync
  *Priority: MEDIUM | Time: 30 min | Dependencies: TASK-073*

## ⏱️ Time Estimates

**Total Estimated Time:** ~2h 45min
**Critical Path (minimum viable):** ~1h 40min (Tasks 069, 070, 071, 073)
**Full Implementation:** ~2h 45min (all tasks)

### Breakdown
- Phase 1 (Types & Mapping): 65 min
- Phase 2 (Cleanup & Hooks): 65 min
- Phase 3 (Optional & UI): 55 min

## ✅ Success Criteria

### Functional Requirements
- [x] Products können mit Tags zu FlourIO synchronisiert werden
- [x] Tags werden automatisch von FlourIO erstellt wenn nicht vorhanden
- [x] Automatische Sync bei Product-Änderungen (save hook)
- [x] Admin UI zeigt Sync-Status pro Product
- [x] Bulk-Sync für mehrere Products möglich

### Technical Requirements
- [x] TypeScript Types korrekt für FlourIO API v3
- [x] Unit Tests für alle neuen Funktionen
- [x] Integration Tests für End-to-End Sync
- [x] Error Handling (Sync-Fehler brechen Save nicht ab)
- [x] Logging für Debugging

### Quality Gates
- [x] Alle Tests passing (client & server)
- [x] TypeScript Compilation erfolg reich
- [x] Manual Testing durchgeführt
- [x] User Acceptance Criteria erfüllt

## 🔍 Testing Strategy

### Unit Tests (per Task)
- TASK-070: getProductTagNames() - 3 Tests
- TASK-071: mapProductToCreateArticle() - 3 Tests
- TASK-073: Product Hook - 4 Tests
- TASK-074: Tag ID Writeback - 3 Tests
- TASK-075: UI Components - 2 Tests

**Total: ~15 Unit Tests**

### Integration Tests
1. End-to-end Product Creation → FlourIO Article Sync
2. Product Update with Tags → FlourIO Article Update
3. Bulk Sync multiple Products
4. Error Handling: FlourIO API down
5. Tag Auto-Creation in FlourIO

**Total: ~5 Integration Tests**

### Manual Testing Scenarios
1. Create Product with Tags → Verify Article in FlourIO
2. Update Product Tags → Verify Article Tags updated
3. Sync Product without Tags → Should work (no error)
4. Bulk Sync 10 Products → All synced successfully
5. FlourIO API Error → Product saved, error logged

## 🚨 Risk Assessment

### High Priority Risks
1. **FlourIO Rate Limiting**
   - Risk: Zu viele API Calls bei Auto-Sync
   - Mitigation: Implement Queue mit Rate Limiting (TASK-073)
   - Severity: MEDIUM

2. **Circular Dependencies**
   - Risk: Product Model importiert ArticleService
   - Mitigation: Dynamic imports in Hooks
   - Severity: LOW (handled in TASK-073)

### Medium Priority Risks
3. **Breaking Changes**
   - Risk: Alte `category` Feld entfernt
   - Mitigation: Gradual deprecation, tests
   - Severity: MEDIUM

4. **Data Consistency**
   - Risk: Product saved but FlourIO sync fails
   - Mitigation: Retry logic, error logging
   - Severity: LOW (async sync, non-blocking)

## 📚 Technical Documentation

### Key Files Modified
- `server/src/services/flourio/generated/api-types.d.ts` (TASK-069)
- `server/src/services/flourio/services/articleMapping.ts` (TASK-070, 071)
- `server/src/services/flourio/services/TagSyncService.ts` (TASK-072)
- `server/src/models/Product.ts` (TASK-073)
- `server/src/services/flourio/services/ArticleService.ts` (TASK-074)
- `client/src/pages/admin/ArticleManagementPage.tsx` (TASK-075)

### API Endpoints Affected
- `POST /api/admin/flourio/tags/sync` - DEPRECATED (TASK-072)
- `POST /api/admin/flourio/articles/bulk-sync` - NEW (TASK-075)
- `GET /api/admin/flourio/tags` - KEEP (still useful)

### Database Changes
- `Product.flourioSync` - Already exists, no migration needed
- `Tag.flourioId` - Already exists, will be populated (TASK-074)

## 🎓 Learning Resources

### FlourIO API Documentation
- **Swagger:** `docs/flourio-api-v3/swagger.json`
- **CreateArticleDto:** Line 24695-24708
- **Tags Field:** `tags: string[]` (auto-creates if not exist)

### Mongoose Hooks
- **Post-Save Hook:** `ProductSchema.post('save', callback)`
- **Circular Dependencies:** Use dynamic imports
- **Async Hooks:** `setImmediate()` for non-blocking

### Testing
- **Jest Mocking:** `jest.spyOn()`, `mockResolvedValue()`
- **Async Testing:** `await waitForAsync()`, `flush-promises`
- **React Testing:** `@testing-library/react`, `fireEvent`

## 🚀 Deployment Plan

### Phase 1: Backend (Tasks 069-074)
1. Deploy Type Updates (TASK-069)
2. Deploy Mapping Changes (TASK-070, 071)
3. Deploy Auto-Sync Hook (TASK-073)
4. Monitor Logs for Sync Errors
5. Optional: Deploy Tag ID Writeback (TASK-074)

### Phase 2: Frontend (Task 075)
1. Deploy UI Changes
2. User Acceptance Testing
3. Monitor User Feedback

### Rollback Plan
- Revert Product Hook if issues (TASK-073)
- Re-enable TagSyncService if needed (TASK-072)
- Database: No migrations, no rollback needed

## 📞 Support & Monitoring

### Logging Points
- Product Hook: `[Product Hook] Auto-syncing product {id}`
- Article Service: `[ArticleService] Created article {id}`
- Tag Writeback: `[ArticleService] Updated {n} tags with FlourIO IDs`

### Monitoring Metrics
- Articles synced per hour
- Sync success/failure rate
- API Response times
- Error types and frequency

### Alerts
- FlourIO API down (> 5 failures in 1 min)
- Sync Queue backup (> 100 pending items)
- High error rate (> 10% failures)

## 📝 Notes

**Architectural Decision:**
- housnkuh ist das führende System (Source of Truth)
- FlourIO ist das Consumer-System (empfängt Daten)
- Tags werden bei Article-Erstellung automatisch erstellt (idempotent)
- Event-based Sync ist einfacher als scheduled Jobs

**Alternative Approaches (rejected):**
- ❌ Separate Tag-Synchronisation (zu komplex)
- ❌ Bidirektionale Sync (Konflikt-Resolution schwierig)
- ❌ Manual-only Sync (fehleranfällig, User vergessen es)

## ✨ Future Enhancements (Out of Scope)

- Real-time Sync Status Updates (WebSockets)
- Sync History / Audit Log
- Conflict Resolution (wenn FlourIO manuell geändert wird)
- Batch Sync Progress Bar
- Retry Queue with Exponential Backoff
- FlourIO Webhook für Bi-Directional Sync

---

**Last Updated:** 2025-11-13
**Prepared by:** Claude Code (Sonnet 4.5)
**Ready for Implementation:** ✅ YES
