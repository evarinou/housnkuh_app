# Task Impact Analysis: Flourio API v2 → v3 Migration

## 📊 Übersicht

**Betroffene Tasks:** 24 Tasks (TASK-027 bis TASK-050)
**Status:** Alle Tasks basieren auf veralteter v2 API

## 🔴 Kritische Änderungen die ALLE Tasks betreffen

1. **Base URL:** `api.flour.cloud/api/v2` → `flour.host/api/v3`
2. **Authentication:** API Key → Bearer Token
3. **Endpoint Paths:** `/api/v2/` → `/v3/`
4. **Rate Limiting:** Neu implementiert (HTTP 429)

## 📋 Task-by-Task Impact Assessment

### ✅ Strukturelle Tasks (Minimal Impact)

| Task | Titel | Impact | Aktion |
|------|-------|--------|--------|
| TASK-027 | create-flourio-service-structure | 🟢 Low | Struktur bleibt gleich |
| TASK-030 | create-typescript-types | 🟢 Low | Types bleiben gleich laut API |
| TASK-047 | create-mock-server | 🟢 Low | Mock-Struktur anpassbar |

### ⚠️ Configuration Tasks (Medium Impact)

| Task | Titel | Impact | Aktion |
|------|-------|--------|--------|
| TASK-029 | add-env-variables | 🟡 Medium | URL ändern, Bearer Token hinzufügen |
| TASK-028 | implement-api-client | 🟡 Medium | Auth-Header ändern, Rate Limit handling |

### 🔴 API Integration Tasks (High Impact)

| Task | Titel | Impact | Aktion |
|------|-------|--------|--------|
| TASK-031 | map-mietfach-to-stock | 🔴 High | Stock Endpoints prüfen |
| TASK-032 | create-stock-sync-service | 🔴 High | Neue Stock API verwenden |
| TASK-033 | sync-existing-mietfaecher | 🔴 High | Sync mit v3 Endpoints |
| TASK-034 | update-mietfach-model | 🟡 Medium | Model-Anpassungen prüfen |
| TASK-035 | create-businesspartner-service | 🔴 High | BusinessPartner v3 Endpoints |
| TASK-036 | hook-vendor-registration | 🔴 High | BP Creation über v3 |
| TASK-037 | update-vendor-model | 🟡 Medium | Flourio ID mapping |
| TASK-038 | sync-existing-vendors | 🔴 High | Bulk sync über v3 |
| TASK-039 | create-article-service | 🔴 High | Article v3 Endpoints |
| TASK-040 | build-article-ui | 🟢 Low | UI bleibt gleich |
| TASK-041 | implement-article-crud | 🔴 High | CRUD über v3 API |
| TASK-042 | add-article-validation | 🟡 Medium | Validation rules prüfen |
| TASK-043 | create-document-sync-job | 🔴 High | Document v3 Endpoints |
| TASK-044 | implement-invoice-mapping | 🔴 High | Invoice structure in v3 |
| TASK-045 | add-sync-status-tracking | 🟡 Medium | Status handling |
| TASK-046 | implement-error-recovery | 🟡 Medium | Rate Limit errors |
| TASK-048 | write-integration-tests | 🔴 High | Tests gegen v3 |
| TASK-049 | add-monitoring-dashboard | 🟡 Medium | v3 Metriken |
| TASK-050 | implement-webhook-listener | ❓ Unknown | Webhooks in v3? |

## 🎯 Empfohlene Reihenfolge für Migration

### Phase 1: Foundation (Sofort)
1. **NEW TASK:** Request Bearer Token von developer@flour.io
2. **TASK-029:** Environment Variables für v3 updaten
3. **TASK-028:** API Client mit Bearer Auth & Rate Limiting

### Phase 2: Core Services (Priorität Hoch)
4. **TASK-032:** Stock Sync Service (kritisch für Mietfächer)
5. **TASK-035:** BusinessPartner Service (kritisch für Vendors)
6. **TASK-039:** Article Service (kritisch für Produkte)

### Phase 3: Integration (Priorität Mittel)
7. **TASK-031/033:** Mietfach-Stock Mapping & Sync
8. **TASK-036/038:** Vendor Registration & Sync
9. **TASK-041:** Article CRUD Operations

### Phase 4: Advanced Features (Priorität Niedrig)
10. **TASK-043/044:** Document/Invoice Sync
11. **TASK-046:** Error Recovery (mit Rate Limit)
12. **TASK-048:** Integration Tests
13. **TASK-050:** Webhooks (wenn verfügbar)

## 🆕 Neue Tasks erforderlich

| Neue Task | Beschreibung | Priorität |
|-----------|--------------|-----------|
| TASK-051 | Bearer Token von Flourio anfordern | 🔴 Kritisch |
| TASK-052 | Rate Limiting Handler implementieren | 🔴 Hoch |
| TASK-053 | v3 API Dokumentation vollständig erfassen | 🔴 Hoch |
| TASK-054 | Absences API Integration (neu in v3) | 🟡 Mittel |
| TASK-055 | Migration Script v2 → v3 Daten | 🟡 Mittel |

## ❌ Obsolete Tasks

Momentan keine - alle Tasks sind migrierbar, müssen aber angepasst werden.

## 📈 Aufwandsschätzung

| Kategorie | Tasks | Aufwand |
|-----------|-------|---------|
| Minimal Anpassung | 3 | 1-2h |
| Configuration Updates | 2 | 2-3h |
| API Integration Updates | 15 | 15-20h |
| Neue Tasks | 5 | 5-8h |
| Testing & Validation | 2 | 3-4h |
| **GESAMT** | **27** | **26-37h** |

## 🚨 Risiken

1. **Unbekannte Breaking Changes:** Ohne vollständige v3 Docs schwer einschätzbar
2. **Rate Limiting:** Könnte Bulk-Operations beeinträchtigen
3. **Webhook Support:** Status in v3 unklar
4. **Data Migration:** Mögliche Inkompatibilitäten
5. **Parallelbetrieb:** v2 und v3 nicht gleichzeitig nutzbar

## ✅ Nächste Schritte

1. **STOPP** aller v2-basierten Entwicklung
2. **Bearer Token** anfordern (developer@flour.io)
3. **Vollständige v3 Docs** manuell erfassen
4. **Test-Environment** mit v3 aufsetzen
5. **Migration beginnen** mit Foundation Tasks

## 📝 Notizen

- Datenstrukturen bleiben laut Flourio gleich (Vorteil!)
- Neue Absences API könnte interessant sein
- Rate Limiting erfordert robustes Error Handling
- Support-Kontakt: developer@flour.io