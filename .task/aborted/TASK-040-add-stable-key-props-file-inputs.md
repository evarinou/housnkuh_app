# Task: TASK-040-add-stable-key-props-file-inputs
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] File inputs haben stabile key-Props
- [ ] Kein Re-Mounting bei State-Updates
- [ ] onChange Events werden zuverlässig getriggert
- [ ] File-Dialog öffnet sich konsistent
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Test für stabiles Rendering der File Inputs
- [ ] Test dass key-Props vorhanden sind
- [ ] Co-located test file: VendorProfilePage.test.tsx

### Integration Tests  
- [ ] Multiple State-Updates ohne Input-Verlust
- [ ] File-Auswahl nach Profil-Reload funktioniert
- [ ] onChange bleibt nach Re-Render gebunden

### Manual Testing
- [ ] Profil laden und Bild auswählen
- [ ] Andere Form-Felder ändern, dann Bild auswählen
- [ ] Tags ändern, dann Bild auswählen
- [ ] Konsistentes Verhalten prüfen

## Implementation Details
**Datei**: `client/src/pages/vendor/VendorProfilePage.tsx`

### Änderung für Profilbild-Input (Zeile ~796-802):
```tsx
<input
  key="profile-file-input"  // NEU: Stabiler Key
  ref={fileInputRef}
  type="file"
  className="hidden"
  accept="image/*"
  onChange={handleFileSelect}
/>
```

### Änderung für Banner-Input (Zeile ~863-869):
```tsx
<input
  key="banner-file-input"  // NEU: Stabiler Key
  ref={bannerFileInputRef}
  type="file"
  className="hidden"
  accept="image/*"
  onChange={handleBannerFileSelect}
/>
```

## Warum Key-Props?
React verwendet Keys um zu entscheiden, ob ein Element neu gemountet oder nur aktualisiert wird:
- Ohne Key: React könnte das Element bei State-Updates neu erstellen
- Mit stabilem Key: Element bleibt erhalten, nur Props werden aktualisiert
- Verhindert Verlust von Event-Listenern

## Definition of Done
- [ ] Key-Props für beide File Inputs hinzugefügt
- [ ] Tests zeigen stabiles Rendering
- [ ] onChange Events funktionieren nach State-Updates
- [ ] Manual Testing erfolgreich
- [ ] TypeScript-Compilation erfolgreich
- [ ] Code Review abgeschlossen