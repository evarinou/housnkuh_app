# Task: TASK-038-end-to-end-upload-test
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] Kompletter Upload-Workflow funktioniert einwandfrei
- [ ] Profilbild-Upload + Anzeige funktioniert
- [ ] Banner-Upload + Anzeige funktioniert
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Keine Unit-Tests erforderlich (End-to-End Validierung)

### Integration Tests  
- [ ] Vollständiger Upload-Workflow-Test
- [ ] Cross-Browser-Kompatibilität prüfen

### Manual Testing
- [ ] **Scenario 1**: Nur Profilbild hochladen
- [ ] **Scenario 2**: Nur Banner hochladen
- [ ] **Scenario 3**: Beide Bilder gleichzeitig hochladen
- [ ] **Scenario 4**: Bild ersetzen (neues Bild hochladen)
- [ ] **Scenario 5**: Bild entfernen (X-Button)

## Implementation Details
**Voraussetzung**: TASK-034, TASK-035, TASK-036, TASK-037 müssen abgeschlossen sein

### Test-Szenarien:

#### Scenario 1: Nur Profilbild
1. VendorProfilePage öffnen
2. Profilbild auswählen (Upload-Button)
3. Vorschau prüfen
4. "Speichern" klicken
5. Success-Message prüfen
6. Seite neu laden → Bild noch da

#### Scenario 2: Nur Banner
1. Banner-Upload-Button verwenden
2. Banner-Vorschau prüfen
3. Speichern + Reload-Test

#### Scenario 3: Beide Bilder
1. Profilbild + Banner auswählen
2. Beide Vorschauen prüfen
3. Speichern → beide URLs in Logs
4. Reload → beide Bilder angezeigt

#### Scenario 4: Bild ersetzen
1. Bestehendes Bild durch neues ersetzen
2. Alte URL wird durch neue ersetzt
3. Nur neue URL in DB gespeichert

#### Scenario 5: Bild entfernen
1. X-Button auf Bild-Vorschau klicken
2. Vorschau verschwindet
3. Speichern → URL wird aus DB entfernt
4. Reload → kein Bild angezeigt

### Performance-Test:
- [ ] Große Bilder (5MB) hochladen
- [ ] Multiple Uploads hintereinander
- [ ] Network-Tab auf Upload-Performance prüfen

### Error-Handling-Test:
- [ ] Zu große Datei (>5MB) hochladen
- [ ] Ungültiges Dateiformat hochladen
- [ ] Upload bei schlechter Internetverbindung

## Definition of Done
- [ ] Alle 5 Test-Szenarien funktionieren einwandfrei
- [ ] Performance ist akzeptabel (<5s für 5MB Upload)
- [ ] Error-Handling funktioniert korrekt
- [ ] Cross-Browser-Test bestanden (Chrome, Firefox, Safari)
- [ ] Upload-Problem ist vollständig behoben
- [ ] User kann problemlos Profilbilder und Banner hochladen