# Sprint S08: OpenStreetMap Integration

## Sprint Overview

**Milestone**: M004 - Vendor Profile Enhancement  
**Duration**: 2 Wochen  
**Focus**: Vollständige Leaflet-Integration und interaktive Karten  
**Priority**: Hoch

## Sprint Goals

### Hauptziele
1. **Leaflet-Integration**: Vollständige Umstellung von iframe auf react-leaflet
2. **Multi-Marker-Support**: Alle Vendor-Marker gleichzeitig anzeigen
3. **Interaktive Karten**: Klickbare Marker mit Vendor-Details
4. **Performance-Optimierung**: Marker-Clustering und Lazy Loading

### Erfolgs-Kriterien
- ✅ Alle Karten verwenden Leaflet statt iframes
- ✅ Multi-Marker-Support funktioniert einwandfrei
- ✅ Interaktive Vendor-Auswahl implementiert
- ✅ Mobile-responsive Karten
- ✅ Performance bei 50+ Markern akzeptabel

## Tasks

### T01_S08: Core Map Components
**Verantwortung**: Frontend Development  
**Geschätzte Zeit**: 5 Tage

#### Aufgaben
- [ ] `SimpleMapComponent.tsx` auf react-leaflet umstellen
- [ ] Multi-Marker-Support implementieren
- [ ] Custom Popup-Komponenten erstellen
- [ ] Marker-Clustering für Performance
- [ ] Leaflet CSS Integration

#### Technische Details
```typescript
// Neue Map Component Structure
interface MapComponentProps {
  vendors: VendorLocation[];
  selectedVendor?: string;
  onVendorSelect: (vendorId: string) => void;
  showClustering?: boolean;
  zoom?: number;
  center?: [number, number];
}

interface VendorLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  category: string[];
  isVerified: boolean;
  profileImage?: string;
}
```

#### Betroffene Dateien
- `client/src/components/SimpleMapComponent.tsx` (komplette Überarbeitung)
- `client/src/components/VendorMapPopup.tsx` (neu)
- `client/src/components/VendorMarkerCluster.tsx` (neu)
- `client/src/index.css` (Leaflet CSS Import)

#### Acceptance Criteria
- [ ] SimpleMapComponent nutzt react-leaflet
- [ ] Multi-Marker-Unterstützung implementiert
- [ ] Custom Popups mit Vendor-Informationen
- [ ] Marker-Clustering ab 10+ Markers
- [ ] Responsive Design funktioniert

---

### T02_S08: Vendor Map Enhancement
**Verantwortung**: Frontend Development  
**Geschätzte Zeit**: 6 Tage

#### Aufgaben
- [ ] `DirektvermarkterMapPage.tsx` auf Leaflet umstellen
- [ ] Alle Vendor-Marker gleichzeitig anzeigen
- [ ] Interaktive Vendor-Auswahl implementieren
- [ ] Zoom-to-Vendor Funktionalität
- [ ] Filter-Integration mit Karten-Updates

#### Map Features
```typescript
// Enhanced Map Features
interface MapPageFeatures {
  // Vendor Display
  showAllVendors: boolean;
  highlightSelected: boolean;
  
  // Interaction
  clickableMarkers: boolean;
  zoomToVendor: (vendorId: string) => void;
  
  // Filtering
  filterByCategory: string[];
  filterByVerification: boolean;
  searchRadius?: number;
  
  // UI
  showVendorList: boolean;
  mapHeight: string;
  showControls: boolean;
}
```

#### Integration Points
- Vendor-Filter wirkt sich auf angezeigte Marker aus
- Marker-Klick aktualisiert Vendor-Details-Panel
- Search-Funktionalität mit Karten-Fokussierung
- URL-Parameter für Vendor-Auswahl

#### Acceptance Criteria
- [ ] Alle gefilterten Vendors als Marker sichtbar
- [ ] Marker-Klick zeigt Vendor-Details
- [ ] Filter-Änderungen aktualisieren Karte sofort
- [ ] Zoom-to-Vendor funktioniert einwandfrei
- [ ] Performance bei 20+ Vendors gut

---

### T03_S08: Map Integration Testing
**Verantwortung**: Frontend Development + Testing  
**Geschätzte Zeit**: 4 Tage

#### Aufgaben
- [ ] `VendorStandorteMapPage.tsx` überarbeiten
- [ ] `StandortPage.tsx` auf neue Map-Komponenten umstellen
- [ ] Performance-Tests mit vielen Markern
- [ ] Mobile Responsiveness testen
- [ ] Cross-Browser-Kompatibilität prüfen

