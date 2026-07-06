# housnkuh – Feature-Landkarte (Fahrplan Phase 2)

> Gemeinsam festgelegter Funktionsumfang. Schritt 1 (Bestandsaufnahme aus dem
> Code) ist erledigt; die Abschnitte „Fehlt noch" und „Bewusst NICHT im Scope"
> entstehen im Dialog mit Eva (Schritt 2) und werden hier fortgeschrieben.
> Stand: 2026-07-06. Status-Legende: ✅ fertig · 🟡 angefangen · ⚠️ kaputt.

## Vorhanden & fertig

### Öffentliche Seiten (Käufer/Besucher)
Homepage, Direktvermarkter-Übersicht (Filter/Suche/Pagination), Vermarkter-
Detailprofil (Tags, Öffnungszeiten, Karte), Vermarkter-Karte, 3D-Ladenkarte,
Wettbewerb/Ratespiel, Standort, Mieten-Info, Pricing/Package-Builder, Kontakt,
Newsletter-Anmeldung + Bestätigung, FAQ, Impressum/Datenschutz/AGB. ✅

### Vendor-Bereich
Registrierung inkl. Package-Buchung, Pre-Registration, E-Mail-Bestätigung
(Double-Opt-in), Dashboard (Trial-Status, Buchungen, Nachrichten), Profil-
verwaltung (Firma, Tags, Zertifizierungen, Bilder), Meine Buchungen +
Package-Tracking, Trial-Buchungen mit Cancel, Vertragsübersicht, Produkt-
verwaltung (flour.io-Sync, Label-Druck/EAN), Rechnungs-Detailansicht,
flour.io-Dokumente, Upgrade/Trial-Conversion. ✅

### Admin-Bereich
Login/Setup, Dashboard, Newsletter-Management, E-Mail-Templates (Editor +
Preview + Test), Kontakte-Inbox, User-Verwaltung, Pending-Bookings,
Wettbewerbs-Verwaltung, Mietfächer-CRUD, Verträge (activate/cancel),
Zusatzleistungen, Tags, FAQ-Management, Artikel-Verwaltung (flour.io),
flour.io-Dokumente, Store-Map-Editor (2D), Rechnungs-Dashboard, Settings
(Store-Opening/Launch). ✅

### Buchungs- & Preis-Flow
Package-Builder (mehrstufig), Provisions-/Package-/Zusatzleistungs-Auswahl,
dynamische Preis-Zusammenfassung mit Rabatten, Buchungsbestätigung. ✅

### Backend-Fähigkeiten
Duale Auth (Admin/Vendor, JWT), Trial-Automation (Aktivierung/Status/Ablauf/
Konversion per Jobs + manuell), Mietfach-Verfügbarkeit & Buchungsbestätigung,
Vertrags-Lifecycle inkl. Scheduling, Produkt-CRUD + Bild-Upload + EAN,
Rechnungs-Generierung (monatlich, PDF via Puppeteer, Versand, Storno,
Export, Monitoring), flour.io-Sync (Artikel-Push, Tag-Auto-Sync, Stock-Pull
alle 5 min, Document-Pull alle 15 min), öffentliche Endpunkte (Vendor-
Listings, Store-Map, Statistiken, Store-Opening – gecacht), Newsletter/
Kontakt/Contest, Health-Checks/Performance/Alerting/Prometheus, Feature-Flags. ✅

## Vorhanden, muss überarbeitet werden

- ⚠️ **Vendor-Auth-Seiten mit falschem API-Port**: VendorLoginPage,
  VendorForgotPasswordPage, VendorResetPasswordPage, VendorSettingsPage nutzen
  `:5000`-Fallback statt `:4000` → funktionieren nur bei gesetzter
  `REACT_APP_API_URL`/Proxy. (= Audit KON3/S14, Bugfix, kein Feature.)
