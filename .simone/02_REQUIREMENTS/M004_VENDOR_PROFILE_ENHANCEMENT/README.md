# M004: Vendor Profile Enhancement

## Milestone Overview

**Ziel**: Verbesserung der Vendor-Profile mit flexiblem Tag-System, echten OpenStreetMap-Karten und Entfernung von Dummy-Daten.

**Priorität**: Hoch  
**Geschätzte Dauer**: 3-4 Sprints  
**Abhängigkeiten**: M001 (Vendor Registration Trial) abgeschlossen

## Hauptanforderungen

### 1. Tag-basiertes Produktsystem
- **Aktuell**: Feste Kategorien als String-Array
- **Neu**: Flexibles Tag-System für Produktarten
- **Nutzen**: Bessere Kategorisierung und Filterung

### 2. OpenStreetMap Integration
- **Aktuell**: iframe-basierte Karten (nur ein Marker)
- **Neu**: Vollständige Leaflet-Integration mit Multi-Marker-Support
- **Nutzen**: Interaktive Karten mit allen Vendors gleichzeitig

### 3. Echte Vendor-Daten
- **Aktuell**: Dummy-Daten in Frontend-Komponenten
- **Neu**: Vollständig API-gesteuerte Daten
- **Nutzen**: Dynamische, verwaltbare Vendor-Informationen

## Technische Analyse

### Aktuelle Architektur
- **Vendor-Daten**: In User-Model als `vendorProfile` subdocument
- **Kategorien**: Simple `kategorien: string[]`
- **Karten**: iframe-Embedding mit Einzelmarker-Limitierung
- **Dummy-Daten**: Hardcoded in `DirektvermarkterMapPage.tsx` und anderen Komponenten

### Bibliotheken Verfügbar
- ✅ `leaflet`: "^1.9.4"
- ✅ `react-leaflet`: "^4.2.1"
- ✅ `@types/leaflet`: "^1.9.17"
- ⚠️ **Aktuell ungenutzt** - alle Karten verwenden iframes

## Sprint-Aufteilung

### Sprint S07: Core Tag System & Data Cleanup (2 Wochen)
**Fokus**: Grundlegende Datenstruktur und Dummy-Daten entfernen

#### T01_S07: Tag System Implementation
- Neues Tag-Model erstellen
- Vendor-Product Relationship aufbauen
- Category-Migration von String-Array zu Tag-System
- API-Endpoints für Tag-Management

#### T02_S07: Remove Dummy Data
- Frontend Dummy-Daten in Map-Komponenten entfernen
- Seed-Script für realistische Vendor-Daten erweitern
- API-Integration für alle Vendor-Anzeigen
- Testing der neuen Datenstruktur

#### T03_S07: Enhanced Vendor Model
- Vendor-Profile um Produkt-Portfolio erweitern
- Verbesserte Location-Datenstruktur
- Business-Details (Zertifizierungen, Produktionsmethoden)
- Datenmigration für bestehende Vendors

### Sprint S08: OpenStreetMap Integration (2 Wochen)
**Fokus**: Vollständige Leaflet-Integration und interaktive Karten

#### T01_S08: Core Map Components
- SimpleMapComponent auf react-leaflet umstellen
- Multi-Marker-Support implementieren
- Custom Popup-Komponenten
- Marker-Clustering für Performance

#### T02_S08: Vendor Map Enhancement
- DirektvermarkterMapPage auf Leaflet umstellen
- Alle Vendor-Marker gleichzeitig anzeigen
- Interaktive Vendor-Auswahl
- Zoom-to-Vendor Funktionalität

#### T03_S08: Map Integration Testing
- VendorStandorteMapPage überarbeiten
- StandortPage auf neue Map-Komponenten umstellen
- Performance-Tests mit vielen Markern
- Mobile Responsiveness testen

### Sprint S09: Product Portfolio & Advanced Features (1-2 Wochen)
**Fokus**: Produkt-Management und erweiterte Vendor-Features

#### T01_S09: Product Management System
- Product CRUD-Operationen
- Vendor-Product-Zuordnung
- Saison-/Verfügbarkeits-Management
- Product-Image-Upload

#### T02_S09: Enhanced Filtering & Search
- Tag-basierte Filterung implementieren
- Erweiterte Suchfunktionen
- Produkt-Suche innerhalb Vendor-Profile
- Performance-Optimierung

#### T03_S09: Advanced Vendor Features
- Vendor-Dashboard für Produkt-Management
- Öffentliche Produkt-Anzeige
- Vendor-Bewertungen und -Details
- SEO-Optimierung für Vendor-Profile

## Erfolgs-Kriterien

### Sprint S07 Abschluss
- ✅ Alle Dummy-Daten entfernt
- ✅ Tag-System funktionsfähig
- ✅ Vendor-Daten vollständig API-gesteuert
- ✅ Migration bestehender Daten erfolgreich

### Sprint S08 Abschluss
- ✅ Alle Karten verwenden Leaflet
- ✅ Multi-Marker-Support funktioniert
- ✅ Interaktive Vendor-Auswahl
- ✅ Mobile-responsive Karten

### Sprint S09 Abschluss
- ✅ Vollständiges Produkt-Management
- ✅ Tag-basierte Filterung
- ✅ Erweiterte Vendor-Profile
- ✅ Performance-optimiert

## Risiken & Mitigation

### Hohe Risiken
1. **Datenmigration**: Bestehende Vendor-Daten könnten verloren gehen
   - **Mitigation**: Backup-Strategie, schrittweise Migration
   
2. **Performance**: Viele Marker könnten Karten verlangsamen
   - **Mitigation**: Marker-Clustering, Lazy Loading

### Mittlere Risiken
1. **User Experience**: Neue Tag-Struktur könnte Benutzer verwirren
   - **Mitigation**: Intuitive UI, Hilfe-Texte, schrittweise Einführung

## Dependencies & Integration

### Abhängigkeiten
- ✅ M001 Trial System muss funktionsfähig sein
- ✅ Vendor Registration Flow muss stabil laufen
- ⚠️ Admin-Dashboard sollte für Tag-Management erweitert werden

### Auswirkungen auf andere Module
- **Suchfunktion**: Erweiterte Tag-basierte Suche
- **Admin-Dashboard**: Tag-Management-Interface erforderlich
- **Performance**: Caching-Strategien für verbesserte Ladezeiten

## Nächste Schritte

1. **Sprint S07 starten**: Core Tag System & Data Cleanup
2. **Detailed Task Breakdown**: Jeder Task detailliert planen
3. **Database Schema Design**: Tag-Model und Relationships definieren
4. **Testing Strategy**: Automatisierte Tests für neue Features