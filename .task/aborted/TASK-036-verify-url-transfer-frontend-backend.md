# Task: TASK-036-verify-url-transfer-frontend-backend
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Frontend→Backend URL-Übertragung funktioniert korrekt
- [ ] Upload-URLs werden im Backend empfangen
- [ ] Request-Payload enthält korrekte Bild-URLs
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Keine Unit-Tests erforderlich (Validierungs-Task)

### Integration Tests  
- [ ] Upload-Request mit Debug-Logs analysieren
- [ ] Frontend/Backend Log-Korrelation prüfen

### Manual Testing
- [ ] Profilbild hochladen → Frontend + Backend Logs vergleichen
- [ ] Banner hochladen → Frontend + Backend Logs vergleichen
- [ ] URLs in beiden Logs auf Konsistenz prüfen

## Implementation Details
**Voraussetzung**: TASK-034 und TASK-035 müssen abgeschlossen sein

### Test-Workflow:
1. **Frontend-Logs aktivieren**: Browser-Entwicklertools öffnen
2. **Backend-Logs verfolgen**: Server-Konsole beobachten
3. **Upload durchführen**:
   - Profilbild auswählen
   - Banner auswählen  
   - "Speichern" klicken
4. **Logs analysieren**:
   - Frontend: Upload-URLs in Konsole
   - Backend: Request-URLs in Server-Log
   - URLs müssen identisch sein

### Erwartete Log-Ausgaben:
**Frontend-Konsole**:
```
🖼️ Upload Results:
- Profilbild URL: /uploads/vendor-images/vendor-123456.jpg
- Banner URL: /uploads/vendor-images/vendor-789012.jpg
📤 Sending profile update: {...}
```

**Backend-Server**:
```
📤 Profile update request received: {profilBildUrl: "/uploads/...", bannerBildUrl: "/uploads/..."}
🖼️ Image URLs being updated: {profilBild: "/uploads/...", bannerBild: "/uploads/..."}
```

## Definition of Done
- [ ] Upload-URLs sind in Frontend-Logs sichtbar
- [ ] Identische URLs sind in Backend-Logs sichtbar
- [ ] URL-Format ist konsistent (/uploads/vendor-images/...)
- [ ] Keine Diskrepanzen zwischen Frontend/Backend
- [ ] Test-Dokumentation erstellt