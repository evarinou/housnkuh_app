# Sprint S07: Vendor Profile Core - Tag System & Data Cleanup

## Sprint Overview

**Milestone**: M004 - Vendor Profile Enhancement  
**Duration**: 2 Wochen  
**Focus**: Grundlegende Datenstruktur und Dummy-Daten entfernen  
**Priority**: Hoch

## Sprint Goals

### Hauptziele
1. **Tag-System implementieren**: Flexibles Tag-basiertes Produktkategorisierung
2. **Dummy-Daten entfernen**: Alle hardcoded Vendor-Daten durch API ersetzen
3. **Vendor-Model erweitern**: Verbessertes Vendor-Profil mit Produktportfolio

### Erfolgs-Kriterien
- ✅ Neues Tag-Model funktionsfähig
- ✅ Alle Frontend Dummy-Daten entfernt
- ✅ Erweiterte Vendor-Profile verfügbar
- ✅ API-Integration vollständig
- ✅ Migration bestehender Daten erfolgreich

## Tasks

### T01_S07: Tag System Implementation
**Verantwortung**: Backend Development  
**Geschätzte Zeit**: 5 Tage

#### Aufgaben
- [ ] Neues Tag-Model (`server/src/models/Tag.ts`) erstellen
- [ ] Product-Model für Vendor-Produkte erstellen
- [ ] Vendor-Product-Tag Relationships definieren
- [ ] Migration von `kategorien: string[]` zu Tag-System
- [ ] API-Endpoints für Tag-Management (`/api/tags/`)
- [ ] Tag-CRUD Operationen implementieren

#### Technische Details
```typescript
// Tag Model Structure
interface Tag {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  category: 'product' | 'certification' | 'method';
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product Model Structure  
interface Product {
  _id: ObjectId;
  vendorId: ObjectId;
  name: string;
  description: string;
  tags: ObjectId[];
  price?: number;
  unit?: string;
  availability: 'available' | 'seasonal' | 'out_of_stock';
  seasonStart?: Date;
  seasonEnd?: Date;
  images: string[];
  isActive: boolean;
}
```

#### Acceptance Criteria
- [ ] Tag-Model mit vollständiger CRUD-Funktionalität
- [ ] Product-Model mit Tag-Zuordnung
- [ ] Datenmigration für bestehende Vendor-Kategorien
- [ ] API-Tests für Tag-Management

---

### T02_S07: Remove Dummy Data
**Verantwortung**: Frontend Development  
**Geschätzte Zeit**: 4 Tage

#### Aufgaben
- [ ] `DirektvermarkterMapPage.tsx` Dummy-Daten entfernen (Zeilen 90-181)
- [ ] `VendorStandorteMapPage.tsx` Mock-Daten entfernen (Zeilen 56-122)
- [ ] API-Integration für alle Vendor-Anzeigen implementieren
- [ ] Loading-States und Error-Handling hinzufügen
- [ ] Seed-Script für realistische Test-Vendor-Daten erweitern

#### Betroffene Dateien
- `client/src/pages/DirektvermarkterMapPage.tsx`
- `client/src/pages/VendorStandorteMapPage.tsx`
- `client/src/pages/DirektvermarkterUebersichtPage.tsx`
- `server/scripts/seed-db.ts`

#### Acceptance Criteria
- [ ] Keine hardcoded Vendor-Daten in Frontend-Komponenten
- [ ] Alle Vendor-Daten kommen von API
- [ ] Proper Loading-States implementiert
- [ ] Error-Handling für API-Fehler
- [ ] Seed-Script erstellt vollständige Vendor-Profile

---

### T03_S07: Enhanced Vendor Model
**Verantwortung**: Full-Stack Development  
**Geschätzte Zeit**: 6 Tage

#### Aufgaben
- [ ] Vendor-Profile um Produkt-Portfolio erweitern
- [ ] Verbesserte Location-Datenstruktur implementieren
- [ ] Business-Details hinzufügen (Zertifizierungen, Produktionsmethoden)
- [ ] Vendor-Dashboard für Profil-Management erweitern
- [ ] API-Endpoints für erweiterte Vendor-Profile

#### Erweiterte Vendor-Profile Struktur
```typescript
interface EnhancedVendorProfile {
  // Bestehende Felder
  unternehmen: string;
  beschreibung: string;
  
  // Neue Felder
  businessDetails: {
    founded?: Date;
    certifications: ObjectId[]; // Tag-Referenzen
    productionMethods: ObjectId[]; // Tag-Referenzen
    farmSize?: string;
    businessType: 'farm' | 'cooperative' | 'processing' | 'retail';
  };
  
  products: ObjectId[]; // Referenz zu Product-Model
  
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
    deliveryRadius?: number;
    deliveryAreas?: string[];
  };
  
  operationalInfo: {
    seasonal: boolean;
    yearRoundOperation: boolean;
    peakSeason?: { start: Date; end: Date };
  };
}
```

#### Acceptance Criteria
- [ ] Erweiterte Vendor-Profile-Struktur implementiert
- [ ] Vendor-Dashboard zeigt neue Felder
- [ ] Location-Daten für Karten optimiert
- [ ] Business-Details über Tag-System verwaltbar
- [ ] Backward-Compatibility für bestehende Vendor

## Sprint Deliverables

### Code Deliverables
1. **Tag-System**: Vollständig funktionsfähiges Tag-Management
2. **Clean Frontend**: Keine Dummy-Daten, vollständige API-Integration
3. **Enhanced Profiles**: Erweiterte Vendor-Profile mit Business-Details
4. **Database Migration**: Erfolgreiche Migration bestehender Daten

### Documentation Deliverables
1. **API Documentation**: Tag-Management Endpoints
2. **Migration Guide**: Schritte für Datenübernahme
3. **Testing Documentation**: Test-Strategien für neue Features

## Risiken & Mitigation

### Kritische Risiken
1. **Datenverlust bei Migration**
   - Mitigation: Backup vor Migration, schrittweise Übernahme
   
2. **API-Performance bei vielen Tags**
   - Mitigation: Indexierung, Caching-Strategien

### Mittlere Risiken
1. **Frontend-Kompatibilität**
   - Mitigation: Regression-Tests, schrittweise Umstellung

## Dependencies

### Abhängigkeiten
- ✅ M001 Trial System muss stabil laufen
- ✅ Bestehende Vendor-Registration funktionsfähig
- ⚠️ Database-Backup-Strategie erforderlich

### Nachgelagerte Auswirkungen
- **Sprint S08**: OpenStreetMap Integration benötigt neue Location-Daten
- **Admin-Dashboard**: Tag-Management-Interface erforderlich

## Definition of Done

### T01_S07 Done Criteria
- [ ] Tag-Model deployed und getestet
- [ ] Product-Model funktionsfähig
- [ ] API-Endpoints dokumentiert und getestet
- [ ] Migration-Script erfolgreich ausgeführt

### T02_S07 Done Criteria
- [ ] Alle Dummy-Daten entfernt
- [ ] API-Integration getestet
- [ ] Loading-States implementiert
- [ ] Error-Handling funktioniert

### T03_S07 Done Criteria
- [ ] Erweiterte Vendor-Profile live
- [ ] Vendor-Dashboard aktualisiert
- [ ] Location-Daten für Karten optimiert
- [ ] Backward-Compatibility gewährleistet

## Sprint Retrospective

### Was lief gut?
- [Nach Sprint-Ende ausfüllen]

### Was kann verbessert werden?
- [Nach Sprint-Ende ausfüllen]

### Action Items für nächsten Sprint
- [Nach Sprint-Ende ausfüllen]