- 🟡 **Vendor-Rechnungsansicht (Platzhalter)**: `VendorHousnkuhInvoicesPage`
  (Rechnungen von housnkuh an den Vendor) und `VendorCustomerInvoicesPage`
  (Rechnungen des Vendors an Endkunden) sind je ~100-Zeilen-„Coming Soon"
  ohne Backend-Anbindung. **Das Invoice-Backend für housnkuh→Vendor existiert
  bereits** und wird nur nicht angezeigt. → Scope-Frage (siehe Dialog).
- 🟡 **Vendor-Reporting/Analytics**: `VendorReportsPage` ist „Coming Soon".
  → Scope-Frage (hängt an flour.io-Verkaufsdaten).
- 🟡 **Echtzeit-Updates**: Dashboard/Buchungen pollen (30/60 s); WebSocket ist
  TODO. Funktioniert, aber verzögert. → Scope-/Prioritätsfrage.
- 🟡 **flour.io BusinessPartner-/Warehouse-Sync**: Services existieren, sind aber
  an keinen Endpunkt/Job verdrahtet (nur Skript-Aufruf). → klären, ob nötig.
- 🟡 **Pending-Booking-Ablehnung ohne Vendor-Mail**: Admin kann ablehnen, der
  Vendor wird aber nicht benachrichtigt (TODO). → schließen.

## Fehlt noch – muss gebaut werden

Ergebnis des Dialogs (2026-07-06). Grobe Reihenfolge in Phase 4 klärt die TODO.md.

- **F1 – Öffentliche Produktsuche für Käufer.** Produktkatalog/-suche über alle
  Direktvermarkter (Filter nach Art, Zertifizierung, Standort). Backend hat
  bereits einen ungenutzten Text-Index auf Product → neuer öffentlicher
  Endpunkt + Frontend-Seite. Größter Discoverability-Hebel.
- **F2a – Automatischer Vendor-Abrechnungslauf (Gutschriftsverfahren).**
  **Größtes neues Feature.** housnkuh erstellt in Vertretung der
  Direktvermarkter deren Verkaufsrechnungen (Abrechnung im fremden Namen /
  Gutschriftsverfahren; Eva-Maria rechnet für die Vendors ab). Ablauf: Job
  alle 5 min zieht Verkaufsdaten aus flour.io, gruppiert Verkäufe je Vendor,
  erzeugt pro Vendor **eine** zusammengefasste Rechnung. Dies ist ein
  **eigener, zweiter Rechnungslauf** — NICHT zu verwechseln mit dem
  bestehenden monatlichen `invoiceGenerationJob` (housnkuh → Vendor,
  Miete/Gebühren). Anzeigefläche im Portal: `VendorCustomerInvoicesPage`.
  Akzeptanzkriterien (fertig, wenn):
  1. Job läuft zuverlässig alle 5 min, gegen Überlappung/Doppelläufe
     abgesichert (Lauf-Lock — vgl. Audit OP9).
  2. Jeder flour.io-Verkauf wird **genau einmal** abgerechnet
     (Duplikat-Schutz per Status-Flag oder Cursor in MongoDB).
  3. Pro Vendor eine korrekt aufgeschlüsselte Rechnung mit allen zugehörigen
     Verkäufen.
  4. **USt je Vendor korrekt** (Kleinunternehmer §19 vs. regelbesteuert)
     → **erfordert neues Steuerstatus-Feld am Vendor (User-Model) — fehlt aktuell.**
  5. Rechnungsausgabe definiert (PDF-Generierung, Ablage, ggf. Versand) —
     kann `invoicePdfService` mitnutzen.
  6. Fehlerfälle (flour.io nicht erreichbar, unvollständige Daten) sauber
     abgefangen und geloggt, ohne dass Verkäufe verloren gehen oder doppelt
     abgerechnet werden (vgl. Audit OP4).
- **F2b – housnkuh-Rechnungsansicht anbinden** (`VendorHousnkuhInvoicesPage`):
  die monatlichen housnkuh→Vendor-Rechnungen anzeigen/downloaden. Backend
  **existiert** (invoiceGenerationJob/-service), nur die Anzeige fehlt. Kleiner Aufwand.
