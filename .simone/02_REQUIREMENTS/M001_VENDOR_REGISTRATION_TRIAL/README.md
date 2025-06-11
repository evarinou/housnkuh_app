# Milestone M001: Vendor Registration with Trial Period

🚫 **NO COMING SOON / PRE-LAUNCH FUNCTIONALITY** 

## Overview
~~Implementiere ein Registrierungssystem für Direktvermarkter mit kostenlosem Probemonat ab Ladeneröffnung und manueller Freischaltung für die öffentliche Anzeige.~~

**UPDATED**: Implementiere ein Registrierungssystem für Direktvermarkter mit sofortigem kostenlosem Probemonat und manueller Freischaltung für die öffentliche Anzeige.

## Objectives
- ~~Ermögliche Direktvermarktern die Selbstregistrierung vor Ladeneröffnung~~ **Ermögliche Direktvermarktern die sofortige Selbstregistrierung**
- ~~Biete einen kostenlosen Probemonat ab Eröffnungsdatum~~ **Biete einen kostenlosen Probemonat ab Registrierung**
- Implementiere sofortige Kündigungsmöglichkeit
- Stelle manuelle Freischaltung für öffentliche Sichtbarkeit bereit

⚠️ **WICHTIG**: KEINE Pre-Launch Phase, KEINE Coming Soon Seite, KEINE Store Opening Logik

## Requirements

### R001: ~~Pre-Launch~~ **Immediate** Registration System
**Priority**: High  
**Status**: ~~Pending~~ **UPDATED - NO PRE-LAUNCH**

~~Implementiere Vorregistrierung vor Ladeneröffnung:~~
**Implementiere sofortige Registrierung mit Trial-Start:**
- Vendors können sich sofort registrieren und Profile anlegen
- ~~Keine sofortige Vertragserstellung~~ **Sofortige Trial-Aktivierung**
- Status: ~~"Vorregistriert" / "Wartet auf Eröffnung"~~ **"Trial aktiv" ab Registrierung**
- ~~Sammlung von Interessenten vor Launch~~ **Sofortige Funktionalität**
- ~~Platzreservierung möglich~~ **Sofortige Nutzung**

### R002: Store Opening Configuration
**Priority**: ~~High~~ **🚫 CANCELLED**  
**Status**: ~~Completed~~ **🚫 REMOVED**

~~Admin-Konfiguration für Ladeneröffnung:~~
**🚫 ENTFERNT - Keine Store Opening Logik benötigt:**
- ~~Globale Einstellung: `storeOpeningDate`~~ **🚫 ENTFERNT**
- ~~Admin kann Eröffnungsdatum setzen/ändern~~ **🚫 ENTFERNT**
- ~~Automatische Benachrichtigung bei Datumsänderung~~ **🚫 ENTFERNT**
- ~~Countdown im Vendor Dashboard~~ **🚫 ENTFERNT**
- ~~"Coming Soon" Status auf öffentlicher Seite~~ **🚫 ENTFERNT**

### R003: ~~Trial Period Activation~~ **Immediate Trial Activation**
**Priority**: High  
**Status**: ~~Pending~~ **UPDATED**

~~Automatische Probemonat-Aktivierung bei Eröffnung:~~
**Sofortige Probemonat-Aktivierung bei Registrierung:**
- ~~Bei Erreichen des Eröffnungsdatums:~~ **Bei Registrierung:**
  - ~~Alle vorregistrierten Vendors erhalten Probemonat~~ **Registrierte Vendors erhalten sofort Probemonat**
  - Startdatum = ~~Eröffnungsdatum~~ **Registrierungsdatum**
  - Enddatum = ~~Eröffnungsdatum~~ **Registrierungsdatum** + 30 Tage
- Email-Benachrichtigung über ~~Start~~ **sofortigen Trial-Start**
- ~~Vertragserstellung erst bei Eröffnung~~ **Sofortige Trial-Aktivierung**

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