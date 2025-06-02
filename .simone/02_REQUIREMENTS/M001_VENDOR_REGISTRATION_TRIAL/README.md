# Milestone M001: Vendor Registration with Trial Period

## Overview
Implementiere ein Registrierungssystem für Direktvermarkter mit kostenlosem Probemonat ab Ladeneröffnung und manueller Freischaltung für die öffentliche Anzeige.

## Objectives
- Ermögliche Direktvermarktern die Selbstregistrierung vor Ladeneröffnung
- Biete einen kostenlosen Probemonat ab Eröffnungsdatum
- Implementiere sofortige Kündigungsmöglichkeit
- Stelle manuelle Freischaltung für öffentliche Sichtbarkeit bereit

## Requirements

### R001: Pre-Launch Registration System
**Priority**: High  
**Status**: Pending

Implementiere Vorregistrierung vor Ladeneröffnung:
- Vendors können sich registrieren und Profile anlegen
- Keine sofortige Vertragserstellung
- Status: "Vorregistriert" / "Wartet auf Eröffnung"
- Sammlung von Interessenten vor Launch
- Platzreservierung möglich

### R002: Store Opening Configuration
**Priority**: High  
**Status**: Completed (Implemented via T001)

Admin-Konfiguration für Ladeneröffnung:
- Globale Einstellung: `storeOpeningDate` (kann geändert werden)
- Admin kann Eröffnungsdatum setzen/ändern
- Automatische Benachrichtigung bei Datumsänderung
- Countdown im Vendor Dashboard
- "Coming Soon" Status auf öffentlicher Seite

### R003: Trial Period Activation
**Priority**: High  
**Status**: Pending

Automatische Probemonat-Aktivierung bei Eröffnung:
- Bei Erreichen des Eröffnungsdatums:
  - Alle vorregistrierten Vendors erhalten Probemonat
  - Startdatum = Eröffnungsdatum
  - Enddatum = Eröffnungsdatum + 30 Tage
- Email-Benachrichtigung über Start
- Vertragserstellung erst bei Eröffnung

### R004: Manual Vendor Activation
**Priority**: High  
**Status**: Pending

Erweitere das Vendor-Model um Sichtbarkeits-Steuerung:
- Neues Feld: `isPubliclyVisible: boolean` (default: false)
- Admin-Interface zum Aktivieren/Deaktivieren
- Filter in öffentlichen Ansichten
- Status-Anzeige im Vendor Dashboard
- Batch-Aktivierung möglich

### R005: Enhanced Registration Flow
**Priority**: High  
**Status**: Partially Implemented (Basic booking flow exists)

Optimierter Registrierungsprozess vor Eröffnung:
- Klarer Hinweis: "Probemonat startet mit Ladeneröffnung"
- Voraussichtliches Eröffnungsdatum anzeigen (wenn gesetzt)
- Keine Zahlungsdaten erforderlich
- Willkommens-Email mit Vorregistrierungs-Bestätigung
- Platz-/Mietfach-Reservierung möglich

### R006: Immediate Cancellation
**Priority**: High  
**Status**: Pending

Implementiere sofortige Kündigungsmöglichkeit:
- Kündigungsbutton im Vendor Dashboard
- Unterschiedliche Flows:
  - Vor Eröffnung: Löschung der Vorregistrierung
  - Nach Eröffnung: Beendigung des Probemonats
- Email-Bestätigung der Kündigung

### R007: Admin Vendor Management
**Priority**: High  
**Status**: Pending

Erweitere das Admin-Dashboard:
- Übersicht aller Vendors mit Status:
  - Vorregistriert
  - Probemonat aktiv
  - Probemonat abgelaufen
  - Regulärer Vertrag
  - Gekündigt
- Eröffnungsdatum-Verwaltung
- Bulk-Aktivierung für öffentliche Sichtbarkeit

### R008: Vendor Dashboard Pre-Launch
**Priority**: High  
**Status**: Partially Implemented (Countdown exists, missing trial status)

