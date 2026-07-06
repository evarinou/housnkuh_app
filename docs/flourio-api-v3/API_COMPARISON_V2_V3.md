# Flourio API v2 vs v3 Vergleich

## 🔄 Hauptunterschiede

| Aspekt | v2 | v3 | Impact |
|--------|----|----|--------|
| **Base URL** | `api.flour.cloud/api/v2` | `flour.host/api/v3` | 🔴 Breaking |
| **Authentifizierung** | API Key (Query/Header) | Bearer Token (Header only) | 🔴 Breaking |
| **Rate Limiting** | Nicht dokumentiert | HTTP 429 mit Headers | 🟡 Neu |
| **Datenstrukturen** | JSON Schemas | Gleiche Schemas | 🟢 Kompatibel |
| **Error Handling** | Standard HTTP | Standard HTTP + Rate Limit | 🟡 Erweitert |

## 📊 Endpoint Mapping

### Articles (Artikel)

| Operation | v2 Endpoint | v3 Endpoint | Status |
|-----------|------------|-------------|---------|
| List Articles | `GET /api/v2/articles` | `GET /v3/articles` | ⚠️ Pfad geändert |
| Get Article | `GET /api/v2/articles/{id}` | `GET /v3/articles/{id}` | ⚠️ Pfad geändert |
| Create Article | `POST /api/v2/articles` | `POST /v3/articles` | ⚠️ Pfad geändert |
| Update Article | `PUT /api/v2/articles/{id}` | `PUT /v3/articles/{id}` | ⚠️ Pfad geändert |
| Delete Article | `DELETE /api/v2/articles/{id}` | `DELETE /v3/articles/{id}` | ⚠️ Pfad geändert |

### Business Partners (Geschäftspartner)

| Operation | v2 Endpoint | v3 Endpoint | Status |
|-----------|------------|-------------|---------|
| List Partners | `GET /api/v2/businesspartners` | `GET /v3/businesspartners` | ⚠️ Pfad geändert |
| Get Partner | `GET /api/v2/businesspartners/{id}` | `GET /v3/businesspartners/{id}` | ⚠️ Pfad geändert |
| Create Partner | `POST /api/v2/businesspartners` | `POST /v3/businesspartners` | ⚠️ Pfad geändert |
| Update Partner | `PUT /api/v2/businesspartners/{id}` | `PUT /v3/businesspartners/{id}` | ⚠️ Pfad geändert |

### Stocks (Lagerbestände)

| Operation | v2 Endpoint | v3 Endpoint | Status |
|-----------|------------|-------------|---------|
| List Stocks | `GET /api/v2/stocks` | `GET /v3/stocks` | ⚠️ Pfad geändert |
| Get Stock | `GET /api/v2/stocks/{id}` | `GET /v3/stocks/{id}` | ⚠️ Pfad geändert |
| Create Stock | `POST /api/v2/stocks` | `POST /v3/stocks` | ⚠️ Pfad geändert |
| Update Stock | `PUT /api/v2/stocks/{id}` | `PUT /v3/stocks/{id}` | ⚠️ Pfad geändert |

### Documents (Dokumente/Rechnungen)

| Operation | v2 Endpoint | v3 Endpoint | Status |
|-----------|------------|-------------|---------|
| List Documents | `GET /api/v2/documents` | `GET /v3/documents` | ⚠️ Pfad geändert |
| Get Document | `GET /api/v2/documents/{id}` | `GET /v3/documents/{id}` | ⚠️ Pfad geändert |
| Create Document | `POST /api/v2/documents` | `POST /v3/documents` | ⚠️ Pfad geändert |

### NEU in v3: Absences (Abwesenheiten)

| Operation | v2 Endpoint | v3 Endpoint | Status |
|-----------|------------|-------------|---------|
| List Absences | - | `GET /v3/absences` | 🆕 Neu |
| Create Absence | - | `POST /v3/absences` | 🆕 Neu |
| Archive Absence | - | `POST /v3/absences/{id}/archive` | 🆕 Neu |
| Approve Absence | - | `POST /v3/absences/{id}/approve` | 🆕 Neu |
| Duplicate Absence | - | `POST /v3/absences/{id}/duplicate` | 🆕 Neu |

## 🔧 Code-Anpassungen

### 1. Client Configuration

```typescript
// v2 Configuration
const configV2 = {
  baseURL: 'https://api.flour.cloud/api/v2',
  headers: {
    'X-API-Key': process.env.FLOURIO_API_KEY
  }
};

// v3 Configuration
const configV3 = {
  baseURL: 'https://flour.host/api/v3',
  headers: {
    'Authorization': `Bearer ${process.env.FLOURIO_BEARER_TOKEN}`
  }
};
```

### 2. Error Handling

```typescript
// v3 benötigt zusätzliches Rate Limit Handling
async function apiCallWithRetry(request: () => Promise<any>) {
  try {
    return await request();
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['x-ratelimit-retry-after'];
      await sleep(retryAfter * 1000);
      return await request(); // Retry once
    }
    throw error;
  }
}
```

## 📌 Migration Prioritäten

### Kritisch (Sofort)
1. Bearer Token Authentication implementieren
2. Base URL ändern
3. Error Handling für Rate Limiting

### Hoch (Kurzfristig)
1. Endpoint-Pfade migrieren
2. Unit Tests anpassen
3. Integration Tests aktualisieren

### Mittel (Mittelfristig)
1. Neue Absences-Features integrieren
2. Performance-Optimierungen
3. Monitoring erweitern

## ⚠️ Risiken

1. **Authentication Breaking Change:** Alle Clients müssen gleichzeitig migriert werden
2. **Rate Limiting:** Kann zu unerwarteten Fehlern führen
3. **Neue Features:** Absences API könnte zusätzliche Anforderungen haben
4. **Unbekannte Changes:** Vollständige API-Dokumentation noch nicht verfügbar

## ✅ Vorteile der Migration

- Modernere API-Struktur
- Bessere Sicherheit durch Bearer Token
- Rate Limiting für faire Nutzung
- Neue Features (Absences)
- Aktiv gewartete Version

## 📅 Nächste Schritte

1. Bearer Token von developer@flour.io anfordern
2. Test-Umgebung mit v3 einrichten
3. Schrittweise Migration der Endpoints
4. Ausführliche Tests
5. Produktiv-Deployment