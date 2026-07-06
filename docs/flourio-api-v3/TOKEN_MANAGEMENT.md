# Flourio API v3 - Token Management

**Status:** ✅ Token erfolgreich eingerichtet
**Letztes Update:** 2025-10-16

## 📋 Übersicht

Dieses Dokument beschreibt die Verwaltung des Flourio API v3 Bearer Tokens für housnkuh_app.

## 🔑 Token-Details

### Aktueller Token
**Status:** ✅ Aktiv und validiert
**Angefordert am:** 2025-10-16
**Erhalten am:** 2025-10-16
**Gültig bis:** 2030-10-16 (basierend auf JWT Payload: exp=1918391834)
**Token-Typ:** JWT Bearer Token (Full Access)

### Token-Kontakt
**Support:** developer@flour.io
**Projekt:** housnkuh_app
**Verwendungszweck:** Direktvermarkter-Marktplatz

## 🚀 Token einrichten

### 1. Token in .env.local speichern

Nach Erhalt des Tokens:

```bash
# /server/.env.local erstellen (wird von .gitignore ignoriert)
cd server
cp .env.example .env.local
```

Dann in `.env.local` eintragen:
```bash
FLOURIO_BEARER_TOKEN=<dein-echter-token-hier>
FLOURIO_API_URL=https://flour.host/v3
```

**WICHTIG:** API URL ist `https://flour.host/v3` (OHNE `/api` prefix!)

### 2. Token-Sicherheit

**WICHTIG:**
- ✅ Token NUR in `.env.local` speichern (nicht in `.env`)
- ✅ `.env.local` ist in `.gitignore` eingetragen
- ✅ NIEMALS Token in Git committen
- ✅ Token nicht im Frontend Code verwenden
- ✅ Regelmäßig Token rotieren (wenn von Flourio empfohlen)

### 3. Produktions-Deployment

Für Produktionsumgebung:
```bash
# Token als Umgebungsvariable setzen (z.B. via Hosting-Panel)
FLOURIO_BEARER_TOKEN=<production-token>
FLOURIO_API_URL=https://flour.host/v3
NODE_ENV=production
```

## 📊 Rate Limits

**Status:** Noch nicht von Flourio dokumentiert erhalten

| Limit-Typ | Wert | Bemerkung |
|-----------|------|-----------|
| Requests pro Minute | TBD | Bei developer@flour.io nachfragen |
| Requests pro Stunde | TBD | Bei developer@flour.io nachfragen |
| Requests pro Tag | TBD | Bei developer@flour.io nachfragen |
| Burst Limit | TBD | Max. gleichzeitige Requests |

**Nächster Schritt:** E-Mail an developer@flour.io mit Bitte um Rate Limit Details

### HTTP 429 Handling

Bei Überschreitung der Rate Limits:
- API antwortet mit `429 Too Many Requests`
- `Retry-After` Header gibt Wartezeit in Sekunden an
- Implementierung siehe: `server/src/services/flourio/client/rateLimitHandler.ts`

## 🔄 Token Renewal

**Gültigkeit:** [Nach Erhalt von Flourio ausfüllen]

### Renewal-Prozess
1. Rechtzeitig vor Ablauf (z.B. 30 Tage) an developer@flour.io wenden
2. Neuen Token anfordern
3. Alten Token in `.env.local` ersetzen
4. Testing durchführen (siehe unten)
5. Alten Token nach erfolgreicher Migration löschen

## ✅ Token-Validierung

### Quick Test (curl)

```bash
# Token testen
curl -H "Authorization: Bearer <your-token>" \
  https://flour.host/v3/articles

# Erwartetes Ergebnis: HTTP 200 + JSON-Daten
# Fehler: HTTP 401 (ungültiger Token)
```

**Validierungsergebnis (2025-10-16):**
- ✅ GET /v3/articles: HTTP 200 OK (2 Artikel zurückgegeben)
- ✅ Ungültiger Token: HTTP 401 Unauthorized (korrekt abgelehnt)

### Integration Test

```bash
# Nach Implementierung von TASK-056
cd server
npm test -- flourioClient.test.ts
```

## 📝 Token-Historie

| Datum | Event | Details |
|-------|-------|---------|
| 2025-10-16 | Token angefordert | E-Mail an developer@flour.io gesendet |
| 2025-10-16 | Token erhalten | JWT Bearer Token via einmaliger Link erhalten |
| 2025-10-16 | Token validiert | ✅ Erfolgreich getestet: GET /v3/articles (HTTP 200) |
| 2025-10-16 | Token gespeichert | In server/.env.local hinterlegt (nicht in Git) |
| - | Produktiv geschaltet | TBD (nach Deployment) |

## 🐛 Troubleshooting

### Problem: 401 Unauthorized
**Lösung:**
1. Token in `.env.local` korrekt gesetzt?
2. Format: `Authorization: Bearer <token>` (nicht `Bearer: <token>`)
3. Token abgelaufen? Renewal durchführen

### Problem: 429 Too Many Requests
**Lösung:**
1. Rate Limit überschritten
2. `Retry-After` Header prüfen
3. Request-Frequenz reduzieren
4. Exponential Backoff implementieren

### Problem: Token verloren
**Lösung:**
1. SOFORT neuen Token bei developer@flour.io anfordern
2. Alten Token widerrufen lassen (falls möglich)
3. Neuen Token in allen Umgebungen austauschen

## 📞 Support

**Flourio Support:** developer@flour.io
**Interne Dokumentation:** `/docs/flourio-api-v3/`
**Task-Tracking:** `.task/current/TASK-051-request-flourio-bearer-token.md`

---

**✅ Letztes Update:** 2025-10-16 - Token erfolgreich eingerichtet und validiert!
