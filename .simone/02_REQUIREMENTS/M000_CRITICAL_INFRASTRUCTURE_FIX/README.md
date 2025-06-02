# Milestone M000: Critical Infrastructure Fix

## 🚨 PRIORITY: ASAP - BLOCKING ISSUES

## Overview
Kritische Behebung der Test-Infrastruktur und Projektmanagement-Probleme, die die weitere Entwicklung blockieren. Dieser Milestone muss VOR der Fortsetzung von M001 abgeschlossen werden.

## Objectives
- Test-Infrastruktur vollständig funktionsfähig machen
- Projekttracking und -management korrigieren
- Kritische technische Schulden beseitigen
- Entwicklungsworkflow stabilisieren

## Requirements

### R001: Test Infrastructure Repair (BLOCKING)
**Priority**: CRITICAL  
**Status**: ✅ Completed

Repariere die komplett defekte Test-Infrastruktur:
- Jest-Konfiguration für ES-Module-Imports reparieren
- Axios-Import-Problem lösen
- Basis-Testframework zum Laufen bringen
- Mindestens einen funktionierenden Test sicherstellen

### R002: Basic API Test Coverage
**Priority**: HIGH  
**Status**: ✅ Completed

Erstelle minimale aber kritische Test-Abdeckung:
- Tests für Admin-Auth-Endpoints
- Tests für Store Opening Settings API
- Tests für öffentliche API-Endpoints
- Mindestens 3-5 grundlegende API-Tests

### R003: Project Status Accuracy
**Priority**: HIGH  
**Status**: ✅ Completed

Korrigiere Projekttracking-Diskrepanzen:
- Manifest-Status mit tatsächlichem Task-Status synchronisieren
- T001 Status korrekt auf "in_progress" setzen
- Milestone-Fortschritt korrekt dokumentieren
- Automatisierung für Status-Updates einführen

### R004: Sprint Planning Infrastructure
**Priority**: HIGH  
**Status**: ✅ Completed

Etabliere formale Sprint-Struktur:
- Erstes Sprint-Template erstellen
- Sprint-Tracking-System einrichten
- Velocity-Measurement-Grundlagen schaffen
- Sprint 1 für M001-Completion planen

### R005: File Organization Cleanup
**Priority**: MEDIUM  
**Status**: ✅ Completed

Kritische Dateiorganisation bereinigen:
- Assets von `components/assets/` nach `src/assets/` verschieben
- Debug-Logs aus Repository entfernen
- `clearAuth.js` zu TypeScript konvertieren
- `MietfachAssignmentModal` korrekt platzieren

### R006: Development Workflow Stabilization
**Priority**: MEDIUM  
**Status**: ✅ Completed

Entwicklungsworkflow stabilisieren:
- Debug-Skripte konsolidieren
- Build-Prozess für Tests sicherstellen
- CI/CD-Vorbereitung für zukünftige Automatisierung
- Lokale Entwicklungsumgebung dokumentieren

### R007: Documentation Sync
**Priority**: MEDIUM  
**Status**: ✅ Completed

Dokumentation mit Realität synchronisieren:
- Architektur-Dokumentation auf aktuellen Stand bringen
- Implementierte vs. geplante Features klar trennen
- Task-Status-Tracking automatisieren
- README-Anweisungen aktualisieren

## Success Criteria
1. ✅ Mindestens ein Test läuft erfolgreich durch
2. ✅ Jest-Konfiguration funktioniert ohne Fehler
3. ✅ 5+ API-Tests laufen erfolgreich
4. ✅ Projekt-Manifest zeigt korrekten Status
5. ✅ Sprint 1 für M001 ist geplant und dokumentiert
6. ✅ Kritische Dateien sind korrekt organisiert
7. ✅ Build-Prozess läuft fehlerfrei

## Technical Specifications

### Jest Configuration Fix
```javascript
// Potential fix for jest.config.js or package.json
{
  "jest": {
    "transformIgnorePatterns": [
      "node_modules/(?!(axios)/)"
    ]
  }
}
```

### Basic Test Structure
```
tests/
├── api/
│   ├── auth.test.ts
│   ├── admin.test.ts
│   └── public.test.ts
├── models/
│   └── Settings.test.ts
└── utils/
    └── testSetup.ts
```

### Sprint Planning Structure
```
.simone/03_SPRINTS/
├── S001_M001_COMPLETION/
│   ├── README.md
│   ├── T002_vendor_preregistration.md
│   ├── T003_trial_activation.md
│   └── T004_public_visibility.md
```

## Timeline
**KRITISCH: Dieser Milestone sollte in 1-2 Tagen abgeschlossen sein**

- **Tag 1**: R001, R002, R003 (Test-Fix + API-Tests + Status-Sync)
- **Tag 2**: R004, R005, R006, R007 (Sprint-Setup + Cleanup + Docs)

## Dependencies
- Keine - dieser Milestone blockiert alle anderen
- Muss VOR Fortsetzung von M001 abgeschlossen werden

## Risks and Mitigations
1. **Jest-Konfiguration komplex**: Mehrere Lösungsansätze parallel versuchen
2. **API-Tests zeitaufwändig**: Fokus auf 3-5 kritische Tests
3. **Sprint-Planning overhead**: Minimal viable sprint structure
4. **Scope creep**: Strikt auf blocking issues fokussieren

## Notes
- **ACHTUNG**: Dieser Milestone hat oberste Priorität
- Alle anderen Entwicklungsarbeiten stoppen bis zur Fertigstellung
- Nach Abschluss kann M001 mit stabilem Foundation fortgesetzt werden
- John Carmack würde sagen: "Fix your tools first, then build with confidence"

## Acceptance Criteria Checklist
- [ ] `npm test` läuft ohne Fehler durch
- [ ] Mindestens 5 API-Tests bestehen
- [ ] Project Manifest zeigt korrekte Stati
- [ ] Sprint 1 ist vollständig geplant
- [ ] Assets sind korrekt organisiert
- [ ] Debug-Dateien entfernt
- [ ] Build-Prozess funktioniert einwandfrei
- [ ] Dokumentation ist synchronisiert