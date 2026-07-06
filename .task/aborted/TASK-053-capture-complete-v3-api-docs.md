# Task: TASK-053-capture-complete-v3-api-docs
Priority: high
Status: pending
Created: 2025-09-25

## Context
Die vollständige Flourio v3 API Dokumentation muss erfasst werden, da keine OpenAPI Spec verfügbar ist.

## User Acceptance Criteria
- [ ] Alle Endpoints systematisch dokumentiert
- [ ] Request/Response Schemas erfasst
- [ ] Authentication Details dokumentiert
- [ ] Error Codes und Responses dokumentiert
- [ ] Beispiele für jeden Endpoint

## Test Plan
### Unit Tests
- N/A (Dokumentationsaufgabe)

### Integration Tests
- [ ] Alle dokumentierten Endpoints mit curl/Postman testen
- [ ] Response Schemas validieren

### Manual Testing
- [ ] Dokumentation Review mit Team
- [ ] Vollständigkeitscheck gegen UI

## Implementation Details

Struktur für `/docs/flourio-api-v3/`:

```
flourio-api-v3/
├── README.md                    # Übersicht
├── MIGRATION_GUIDE.md          # ✅ Bereits erstellt
├── API_COMPARISON_V2_V3.md     # ✅ Bereits erstellt
├── authentication/
│   └── README.md               # Bearer Token Details
├── endpoints/
│   ├── absences.md            # Neu in v3
│   ├── articles.md            # Artikel-Verwaltung
│   ├── businesspartners.md    # Geschäftspartner
│   ├── documents.md           # Dokumente/Rechnungen
│   └── stocks.md              # Lagerbestände
├── schemas/
│   ├── common.md              # Gemeinsame Datentypen
│   ├── requests.md            # Request Schemas
│   └── responses.md           # Response Schemas
└── examples/
    ├── authentication.md      # Auth Beispiele
    └── workflows.md          # Typische Workflows
```

Für jeden Endpoint dokumentieren:
- HTTP Method
- Path
- Headers
- Query Parameters
- Request Body (Schema + Beispiel)
- Response (Schema + Beispiel)
- Error Responses
- Rate Limits

## Dependencies
- TASK-051 (Bearer Token für Tests)

## Tools Required
- Browser Developer Tools
- Postman/Insomnia
- JSON Schema Validator

## Definition of Done
- [ ] Alle sichtbaren Endpoints dokumentiert
- [ ] Schemas vollständig erfasst
- [ ] Beispiele funktionieren
- [ ] Team-Review abgeschlossen
- [ ] In Git committed