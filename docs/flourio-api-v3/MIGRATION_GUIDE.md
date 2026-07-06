# Flourio API Migration Guide: v2 → v3

## 🔄 Übersicht der Änderungen

### 📍 Basis-URL Änderung
- **Alt (v2):** `https://api.flour.cloud/api/v2/`
- **Neu (v3):** `https://flour.host/api/v3/`

### 🔐 Authentifizierung (BREAKING CHANGE)
- **Alt (v2):** API Key als Query Parameter oder Custom Header
- **Neu (v3):** Bearer Token im Authorization Header
  ```
  Authorization: Bearer <token>
  ```
- **Rate Limiting:** HTTP 429 bei Überschreitung (neu)
- **Support:** developer@flour.io für Token-Verwaltung

### 📊 Datenstrukturen
- ✅ **Unverändert:** Datenstrukturen sind gleich geblieben
- ⚠️ **Endpoints:** Vollständig neue Struktur und Pfade

## 🚨 Breaking Changes

### 1. Authentication
```javascript
// ALT (v2)
headers: {
  'X-API-Key': 'your-api-key'
}
// oder
url: 'https://api.flour.cloud/api/v2/endpoint?api_key=your-api-key'

// NEU (v3)
headers: {
  'Authorization': 'Bearer your-token'
}
```

### 2. Base URL
```javascript
// ALT (v2)
const BASE_URL = 'https://api.flour.cloud/api/v2';

// NEU (v3)
const BASE_URL = 'https://flour.host/api/v3';
```

### 3. Endpoint Struktur
Die Endpoint-Pfade haben sich grundlegend geändert. Neue Struktur:
- `/v3/absences` - Abwesenheiten
- `/v3/articles` - Artikel
- `/v3/businesspartners` - Geschäftspartner
- `/v3/documents` - Dokumente
- `/v3/stocks` - Lager

## 📋 Migration Checkliste

### Phase 1: Vorbereitung
- [ ] Neuen Bearer Token bei developer@flour.io anfordern
- [ ] Test-Umgebung mit v3 API einrichten
- [ ] Backup der v2 Konfiguration erstellen

### Phase 2: Code-Anpassungen
- [ ] BASE_URL auf `https://flour.host/api/v3` ändern
- [ ] Authorization Header auf Bearer Token umstellen
- [ ] Error Handling für HTTP 429 (Rate Limiting) implementieren
- [ ] Endpoint-Pfade auf v3 Struktur migrieren

### Phase 3: Testing
- [ ] Unit Tests mit neuer API-Struktur
- [ ] Integration Tests gegen v3 Endpoints
- [ ] Performance Tests (Rate Limiting beachten)

### Phase 4: Deployment
- [ ] Umgebungsvariablen aktualisieren
- [ ] Monitoring für v3 API einrichten
- [ ] Rollback-Plan dokumentieren

## ⚠️ Wichtige Hinweise

1. **Keine parallele Nutzung:** v2 und v3 APIs sind nicht kompatibel
2. **Token-Sicherheit:** Bearer Tokens niemals im Frontend exponieren
3. **Rate Limiting:** Implementiere Retry-Logic mit exponential backoff
4. **Support:** Bei Fragen developer@flour.io kontaktieren

## 📅 Timeline

- **v2 Deprecation:** Noch nicht angekündigt
- **v3 Verfügbar:** Sofort
- **Migration empfohlen:** So bald wie möglich

## 🔗 Ressourcen

- API v3 Dokumentation: https://flour.host/api/v3
- Support: developer@flour.io
- Status-Seite: (noch nicht verfügbar)