#### Test-Strategien
```typescript
// Performance Test Cases
const performanceTests = {
  markerCount: [10, 50, 100, 200],
  mapOperations: [
    'zoom_in', 'zoom_out', 'pan', 
    'filter_update', 'marker_click'
  ],
  devices: ['desktop', 'tablet', 'mobile'],
  browsers: ['chrome', 'firefox', 'safari', 'edge']
};
```

#### Testing-Bereiche
1. **Funktionale Tests**
   - Marker-Display korrekt
   - Popup-Inhalte vollständig
   - Filter-Integration funktioniert
   
2. **Performance Tests**
   - Ladezeiten bei vielen Markern
   - Smooth-Scrolling und Zooming
   - Memory-Usage bei längerer Nutzung
   
3. **Mobile Tests**
   - Touch-Gesten funktionieren
   - Popup-Layout auf kleinen Bildschirmen
   - Pinch-to-Zoom Performance

#### Acceptance Criteria
- [ ] Alle Map-Seiten verwenden neue Komponenten
- [ ] Performance-Tests bestanden (< 2s Ladezeit)
- [ ] Mobile Responsiveness auf 3+ Geräten getestet
- [ ] Cross-Browser-Kompatibilität gewährleistet
- [ ] Keine JavaScript-Errors in Console

## Sprint Deliverables

### Code Deliverables
1. **Enhanced Map Components**: Vollständig interaktive Leaflet-Karten
2. **Multi-Marker Support**: Gleichzeitige Anzeige aller relevanten Vendors
3. **Performance Optimization**: Marker-Clustering und optimierte Rendering
4. **Mobile-First Design**: Responsive Karten-Interface

### Documentation Deliverables
1. **Component Documentation**: Neue Map-Komponenten dokumentiert
2. **Performance Guidelines**: Best Practices für Karten-Performance
3. **Testing Report**: Ergebnisse der Performance- und Kompatibilitäts-Tests

## Libraries & Dependencies

### Bereits Verfügbar
- ✅ `leaflet`: "^1.9.4"
- ✅ `react-leaflet`: "^4.2.1"
- ✅ `@types/leaflet`: "^1.9.17"

### Zusätzlich Benötigt
- [ ] `react-leaflet-cluster`: Für Marker-Clustering
- [ ] `leaflet-defaulticon-compatibility`: Für Icon-Kompatibilität
- [ ] Custom CSS für Styling

## Risiken & Mitigation

### Kritische Risiken
1. **Performance-Probleme bei vielen Markern**
   - Mitigation: Marker-Clustering implementieren, Lazy Loading
   
2. **Mobile-Performance schlechter als Desktop**
   - Mitigation: Mobile-spezifische Optimierungen, reduzierte Features

### Mittlere Risiken
1. **Leaflet CSS-Konflikte mit bestehendem Styling**
   - Mitigation: CSS-Isolation, scoped Styles
   
2. **Cross-Browser-Inkompatibilitäten**
   - Mitigation: Umfassende Browser-Tests, Fallback-Strategien

## Dependencies

### Abhängigkeiten
- ✅ Sprint S07 abgeschlossen (Tag-System und saubere Vendor-Daten)
- ✅ Vendor-Location-Daten verfügbar
- ⚠️ Performance-Testing-Environment erforderlich

### Nachgelagerte Auswirkungen
- **Sprint S09**: Product Portfolio Features benötigen erweiterte Map-Popups
- **SEO**: Karten-basierte URLs für bessere Suchmaschinen-Indexierung

## Definition of Done

### T01_S08 Done Criteria
- [ ] SimpleMapComponent nutzt react-leaflet
- [ ] Multi-Marker-Display funktioniert
- [ ] Custom Popups implementiert
- [ ] Marker-Clustering aktiv
- [ ] Unit-Tests für Map-Komponenten

### T02_S08 Done Criteria
- [ ] DirektvermarkterMapPage vollständig umgestellt
- [ ] Interaktive Vendor-Auswahl funktioniert
- [ ] Filter-Integration komplett
- [ ] Zoom-to-Vendor implementiert
- [ ] Performance-Anforderungen erfüllt

### T03_S08 Done Criteria
- [ ] Alle Map-Seiten aktualisiert
- [ ] Performance-Tests bestanden
- [ ] Mobile-Kompatibilität bestätigt
- [ ] Cross-Browser-Tests erfolgreich
- [ ] Dokumentation vollständig

## Sprint Retrospective

### Was lief gut?
- [Nach Sprint-Ende ausfüllen]

### Was kann verbessert werden?
- [Nach Sprint-Ende ausfüllen]

### Action Items für nächsten Sprint
- [Nach Sprint-Ende ausfüllen]

### Performance Metrics
- Ladezeit mit 50 Markern: [Messung]
- Memory-Usage nach 10min: [Messung]
- Mobile Performance Score: [Messung]