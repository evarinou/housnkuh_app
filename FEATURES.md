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

_(entsteht im Dialog – Schritt 2)_

## Bewusst NICHT im Scope

_(entsteht im Dialog – Schritt 2)_