Dashboard-Funktionen vor Eröffnung:
- Countdown bis Ladeneröffnung
- Profil-Vervollständigung möglich
- Produkte können bereits angelegt werden
- Status: "Wartet auf Eröffnung"
- Fortschrittsanzeige für Profil-Vollständigkeit

### R009: Launch Day Automation
**Priority**: Medium  
**Status**: Pending

Automatisierung für Eröffnungstag:
- Cron-Job/Scheduled Task für Mitternacht
- Aktivierung aller Probemonate
- Massen-Email an alle Vorregistrierten
- Status-Update im System
- Admin-Benachrichtigung über Aktivierungen

### R010: Public Listing Filter
**Priority**: High  
**Status**: Pending

Filtere öffentliche Anzeigen:
- Vor Eröffnung: "Coming Soon" Seite
- Nach Eröffnung: Nur Vendors mit `isPubliclyVisible: true`
- Admin kann Vorschau aller Vendors sehen
- Unterscheidung zwischen "nicht freigeschaltet" und "noch nicht eröffnet"

## Success Criteria
1. Vendors können sich vor Ladeneröffnung registrieren
2. Probemonat startet automatisch mit konfigurierbarem Eröffnungsdatum
3. Admins haben volle Kontrolle über Eröffnungsdatum und Sichtbarkeit
4. Klare Kommunikation über Status und Timeline
5. Nahtloser Übergang von Vorregistrierung zu aktivem Probemonat

## Technical Specifications

### Database Schema Updates
```typescript
// Global Settings (new collection/table)
{
  storeOpeningDate: Date         // Ladeneröffnung
  isStoreOpen: boolean           // Computed from date
}

// User Model Erweiterungen
{
  registrationDate: Date         // Vorregistrierung
  trialStartDate: Date          // = storeOpeningDate
  trialEndDate: Date            // = storeOpeningDate + 30
  isPubliclyVisible: boolean    // default: false
  registrationStatus: enum [
    'preregistered',           // Vor Eröffnung
    'trial_active',            // Probemonat läuft
    'trial_expired',           // Probemonat abgelaufen
    'active',                  // Regulärer Vertrag
    'cancelled'                // Gekündigt
  ]
}
```

### API Endpoints
```
// Admin
POST   /api/admin/settings/opening-date     // Eröffnungsdatum setzen
PATCH  /api/admin/vendors/:id/visibility   // Toggle Sichtbarkeit
GET    /api/admin/vendors/preregistered    // Vorregistrierte Liste

// Vendor
POST   /api/vendor-auth/preregister        // Vorregistrierung
GET    /api/vendor/opening-status          // Eröffnungs-Info
POST   /api/vendor/cancel                  // Kündigung

// Public
GET    /api/public/opening-date            // Öffentliche Info
```

### Scheduled Tasks
```typescript
// Daily check at 00:01
checkStoreOpening() {
  if (today === storeOpeningDate) {
    activateAllTrialPeriods();
    sendLaunchEmails();
    updateSystemStatus();
  }
}
```

## Dependencies
- Bestehendes Vendor Auth System
- Email Service für Benachrichtigungen
- Scheduler/Cron für automatische Aktivierung
- Admin Settings Management

## Risks and Mitigations
1. **Eröffnungsdatum-Änderung**: Klare Kommunikation, Re-Scheduling von Trials
2. **Technische Probleme am Eröffnungstag**: Manuelle Backup-Prozedur
3. **Zu viele Registrierungen**: Warteliste-System vorbereiten
4. **Vendors vergessen Eröffnung**: Reminder-Emails vor Launch

## Timeline Estimate
- Pre-Launch Registration: 2 Tage
- Opening Date Management: 1 Tag
- Trial Activation Logic: 2 Tage
- Dashboard Updates: 2 Tage
- Email Flows & Automation: 1 Tag
- Testing: 2 Tage
- **Total**: 10 Tage

## Notes
- Flexibilität bei Eröffnungsdatum ist kritisch
- Vorregistrierung schafft Momentum vor Launch
- Manuelle Freischaltung ermöglicht qualitätskontrollierten Soft-Launch
- System muss robust gegen Datumsänderungen sein