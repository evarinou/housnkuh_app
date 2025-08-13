# Task: TASK-041-enhanced-debug-logging-file-selection
Priority: medium
Status: pending

## User Acceptance Criteria
- [ ] Vollständiges Event-Logging für File-Auswahl
- [ ] Jeder Schritt im Upload-Flow ist nachvollziehbar
- [ ] Error-Cases werden deutlich geloggt
- [ ] Performance-Timing wird gemessen
- [ ] Alle Tests bestehen (client & server)

## Test Plan
### Unit Tests
- [ ] Test dass alle Log-Statements vorhanden sind
- [ ] Test für Error-Case-Logging
- [ ] Co-located test file: VendorProfilePage.test.tsx

### Integration Tests  
- [ ] Console zeigt vollständigen Event-Flow
- [ ] Fehler werden klar identifiziert
- [ ] Timing-Informationen sind sichtbar

### Manual Testing
- [ ] Browser Console öffnen
- [ ] Bild auswählen und Log-Flow verfolgen
- [ ] Abbruch testen und Logs prüfen
- [ ] Große Datei testen und Performance-Logs prüfen

## Implementation Details
**Datei**: `client/src/pages/vendor/VendorProfilePage.tsx`

### Erweiterte Logs in triggerFileInput (Zeile ~431-443):
```typescript
const triggerFileInput = (e?: React.MouseEvent) => {
  const startTime = performance.now();
  e?.preventDefault();
  e?.stopPropagation();
  
  console.log('🎯 triggerFileInput called', {
    timestamp: new Date().toISOString(),
    hasRef: !!fileInputRef.current,
    refElement: fileInputRef.current
  });
  
  try {
    if (fileInputRef.current) {
      console.log('📂 Opening file dialog...');
      fileInputRef.current.click();
      const elapsed = performance.now() - startTime;
      console.log(`✅ File dialog triggered in ${elapsed.toFixed(2)}ms`);
    } else {
      console.error('❌ fileInputRef.current is null');
    }
  } catch (error) {
    console.error('❌ Error in triggerFileInput:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};
```

### Erweiterte Logs in handleFileSelect (Zeile ~294-313):
```typescript
const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const startTime = performance.now();
  console.log('🚀 handleFileSelect EVENT FIRED', {
    timestamp: new Date().toISOString(),
    hasFiles: !!e.target.files,
    fileCount: e.target.files?.length || 0
  });
  
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    console.log('📁 File selected:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    setSelectedFile(file);
    console.log('✅ File stored in state');
    
    // Vorschau erstellen
    const reader = new FileReader();
    reader.onloadstart = () => console.log('📖 FileReader started...');
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        console.log(`📊 Reading: ${percentComplete.toFixed(0)}%`);
      }
    };
    reader.onloadend = () => {
      const elapsed = performance.now() - startTime;
      console.log(`🖼️ Preview created in ${elapsed.toFixed(2)}ms`);
      setPreviewUrl(reader.result as string);
    };
    reader.onerror = () => console.error('❌ FileReader error:', reader.error);
    
    reader.readAsDataURL(file);
  } else {
    console.warn('⚠️ No file selected or dialog cancelled');
  }
  
  // Input zurücksetzen
  console.log('🔄 Resetting input value');
  e.target.value = '';
};
```

### Ähnliche Erweiterungen für:
- `handleBannerFileSelect`
- `triggerBannerFileInput`
- `handleImageUpload`
- `handleBannerUpload`

## Definition of Done
- [ ] Alle File-Handler haben erweiterte Logs
- [ ] Performance-Timing wird gemessen
- [ ] Error-Cases werden klar geloggt
- [ ] Console-Output ist strukturiert und verständlich
- [ ] TypeScript-Compilation erfolgreich
- [ ] Manual Testing zeigt vollständigen Flow