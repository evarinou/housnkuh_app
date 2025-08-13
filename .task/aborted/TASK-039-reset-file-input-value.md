# Task: TASK-039-reset-file-input-value
Priority: high
Status: pending

## User Acceptance Criteria
- [ ] File input value wird nach Auswahl zurückgesetzt
- [ ] Dasselbe Bild kann mehrfach ausgewählt werden
- [ ] onChange Event wird bei jeder Auswahl getriggert
- [ ] Funktioniert für Profilbild und Banner-Bild
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Test für handleFileSelect mit value reset
- [ ] Test für handleBannerFileSelect mit value reset
- [ ] Co-located test file: VendorProfilePage.test.tsx

### Integration Tests  
- [ ] Dasselbe Bild 2x hintereinander auswählen
- [ ] onChange Event wird beide Male getriggert
- [ ] Vorschau wird korrekt aktualisiert

### Manual Testing
- [ ] Profilbild auswählen und Logs prüfen
- [ ] Gleiches Profilbild nochmal auswählen
- [ ] Banner-Bild auswählen und Logs prüfen
- [ ] Gleiches Banner-Bild nochmal auswählen

## Implementation Details
**Datei**: `client/src/pages/vendor/VendorProfilePage.tsx`

### Änderungen in handleFileSelect (Zeile ~294-313):
```typescript
const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  console.log('🚀 handleFileSelect triggered');
  console.log('Files:', e.target.files);
  
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    console.log('📁 Selected file:', file.name, file.size, file.type);
    setSelectedFile(file);
    
    // Vorschau erstellen
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('🖼️ Preview created for:', file.name);
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  } else {
    console.log('❌ No file selected');
  }
  
  // WICHTIG: Input zurücksetzen für erneute Auswahl
  e.target.value = '';
};
```

### Änderungen in handleBannerFileSelect (Zeile ~316-328):
```typescript
const handleBannerFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  console.log('🚀 handleBannerFileSelect triggered');
  
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    console.log('📁 Selected banner file:', file.name, file.size, file.type);
    setSelectedBannerFile(file);
    
    // Vorschau erstellen
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('🖼️ Banner preview created for:', file.name);
      setBannerPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  } else {
    console.log('❌ No banner file selected');
  }
  
  // WICHTIG: Input zurücksetzen für erneute Auswahl
  e.target.value = '';
};
```

## Definition of Done
- [ ] File input value reset implementiert
- [ ] Tests für beide Handler geschrieben
- [ ] Manual Testing mit gleichen Dateien erfolgreich
- [ ] onChange Event wird konsistent getriggert
- [ ] TypeScript-Compilation erfolgreich
- [ ] Code Review abgeschlossen