- **F3 – Vendor-Reporting mit Verkaufsdaten** (`VendorReportsPage`): Umsatz-/
  Verkaufsstatistik pro Vendor. Speist sich aus derselben ⚑flour.io-
  Verkaufsdatenquelle wie F2a.
- **F4 – flour.io BusinessPartner-Sync verdrahten.** Bei Vendor-Registrierung
  automatisch flour.io-BusinessPartner anlegen/verknüpfen (Service existiert,
  nur nicht eingehängt). Warehouse-Sync-Service dabei mitklären.
- **F5 – Produktiv-Deployment & Betrieb.** systemd/PM2-Autostart, automatische
  `mongodump`-Backups mit Retention, dokumentierte Kiosk-Einrichtung
  (Ubuntu-Autostart-Browser) + Update-/Wartungsweg; WiegePC-Konfiguration.
  Deckt Audit **OP12/OP13**.
- **F6 – Betriebs-Robustheit** (jetzt scope-bestätigt, aus Audit): globaler
  `uncaughtException`/`unhandledRejection`-Handler (**OP1**), MongoDB-Reconnect
  (**OP2**), flour.io-Health-Check (**OP3**), Retry auch bei flour.io-
  Netzwerkfehlern (**OP4**). Gehört zu „produktionsreif".
- **F7 – Echtzeit-Updates via WebSocket** statt Polling
  (`useBookingUpdates`/`useDashboardMessages`).
- **F8 – Kleinere Lücken schließen:** Vendor-Benachrichtigung bei Ablehnung
  einer Buchung (TODO in `rejectPendingBooking`); Admin-Alert bei E-Mail-
  Versandfehlern (**OP7**, `alertAdminOfEmailFailure`).

> ⚑ **Gemeinsame Abhängigkeit (F2a/F3):** In welcher Form liefert flour.io die
> **einzelnen Verkäufe** pro Vendor? Zwei Kandidaten laufen bereits:
> `stockPullJob` (alle 5 min, StockItemEntries = POS-Abgänge) und
> `documentSyncJob` (alle 15 min → `FlourioDocument`, hat bereits
> Verkaufspositionen mit `vendorId`, Menge, Steuersatz). **Phase-4-Schritt 0:**
> klären, ob eine dieser Quellen die abrechenbaren Einzelverkäufe *persistent*
> und *je Vendor zuordenbar* enthält. Wichtig: prüfen, ob `stockPullJob` die
> Verkäufe nur als Bestands-Update verarbeitet (dann keine abrechenbaren
> Einzelposten) oder speichert. Falls keine Quelle passt, ist das Persistieren
> der Einzelverkäufe der erste Teilschritt von F2a.

## Bewusst NICHT im Scope

- **Bewertungen/Reviews/Ratings** für Direktvermarkter — kein öffentliches
  Bewertungssystem (Moderations-/Rechtsaufwand). (Dialog 2026-07-06.)
- **Online-Payment / Zahlungsanbieter-Integration.** Zahlung der housnkuh-
  Rechnungen läuft manuell (Überweisung/SEPA außerhalb der App); der Admin
  setzt den Rechnungsstatus auf „bezahlt". Kein Stripe/PSP im Scope.
- **POS-/Kassenlogik.** Läuft vollständig in der flour.io-Cloud. Die
  Kiosk-Terminals bleiben reine Vollbild-Browser ohne housnkuh-Code (nur ihr
  Setup/Update ist Betriebs-Scope, siehe F5).

---

*Phase 2 abgeschlossen 2026-07-06. Nächster Schritt: Phase 4 leitet aus „Fehlt
noch" + „muss überarbeitet" eine priorisierte TODO.md mit Akzeptanzkriterien
ab. Vorgelagert bleiben die Sicherheits-Sofortmaßnahmen aus dem Audit
(Stufe 0: SEC1/SEC2).*
